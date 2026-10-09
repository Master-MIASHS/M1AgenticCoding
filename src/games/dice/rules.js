// ---------------------------------------------------------------------------
// Games - Dice (Craps) rules (Groupe 2)
// ---------------------------------------------------------------------------
// Pure rules of the dice game: a craps "pass line" round driven by the
// come / point / done state machine.
//
//   come  : the come-out roll. 7 or 11 wins, 2 or 3 loses, 12 is a push
//           (stake returned). Any other total (4, 5, 6, 8, 9, 10) becomes
//           the point and the machine moves to the point phase.
//   point : each following roll is compared with the point and with 7.
//           7 or the point wins, any other total loses.
//   done  : terminal state, always reached by resolve().
//
// Contract (single-step rules, see /src/games/_template/ on the
// feat/groupe2-orchestrateur-generique branch):
//
//   resolve(raw, { bets, config }) -> gameResult
//
// `raw` carries the raw RNG results of the round: one { value, nonce } per
// dice roll, in roll order (first entry = come-out roll). A craps round is
// at most two rolls: the come-out roll, and (only if it establishes a
// point) the single roll that settles the point phase. A single raw object
// is accepted for rounds that settle on the come-out roll.
//
// `bets` is the normalized array of { type, amount } produced by the
// orchestrator; the paytable is applied to the sum of the amounts.
//
// Purity / absolute rules:
//   * no Math.random(): randomness enters only through the raw results
//   * no import of coreService or of any Core module: no roll / play /
//     balance / XP logic lives in this file
//   * a raw value in [0, 1) maps to a two-d6 dice total (2..12) using the
//     true distribution (36 equiprobable combinations), see DICE_TOTALS
//
// gameResult (always terminal, contract G2 2.2 - #68, #159):
//   {
//     outcome: 'win' | 'loss' | 'push',
//     multiplier: number,    // TOTAL return multiplier, stake included
//                            // (2 for a 1:1 win, 1 for a push, 0 for a loss)
//     details: {             // read by G3 in renderPayload.interpretation
//       point: number | null,// point established during the round (if any)
//       rolls: number[],     // dice totals in roll order
//       rawValues: number[], // raw value of each roll (audit / display)
//       totalBet: number,
//       payout: number,      // tokens returned to the player, stake included
//     },
//   }
// ---------------------------------------------------------------------------

export const COME = 'come';
export const POINT = 'point';
export const DONE = 'done';

/**
 * True two-d6 distribution: for each dice total, the cumulative number of
 * combinations (out of 36) used to map a raw value in [0, 1) to a total.
 * A total s owns the interval [cum(s-1)/36, cum(s)/36).
 */
export const DICE_TOTALS = Object.freeze([
  { total: 2, cumulative: 1 },
  { total: 3, cumulative: 3 },
  { total: 4, cumulative: 6 },
  { total: 5, cumulative: 10 },
  { total: 6, cumulative: 15 },
  { total: 7, cumulative: 21 },
  { total: 8, cumulative: 26 },
  { total: 9, cumulative: 30 },
  { total: 10, cumulative: 33 },
  { total: 11, cumulative: 35 },
  { total: 12, cumulative: 36 },
]);

/** Pass-line paytable: wins pay 1:1, 12 on the come-out is a push. */
export const PAYTABLE = Object.freeze({
  natural: Object.freeze([7, 11]),
  craps: Object.freeze([2, 3]),
  push: Object.freeze([12]),
  pointValues: Object.freeze([4, 5, 6, 8, 9, 10]),
  winMultiplier: 1,
});

/**
 * Maps a raw RNG value in [0, 1) to a two-d6 dice total (2..12) using the
 * true distribution (36 equiprobable combinations).
 *
 * @param {number} value - raw value in [0, 1).
 * @returns {number} dice total between 2 and 12.
 * @throws {TypeError} if value is not a finite number in [0, 1).
 */
