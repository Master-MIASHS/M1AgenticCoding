// ---------------------------------------------------------------------------
// Games - Generic orchestration template (Groupe 2)
// ---------------------------------------------------------------------------
// createGame({ id, rules, config }) is the SINGLE generic orchestrator linking
// the Core Engine to each game's rules. It is coded once and reused by all 10
// games; a game only provides its own `rules` object (and, later, its config).
//
// Public interface for G3, identical for the 10 games (contrat G2 § 5.1, #68):
//   start(bets)                     -> { sessionId, renderPayload,
//                                        availableActions, terminal, gameResult? }
//   action(sessionId, playerAction) -> same shape
//   - instant games    : start() is already terminal, action() is never called;
//   - multi-step games : start() returns terminal: false, then G3 calls
//                        action() until terminal: true.
// The full session (cards, deck, pending bets...) stays HERE, inside G2; G3
// only keeps the sessionId (contrat § 5.1, confirmed by G3 on 29/09).
//
// Responsibilities of the orchestrator (and ONLY these):
//   1. draw the raw result through the Core: by default
//      coreService.roll(gameId, params); a game whose rules expect another
//      raw shape (wheel segment, plinko slot, slot symbols...) injects its own
//      `draw(core, context)` that calls the right Core primitive
//      (tirageEntier / tirageAvecPoids / melanger, contrat § 4.1, écart 8).
//      `draw` lives in the game's own file, never in rules.js (rules stay pure)
//   2. hand the raw result to the injected rules, together with the bets and
//      the game config:
//        - single-step games : rules.resolve(raw, { bets, config })
//        - multi-step games  : rules.start(raw, { bets, config }) then, for
//                              each player action,
//                              rules.step(session, action, raw)    (§ 3.2)
//   3. keep a multi-step game going while the rules return a session carrying
//      `needsDraw: true`; an object WITHOUT `needsDraw` is terminal (§ 3.2)
//   4. call coreService.play(gameId, totalBet, gameResult) exactly ONCE, on
//      the terminal step only (§ 4.3)
//
// `bets` is ALWAYS normalized to an array of { type, amount }, even for a
// single bet; rules receive the normalized array.
//
// `config` is forwarded AS-IS to the rules (same reference, never validated,
// never given a default value here). It is admin data (paytable, weights...):
// the rules decide what to do when it is missing. Its value will come from
// the Core once `getGameConfig` is exposed; only its SHAPE is fixed here.
//
// Still OPEN in the contract (#68), so kept minimal here:
//   - the content of renderPayload (§ 5.2): the shape proposed in #8 is used,
//     but nothing beyond the raw draw and the result details is filled in;
//   - the opening of a multi-step round on the rules side (§ 3.2): the
//     existing form rules.start(raw, { bets, config }) is kept;
//   - where availableActions come from: read from session.availableActions.
//
// ABSOLUTE RULE: this file never calls Math.random(); the only source of
// randomness is the Core, reached through `draw` (coreService.roll() by
// default).
// ---------------------------------------------------------------------------

import * as coreService from '../../services/coreService.js';

// Safety valve: a multi-step session that never ends must not grow forever.
const MAX_STEPS = 100;

/**
 * Normalizes bets into an array of { type, amount }.
 * A single bet object is wrapped into a one-element array.
 *
 * @param {object | object[]} bets
 * @returns {Array<{ type: string, amount: number }>}
 * @throws {TypeError} if bets is empty or an entry is not { type, amount }.
 */
function normalizeBets(bets) {
  const list = Array.isArray(bets) ? bets : [bets];
  if (list.length === 0) {
    throw new TypeError('createGame: bets must contain at least one { type, amount } entry');
  }
  return list.map((bet) => {
    if (bet === null || typeof bet !== 'object' || typeof bet.amount !== 'number') {
      throw new TypeError('createGame: each bet must be an object { type, amount }');
    }
    return { type: bet.type, amount: bet.amount };
  });
}

/**
 * Sum of the amounts of normalized bets (what core.play() expects as `bet`).
 *
 * @param {Array<{ type: string, amount: number }>} bets
 * @returns {number}
 */
function sumBets(bets) {
  return bets.reduce((sum, bet) => sum + bet.amount, 0);
}

/**
 * A multi-step session is still running while it carries `needsDraw: true`.
 *
 * @param {unknown} result
 * @returns {boolean}
 */
function isPending(result) {
  return result !== null && typeof result === 'object' && result.needsDraw === true;
}

/**
 * Creates a playable game from an id and a rules object.
 *
 * `rules` must expose either:
 *   - resolve(raw, { bets, config }) -> gameResult                 (single-step)
 *   - start(raw, { bets, config }) -> session AND
 *     step(session, action, raw) -> session | gameResult            (multi-step)
 *
 * @param {{ id: string, rules: object, config?: object, core?: object, draw?: Function }} options
 *   `config` is forwarded as-is to the rules (undefined when not provided).
 *   `core` is injectable for testing; it defaults to the official
 *   coreService facade.
 *   `draw(core, context)` returns the raw draw handed to the rules; it is the
 *   only code allowed to ask the Core for randomness on behalf of the game.
 *   `context` is { bets, config, params } on start(), plus { session, action }
 *   on action(). Defaults to core.roll(id, params).
 * @returns {{ id: string, start: Function, action: Function, playRound: Function }}
 */
