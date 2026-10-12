// ---------------------------------------------------------------------------
// Games - Dice draw (Groupe 2, issue #159)
// ---------------------------------------------------------------------------
// Draws the complete pass-line round. Each raw roll is the pair of dice faces;
// craps.js decides whether another roll is needed without accessing the Core.
// ---------------------------------------------------------------------------

import { advanceCrapsRound } from './craps.js';

/**
 * Draws two valid integer faces through the Core for one roll.
 *
 * @param {{ tirageEntier?: (min: number, max: number) => number }} core
 *   Core facade supplied by createGame.
 * @returns {[number, number]} the two faces, each an integer in [1, 6].
 * @throws {TypeError} if the Core primitive is missing or returns a
 *   non-integer face.
 * @throws {RangeError} if a returned face is outside [1, 6].
 */
function drawRoll(core) {
  const first = core.tirageEntier(1, 6);
  const second = core.tirageEntier(1, 6);

  for (const face of [first, second]) {
    if (!Number.isInteger(face)) {
      throw new TypeError('dice/draw: tirageEntier() must return integer faces');
    }
    if (face < 1 || face > 6) {
      throw new RangeError('dice/draw: tirageEntier() must return faces in [1, 6]');
    }
  }

  return [first, second];
}

/**
 * Draws every roll of one pass-line round until its outcome is resolved.
 *
 * @param {{ tirageEntier?: (min: number, max: number) => number }} core
 *   Core facade supplied by createGame.
 * @returns {Array<[number, number]>} dice faces in roll order.
 * @throws {TypeError} if the Core facade or a drawn face is invalid.
 * @throws {RangeError} if a drawn face is outside [1, 6].
 */
export function draw(core) {
  if (typeof core?.tirageEntier !== 'function') {
    throw new TypeError('dice/draw: Core facade must provide tirageEntier()');
  }

  const rolls = [];
  let point = null;
  let needsRoll = true;

  while (needsRoll) {
    const dice = drawRoll(core);
    rolls.push(dice);
    const next = advanceCrapsRound(point, dice[0] + dice[1]);
    point = next.point;
    needsRoll = next.needsRoll;
  }

  return rolls;
}
