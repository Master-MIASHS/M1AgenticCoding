// ---------------------------------------------------------------------------
// Games - Generic orchestration template (Groupe 2)
// ---------------------------------------------------------------------------
// createGame({ id, rules }) is the SINGLE generic orchestrator linking the
// Core Engine to each game's rules. It is coded once and reused by all 10
// games; a game only provides its own `rules` object.
//
// Responsibilities of the orchestrator (and ONLY these):
//   1. draw the raw result through coreService.roll(gameId, params)
//   2. hand the raw result to the injected rules
//        - single-step games : rules.resolve(raw, { bets })
//        - multi-step games  : rules.start(raw, { bets }) then
//                              rules.step(raw, state, { bets })
//   3. follow the rules' `needsDraw` signal for multi-step games (blackjack
//      "hit", community draws, ...) WITHOUT ever generating randomness itself
//   4. call coreService.play(gameId, bets, gameResult) exactly ONCE, on the
//      terminal step only (a result without `needsDraw` is terminal)
//
// `bets` is ALWAYS normalized to an array of { type, amount }, even for a
// single bet; rules receive the normalized array.
//
// ABSOLUTE RULE: this file never calls Math.random(); the only source of
// randomness is coreService.roll().
// ---------------------------------------------------------------------------

import * as coreService from '../../services/coreService.js';

// Safety valve: a rules object stuck on needsDraw must not loop forever.
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
 * Creates a playable game from an id and a rules object.
 *
 * `rules` must expose either:
 *   - resolve(raw, { bets }) -> gameResult                        (single-step)
 *   - start(raw, { bets }) -> state AND step(raw, state, { bets }) (multi-step)
 *
 * An intermediate state / result carrying `needsDraw: true` tells the
 * orchestrator to draw again and call rules.step(); the loop ends when the
 * returned object no longer carries `needsDraw` (terminal step).
 *
 * @param {{ id: string, rules: object, core?: object }} config
 *   `core` is injectable for testing; it defaults to the official
 *   coreService facade.
 * @returns {{ id: string, playRound: Function }}
 */
export function createGame({ id, rules, core = coreService }) {
  if (typeof id !== 'string' || id.length === 0) {
    throw new TypeError('createGame: a non-empty string `id` is required');
  }
  if (rules === null || typeof rules !== 'object') {
    throw new TypeError('createGame: `rules` must be an object');
  }
  const singleStep = typeof rules.resolve === 'function';
  const multiStep = typeof rules.start === 'function' && typeof rules.step === 'function';
  if (!singleStep && !multiStep) {
    throw new TypeError(
      'createGame: rules must expose resolve(raw, { bets }) or both start() and step()'
    );
  }

  /**
   * Plays one full round of the game.
   *
   * @param {object | object[]} bets - one { type, amount } or an array of them.
   * @param {object} [params] - optional parameters forwarded to core.roll().
   * @returns {{ id: string, gameResult: object, economy: object, draws: number }}
   *   gameResult : the terminal result returned by the rules
   *   economy    : the result of the single core.play() call
   *   draws      : number of core.roll() calls performed for this round
   */
  function playRound(bets, params = {}) {
    const normalizedBets = normalizeBets(bets);

    let result;
    let draws = 0;

    do {
      // The ONLY place randomness enters the game.
      const raw = core.roll(id, params);
      if (draws === 0) {
        result = singleStep
          ? rules.resolve(raw, { bets: normalizedBets })
          : rules.start(raw, { bets: normalizedBets });
      } else {
        result = rules.step(raw, result, { bets: normalizedBets });
      }
      draws += 1;
      if (draws > MAX_STEPS) {
        throw new Error(
          `createGame(${id}): rules kept asking for draws beyond ${MAX_STEPS} steps`
        );
      }
    } while (result !== null && result !== undefined && result.needsDraw === true);

    // Terminal step: the economy is settled exactly once per round.
    const economy = core.play(id, normalizedBets, result);

    return { id, gameResult: result, economy, draws };
  }

  return { id, playRound };
}