export function createGame({
  id,
  rules,
  config,
  core = coreService,
  draw = (c, { params }) => c.roll(id, params),
}) {
  if (typeof id !== 'string' || id.length === 0) {
    throw new TypeError('createGame: a non-empty string `id` is required');
  }
  if (rules === null || typeof rules !== 'object') {
    throw new TypeError('createGame: `rules` must be an object');
  }
  if (typeof draw !== 'function') {
    throw new TypeError('createGame: `draw` must be a function draw(core, context)');
  }
  const singleStep = typeof rules.resolve === 'function';
  const multiStep = typeof rules.start === 'function' && typeof rules.step === 'function';
  if (!singleStep && !multiStep) {
    throw new TypeError(
      'createGame: rules must expose resolve(raw, { bets, config }) or both start() and step()'
    );
  }

  // Running multi-step sessions, kept inside G2 (G3 only holds the id).
  const sessions = new Map();
  // Deterministic ids: no randomness is needed to tell sessions apart.
  let sessionCount = 0;

  /**
   * Builds the answer sent back to G3 for one step.
   *
   * @param {string} sessionId
   * @param {{ raw: unknown, session?: object, gameResult?: object, economy?: object }} step
   */
  function respond(sessionId, { raw, session, gameResult, economy }) {
    const terminal = gameResult !== undefined;
    const phase = terminal ? 'result' : 'playing';
    const renderPayload = { gameId: id, phase };
    if (typeof rules.view === 'function') {
      // The game decides what G3 may see (card games: never the shuffled
      // deck, the hidden dealer card or the cards to come). Neither the raw
      // draw nor the session is sent as-is.
      renderPayload.view = rules.view({ phase, raw, session, gameResult });
    } else {
      renderPayload.raw = raw;
      if (terminal) renderPayload.interpretation = gameResult.details;
    }
    if (terminal) renderPayload.economy = economy;
    const response = {
      sessionId,
      renderPayload,
      availableActions:
        !terminal && Array.isArray(session.availableActions) ? [...session.availableActions] : [],
      terminal,
    };
    if (terminal) response.gameResult = gameResult;
    return response;
  }

  /**
   * Total stake settled by the Core. It is the sum of the opening bets,
   * unless the rules raised the stake during the round (blackjack double,
   * poker raise...): the stake lives in the G2 session and is reported on
   * the terminal result as `details.totalBet` (contrat § 3.2, § 4.3). It can
   * only grow: a smaller value is a rules bug.
   *
   * @param {Array<{ type: string, amount: number }>} bets
   * @param {object} gameResult
   * @returns {number}
   */
  function finalStake(bets, gameResult) {
    const opening = sumBets(bets);
    const reported = gameResult?.details?.totalBet;
    if (reported === undefined) return opening;
    if (typeof reported !== 'number' || !Number.isFinite(reported) || reported < opening) {
      throw new RangeError(
        `createGame(${id}): details.totalBet must be a number >= the opening bets (${opening})`
      );
    }
    return reported;
  }

  /**
   * Terminal step: the economy is settled exactly once per round.
   * core.play() expects the TOTAL bet (a number), not the bets array.
   */
  function settle(sessionId, bets, raw, gameResult) {
    sessions.delete(sessionId);
    const economy = core.play(id, finalStake(bets, gameResult), gameResult);
    return respond(sessionId, { raw, gameResult, economy });
  }

  /**
   * Opens a round. Instant games are settled immediately.
   *
   * @param {object | object[]} bets - one { type, amount } or an array of them.
   * @param {object} [params] - optional parameters forwarded to draw() (and to
   *   core.roll() by the default draw).
   */
  function start(bets, params = {}) {
    const normalizedBets = normalizeBets(bets);
    const context = { bets: normalizedBets, config };
    sessionCount += 1;
    const sessionId = `${id}-${sessionCount}`;

    // The ONLY place randomness enters the game.
    const raw = draw(core, { ...context, params });

    if (singleStep) {
      return settle(sessionId, normalizedBets, raw, rules.resolve(raw, context));
    }

    const session = rules.start(raw, context);
    if (!isPending(session)) {
      return settle(sessionId, normalizedBets, raw, session);
    }
    sessions.set(sessionId, { session, bets: normalizedBets, params, steps: 0 });
    return respond(sessionId, { raw, session });
  }

  /**
   * Plays one player action ('hit', 'stand', 'hold'...) on a running session.
   *
   * @param {string} sessionId - the id returned by start().
   * @param {string} playerAction
   */
  function action(sessionId, playerAction) {
    const entry = sessions.get(sessionId);
    if (entry === undefined) {
      throw new Error(`createGame(${id}): unknown or finished session '${sessionId}'`);
    }
    if (typeof playerAction !== 'string' || playerAction.length === 0) {
      throw new TypeError('createGame: playerAction must be a non-empty string');
    }
    entry.steps += 1;
    if (entry.steps > MAX_STEPS) {
      sessions.delete(sessionId);
      throw new Error(`createGame(${id}): session kept running beyond ${MAX_STEPS} steps`);
    }

    const raw = draw(core, {
      bets: entry.bets,
      config,
      params: entry.params,
      session: entry.session,
      action: playerAction,
    });
    const result = rules.step(entry.session, playerAction, raw);
    if (!isPending(result)) {
      return settle(sessionId, entry.bets, raw, result);
    }
    entry.session = result;
    return respond(sessionId, { raw, session: result });
  }

  /**
   * Plays one full round of an INSTANT game in a single call (kept for the
   * existing callers; G3 uses start()). Multi-step games need player actions
   * and therefore go through start() / action().
   *
   * @param {object | object[]} bets
   * @param {object} [params]
   * @returns {{ id: string, gameResult: object, economy: object, draws: number }}
   */
  function playRound(bets, params = {}) {
    if (!singleStep) {
      throw new TypeError(
        `createGame(${id}): multi-step games are played with start() / action(), not playRound()`
      );
    }
    const { gameResult, renderPayload } = start(bets, params);
    return { id, gameResult, economy: renderPayload.economy, draws: 1 };
  }

  return { id, start, action, playRound };
}
