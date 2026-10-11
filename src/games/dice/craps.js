const NATURAL_TOTALS = Object.freeze([7, 11]);
const LOSING_TOTALS = Object.freeze([2, 3, 12]);
const POINT_TOTALS = Object.freeze([4, 5, 6, 8, 9, 10]);

/**
 * Applies one roll to a pass-line craps round.
 *
 * @param {number | null} point - null before the come-out roll.
 * @param {number} total - sum of the two dice, from 2 through 12.
 * @returns {{ point: number | null, outcome: 'win' | 'loss' | null, needsRoll: boolean }}
 */
export function advanceCrapsRound(point, total) {
  if (
    point !== null &&
    (!Number.isInteger(point) || !POINT_TOTALS.includes(point))
  ) {
    throw new TypeError('dice/craps: point must be null or a valid point total');
  }
  if (!Number.isInteger(total) || total < 2 || total > 12) {
    throw new TypeError('dice/craps: total must be an integer between 2 and 12');
  }

  if (point === null) {
    if (NATURAL_TOTALS.includes(total)) {
      return { point: null, outcome: 'win', needsRoll: false };
    }
    if (LOSING_TOTALS.includes(total)) {
      return { point: null, outcome: 'loss', needsRoll: false };
    }
    return { point: total, outcome: null, needsRoll: true };
  }

  if (total === point) {
    return { point, outcome: 'win', needsRoll: false };
  }
  if (total === 7) {
    return { point, outcome: 'loss', needsRoll: false };
  }
  return { point, outcome: null, needsRoll: true };
}
