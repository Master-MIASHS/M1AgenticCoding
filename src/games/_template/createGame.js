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
//   2. hand the raw result to the injected rules, together with the bets, the
//      game config and the player's balance (plain data, rules stay pure):
//        - single-step games : rules.resolve(raw, { bets, config, balance })
//        - multi-step games  : rules.start(raw, { bets, config, balance })
//                              then, for each player action,
//                              rules.step(session, action, raw)    (§ 3.2)
//   3. keep a multi-step game going while the rules return a session carrying
//      `needsDraw: true`; an object WITHOUT `needsDraw` is terminal (§ 3.2)
//   4. call coreService.play(gameId, totalBet, gameResult, { roundId }) exactly
//      ONCE, on the terminal step only (§ 4.3). `roundId` identifies the round:
//      it is created by start() and stays the same until the settlement, even
//      for multi-step games, so that the Core can refuse a round settled twice
//      (#218). A running round is only forgotten once play() has succeeded: if
//      play() fails, the session and its roundId are kept for a retry
//   5. never let a stake exceed the balance: the opening bets are checked
//      before any draw, and a raised stake (double, raise) before it is
//      accepted. The rules report a raised stake as `totalBet` on a running
//      session and as `details.totalBet` on the final result (#166). A raise
//      the player cannot afford is REFUSED: the action throws, the session is
//      left unchanged and the round goes on with the stake it had.
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
//     existing form rules.start(raw, { bets, config, balance }) is kept;
//   - where availableActions come from: read from session.availableActions.
//
// ABSOLUTE RULE: this file never calls Math.random(); the only source of
// randomness is the Core, reached through `draw` (coreService.roll() by
// default). The roundId is not a game draw: it only has to be unique, so it
// comes from the platform's crypto (cadrage G5, #218), never from the Core RNG.
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
 * Default round identifier, `<gameId>-<uuid>`. It only has to be unique (the
 * Core refuses a roundId settled twice): it is NOT a game draw, so it never
 * uses Math.random() nor the Core RNG, whose nonce must not be reused (#218).
 *
 * @param {string} gameId
 * @returns {string}
 * @throws {Error} when the platform exposes no crypto source.
 */
function defaultRoundId(gameId) {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === 'function') return `${gameId}-${webCrypto.randomUUID()}`;
  // randomUUID() only exists in secure contexts (https, localhost).
  if (typeof webCrypto?.getRandomValues === 'function') {
    const bytes = webCrypto.getRandomValues(new Uint8Array(16));
    return `${gameId}-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  throw new Error('createGame: no crypto source available to build a roundId');
}

/**
 * Creates a playable game from an id and a rules object.
 *
 * `rules` must expose either:
 *   - resolve(raw, { bets, config, balance }) -> gameResult        (single-step)
 *   - start(raw, { bets, config, balance }) -> session AND
 *     step(session, action, raw) -> session | gameResult            (multi-step)
 * `balance` is the player's balance (undefined when the core has no
 * getBalance()); a session reports a raised stake as `totalBet`.
 *
 * @param {{ id: string, rules: object, config?: object, core?: object, draw?: Function }} options
 *   `config` is forwarded as-is to the rules (undefined when not provided).
 *   `core` is injectable for testing; it defaults to the official
 *   coreService facade.
 *   `draw(core, context)` returns the raw draw handed to the rules; it is the
 *   only code allowed to ask the Core for randomness on behalf of the game.
 *   `context` is { bets, config, balance, params } on start(), and
 *   { bets, config, params, session, action } on action(). Defaults to
 *   core.roll(id, params).
 *   `makeRoundId()` returns the identifier of a new round (injectable for
 *   testing); defaults to `<id>-<uuid>`.
 * @returns {{ id: string, start: Function, action: Function, playRound: Function }}
 */
export function createGame({
  id,
  rules,
  config,
  core = coreService,
  draw = (c, { params }) => c.roll(id, params),
  makeRoundId = () => defaultRoundId(id),
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
  if (typeof makeRoundId !== 'function') {
    throw new TypeError('createGame: `makeRoundId` must be a function');
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
    return checkStake(bets, gameResult?.details?.totalBet);
  }

  /**
   * Validates a stake reported by the rules (`details.totalBet` on a result,
   * `totalBet` on a running session) and returns the stake to settle.
   *
   * @param {Array<{ type: string, amount: number }>} bets
   * @param {unknown} reported
   * @returns {number}
   */
  function checkStake(bets, reported) {
    const opening = sumBets(bets);
    if (reported === undefined) return opening;
    if (typeof reported !== 'number' || !Number.isFinite(reported) || reported < opening) {
      throw new RangeError(
        `createGame(${id}): details.totalBet must be a number >= the opening bets (${opening})`
      );
    }
    return reported;
  }

  /**
   * Current balance, when the injected core exposes getBalance() (the
   * official coreService does). Undefined otherwise: no check is made.
   *
   * @returns {number | undefined}
   */
  function readBalance() {
    if (typeof core.getBalance !== 'function') return undefined;
    const balance = core.getBalance();
    // A non-numeric balance would silently disable the check below.
    if (typeof balance !== 'number' || !Number.isFinite(balance)) {
      throw new TypeError(`createGame(${id}): core.getBalance() must return a finite number`);
    }
    return balance;
  }

  /**
   * A stake can never exceed the balance. Checked BEFORE the round starts and
   * before a raise is accepted, so that play() never fails at the very end.
   *
   * @param {number} stake
   * @param {number | undefined} [balance] - already read balance, if any.
   * @throws {RangeError} when the balance is known and too low.
   */
  function ensureAffordable(stake, balance = readBalance()) {
    if (balance !== undefined && stake > balance) {
      throw new RangeError(
        `createGame(${id}): insufficient balance for a stake of ${stake} (balance ${balance})`
      );
    }
  }

  /**
   * New round identifier, checked once so that play() never gets a bad one.
   *
   * @returns {string}
   */
  function newRoundId() {
    const roundId = makeRoundId();
    if (typeof roundId !== 'string' || roundId.length === 0) {
      throw new TypeError(`createGame(${id}): makeRoundId() must return a non-empty string`);
    }
    return roundId;
  }

  /**
   * Terminal step: the economy is settled exactly once per round.
   * core.play() expects the TOTAL bet (a number), not the bets array, and the
   * round's identifier. The session is forgotten only AFTER a successful
   * settlement: if play() throws, a running round keeps its session and its
   * roundId, and can be retried without being settled twice (#218).
   */
  function settle(sessionId, bets, raw, gameResult, roundId) {
    const economy = core.play(id, finalStake(bets, gameResult), gameResult, { roundId });
    sessions.delete(sessionId);
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
    const balance = readBalance();
    // Fail fast: no draw, no session for a round the player cannot afford.
    ensureAffordable(sumBets(normalizedBets), balance);
    // The balance is handed to the rules as plain data (they stay pure), so
    // that they can hide an unaffordable raise (double...) from
    // availableActions.
    const context = { bets: normalizedBets, config, balance };
    sessionCount += 1;
    const sessionId = `${id}-${sessionCount}`;
    // Same identifier from the opening to the settlement of the round (#218).
    const roundId = newRoundId();

    // The ONLY place randomness enters the game.
    const raw = draw(core, { ...context, params });

    if (singleStep) {
      return settle(sessionId, normalizedBets, raw, rules.resolve(raw, context), roundId);
    }

    const session = rules.start(raw, context);
    if (!isPending(session)) {
      return settle(sessionId, normalizedBets, raw, session, roundId);
    }
    sessions.set(sessionId, { session, bets: normalizedBets, params, steps: 0, roundId });
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
    // A raise the player cannot afford is refused: the session is left as it
    // was and the round goes on.
    ensureAffordable(
      isPending(result) ? checkStake(entry.bets, result.totalBet) : finalStake(entry.bets, result)
    );
    if (!isPending(result)) {
      return settle(sessionId, entry.bets, raw, result, entry.roundId);
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
