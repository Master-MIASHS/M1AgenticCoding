// ---------------------------------------------------------------------------
// Core - RNG (Random Number Generator)
// ---------------------------------------------------------------------------
// ABSOLUTE RULE: this file is the SINGLE source of randomness in the project.
//
//  * No other file may call Math.random() directly.
//  * roll() only produces RAW random values. It NEVER decides whether the
//    player won or lost. Interpreting a raw result into a win/loss is the
//    responsibility of each game, inside /src/games/.
//  * math.js is the only randomness helper used and stays encapsulated here.
// ---------------------------------------------------------------------------

import { random } from 'mathjs';

/**
 * Produces a raw random result for a given game.
 *
 * IMPORTANT: the returned value is raw and game-agnostic. It carries NO
 * win/loss meaning. Games map it to their own mechanics in /src/games/.
 *
 * @param {string} gameId - identifier of the requesting game.
 * @param {object} [params] - optional game-specific parameters (ignored here).
 * @returns {{ gameId: string, value: number, nonce: number }}
 *   value : a raw float in [0, 1).
 *   nonce : a raw integer, useful for tie-breaking / auditing.
 */
export function roll(gameId, _params = {}) {
  return {
    gameId,
    value: random(),
    nonce: Math.floor(random() * 1000000),
  };
}