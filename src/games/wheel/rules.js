// ---------------------------------------------------------------------------
// Games - Wheel of Fortune rules (Groupe 2 - ticket #26)
// ---------------------------------------------------------------------------
// Pure interpretation of a Wheel of Fortune draw: a segment has already been
// drawn, this module only translates that segment into a settled game result.
//
// ABSOLUTE RULES honored by this module:
//  * Zero imports: no Core, no coreService, no Math.random().
//  * Pure function: `raw` and every argument are never mutated.
//  * No tuning value is hardcoded: the paytable comes from `config`, which the
//    admin fills through the Core (AGENTS.md rule 4). The wheel layout stays
//    with the Core, so the rules never carry a second copy of it.
//
// DRAW SHAPE - follows the G1 proposal in issue #27: `raw` is the segment
// element itself, because `tirageAvecPoids(elements, poids)` returns the
// element rather than its index. Where the draw lands is therefore never
// recomputed here: this module cannot and must not decide that the spin wins
// or loses, it only applies the paytable the admin configured.
//
// The wheel layout itself (number of segments, their colours and labels, the
// weight of each) is NOT modelled here. G1 owns the randomness and the
// weights, G3 owns the animation. This module only settles.
// ---------------------------------------------------------------------------

/**
 * A bet placed on a Wheel of Fortune round.
 *
 * @typedef {object} Bet
 * @property {string} type - bet type, must be a key of `config.bets`.
 * @property {number} amount - staked chips, a positive number.
 */

/**
 * One segment of the wheel.
 *
 * Any field is allowed: the wheel layout is admin data. `config.bets[type].match`
 * names the fields it cares about.
 *
 * @typedef {object} WheelSegment
 * @property {string} [id]
 * @property {string} [label]
 * @property {string} [color]
 */

/**
 * One entry of the paytable: which segments win, and what they return.
 *
 * @typedef {object} WheelBetRule
 * @property {object} match - the segment fields that must all be strictly
 *   equal to win. An empty object matches every segment.
 * @property {number} multiplier - TOTAL return multiplier, stake included.
 *   0 returns nothing, 1 gives the stake back.
 */

/**
 * Runtime configuration for the Wheel of Fortune.
 *
 * Only the paytable is required. The wheel layout itself (how many segments,
 * their colours, labels and weights) belongs to the Core and the admin
 * configuration, NOT to the rules: the rules never need to know the layout,
 * they only need to know which segment field a bet type matches and what it
 * returns. Keeping the layout out of here also avoids forcing an identity rule
 * between the Core's `raw` and a second copy of the layout, which would break
 * as soon as the two drift apart.
 *
 * CONTRACT NOTE - OPEN (contract G2 v0.3, section 6): how the rules receive
 * the admin configuration is not settled yet. The shape below is a PROPOSITION
 * and may change once G1 exposes `getGameConfig` through `coreService`.
 *
 * @typedef {object} WheelConfig
 * @property {Record<string, WheelBetRule>} bets - paytable, keyed by bet type.
 */
export const WHEEL_BET_TYPE_MATCH = 'match';

/**
 * Checks that `raw` looks like a wheel segment.
 *
 * @param {unknown} raw
 * @returns {boolean} true when `raw` is a non-null object.
 */
function isSegment(raw) {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
}

/**
 * Checks that a bet is a well-formed Wheel bet.
 *
 * The existence of its `type` in the paytable is checked separately, once the
 * config is known.
 *
 * @param {unknown} bet
 * @returns {boolean} true when `bet` has a string type and a positive amount.
 */
function isValidBet(bet) {
  return (
    typeof bet === 'object' &&
    bet !== null &&
    typeof bet.type === 'string' &&
    bet.type.length > 0 &&
    typeof bet.amount === 'number' &&
    Number.isFinite(bet.amount) &&
    bet.amount > 0
  );
}

/**
 * Checks whether a segment satisfies a paytable entry.
 *
 * Every field named in `match` must be strictly equal on the segment. Extra
 * fields on the segment are ignored, so one bet can key off `color` while
 * another keys off `label`.
 *
 * @param {WheelSegment} segment
 * @param {object} match
 * @returns {boolean}
 */
function segmentMatches(segment, match) {
  return Object.entries(match).every(([field, expected]) => segment[field] === expected);
}

/**
 * Derives the outcome from a total return multiplier.
 *
 * Because `multiplier` includes the stake, anything below 1 is a loss, exactly
 * 1 gives the stake back, and anything above 1 wins.
 *
 * @param {number} multiplier
 * @returns {'win' | 'loss' | 'push'}
 */
function outcomeFor(multiplier) {
  if (multiplier > 1) return 'win';
  if (multiplier === 1) return 'push';
  return 'loss';
}

/**
 * Settles one Wheel of Fortune round.
 *
 * @param {WheelSegment} raw - the segment drawn by the Core.
 * @param {object} [options]
 * @param {Bet[]} [options.bets] - always an array, even for a single bet.
 * @param {WheelConfig} [options.config] - must provide `bets`, the paytable.
 * @returns {{ outcome: 'win' | 'loss' | 'push', multiplier: number, details: object }}
 * @throws {Error} when the draw, the bets or the config are unusable.
 */
export function resolve(raw, { bets, config } = {}) {
  if (!isSegment(raw)) {
    throw new Error(`wheel: raw must be a wheel segment object, received ${typeof raw}`);
  }

  if (!Array.isArray(bets)) {
    throw new Error(`wheel: bets must be an array, received ${typeof bets}`);
  }
  if (bets.length === 0) {
    throw new Error('wheel: bets must contain at least one bet');
  }
  if (!bets.every(isValidBet)) {
    throw new Error('wheel: every bet must look like { type: <string>, amount: <positive> }');
  }

  if (typeof config !== 'object' || config === null) {
    throw new Error('wheel: config is required. The paytable is admin data and must never be hardcoded.');
  }
  if (typeof config.bets !== 'object' || config.bets === null) {
    throw new Error('wheel: config.bets (the paytable) is required');
  }

  const paytable = config.bets;

  const settledBets = bets.map((bet) => {
    const rule = paytable[bet.type];
    if (!rule || typeof rule !== 'object') {
      throw new Error(`wheel: unknown bet type '${bet.type}', not in the paytable`);
    }
    if (typeof rule[WHEEL_BET_TYPE_MATCH] !== 'object' || rule[WHEEL_BET_TYPE_MATCH] === null) {
      throw new Error(`wheel: paytable entry '${bet.type}' has no 'match' object`);
    }
    if (typeof rule.multiplier !== 'number' || !Number.isFinite(rule.multiplier)) {
      throw new Error(`wheel: paytable entry '${bet.type}' has no numeric 'multiplier'`);
    }
    if (rule.multiplier < 0) {
      throw new Error(`wheel: paytable entry '${bet.type}' has a negative 'multiplier'`);
    }

    const won = segmentMatches(raw, rule[WHEEL_BET_TYPE_MATCH]);
    const multiplier = won ? rule.multiplier : 0;

    return { type: bet.type, amount: bet.amount, won, multiplier, payout: bet.amount * multiplier };
  });

  const totalBet = settledBets.reduce((sum, bet) => sum + bet.amount, 0);
  const payout = settledBets.reduce((sum, bet) => sum + bet.payout, 0);
  // Same convention as the Core: one aggregate multiplier over the total stake.
  const multiplier = totalBet === 0 ? 0 : payout / totalBet;
  const outcome = outcomeFor(multiplier);

  return {
    outcome,
    multiplier,
    details: {
      segment: raw,
      bets: settledBets,
      totalBet,
      payout,
    },
  };
}