export function diceTotalFromRawValue(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 1) {
    throw new TypeError(`dice: raw value must be a finite number in [0, 1), got ${value}`);
  }
  for (const { total, cumulative } of DICE_TOTALS) {
    if (value < cumulative / 36) {
      return total;
    }
  }
  return 12;
}

/**
 * Sums the normalized bets into a single total bet.
 *
 * @param {Array<{ type: string, amount: number }>} bets
 * @returns {number}
 */
function totalBet(bets) {
  return bets.reduce((sum, bet) => sum + bet.amount, 0);
}

/**
 * Resolves one full craps round (come -> point -> done) from the raw RNG
 * results and the bets. Pure function: no randomness, no Core, no side
 * effect; the same inputs always produce the same gameResult.
 *
 * @param {object | object[]} raw - one raw result { value, nonce } per dice
 *   roll, in roll order (first = come-out roll); a single object is accepted
 *   for rounds that settle on the come-out roll.
 * @param {{ bets: Array<{ type: string, amount: number }>, config: object }} options
 *   the normalized bets and config, as produced by the orchestrator; config is
 *   accepted but unused by the dice rules.
 * @returns {{
 *   outcome: 'win' | 'loss' | 'push',
 *   multiplier: number,
 *   details: {
 *     point: number | null,
 *     rolls: number[],
 *     rawValues: number[],
 *     totalBet: number,
 *     payout: number
 *   }
 * }} the terminal gameResult.
 * @throws {TypeError} if raw is empty or a raw value is malformed.
 * @throws {RangeError} if the provided rolls do not reach a terminal state,
 *   or if extra rolls follow the terminal roll.
 */
export function resolve(raw, { bets, config }) {
  const raws = Array.isArray(raw) ? raw : [raw];
  if (raws.length === 0) {
    throw new TypeError('dice: at least one raw result is required');
  }

  const rolls = raws.map((entry) => {
    if (entry === null || typeof entry !== 'object' || typeof entry.value !== 'number') {
      throw new TypeError('dice: each raw result must be an object with a numeric `value`');
    }
    return diceTotalFromRawValue(entry.value);
  });

  const bet = totalBet(bets);
  let state = COME;
  let point = null;
  let outcome = null;

  for (let i = 0; i < rolls.length; i += 1) {
    const total = rolls[i];
    if (state === COME) {
      if (PAYTABLE.natural.includes(total)) {
        state = DONE;
        outcome = 'win';
      } else if (PAYTABLE.craps.includes(total)) {
        state = DONE;
        outcome = 'loss';
      } else if (PAYTABLE.push.includes(total)) {
        state = DONE;
        outcome = 'push';
      } else {
        state = POINT;
        point = total;
      }
    } else {
      outcome = total === 7 || total === point ? 'win' : 'loss';
      state = DONE;
    }
    if (state === DONE) {
      if (i < rolls.length - 1) {
        throw new RangeError('dice: surplus raw results after the terminal roll');
      }
      break;
    }
  }

  if (state !== DONE) {
    throw new RangeError('dice: not enough raw results to reach a terminal state');
  }

  // Contract G2 2.2 (#68, #159): the multiplier INCLUDES the stake so that the
  // Core can settle it (#135): 1:1 win -> 2, push -> 1, loss -> 0.
  const multiplier =
    outcome === 'win' ? 1 + PAYTABLE.winMultiplier : outcome === 'push' ? 1 : 0;
  const payout =
    outcome === 'win' ? bet * (1 + PAYTABLE.winMultiplier) : outcome === 'push' ? bet : 0;

  return {
    outcome,
    multiplier,
    details: {
      point,
      rolls,
      rawValues: raws.map((entry) => entry.value),
      totalBet: bet,
      payout,
    },
  };
}

/**
 * Rules object following the G2 template contract, ready to be plugged into
 * createGame({ id: 'dice', rules: diceRules }).
 */
export const diceRules = Object.freeze({ resolve });
