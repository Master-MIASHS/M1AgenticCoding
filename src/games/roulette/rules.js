// ---------------------------------------------------------------------------
// Games - Roulette rules (Groupe 2 - ticket #191)
// ---------------------------------------------------------------------------
// Pure interpretation of a roulette spin: the number has already been drawn
// (tirageEntier(0, 36)), this module only translates it into a settled game
// result for every bet placed on the table (famille B, mises multiples).
//
// ABSOLUTE RULES honored by this module:
//  * Zero imports: no Core, no coreService, no Math.random().
//  * Pure function: `raw` and every argument are never mutated.
//  * No tuning value is hardcoded: the paytable comes from `config`, which the
//    admin fills through the Core (AGENTS.md rule 4).
//
// DRAW SHAPE - follows the G1 proposal in issue #27: `raw` is the integer
// drawn by `tirageEntier(0, 36)`. Where the ball lands is therefore never
// recomputed here: this module cannot and must not decide that the spin wins
// or loses, it only applies the paytable the admin configured.
//
// The table layout itself (which numbers are red, black, even, a dozen, ...)
// is NOT modelled here. G1 owns the randomness, G3 owns the animation. This
// module only settles, betting type by betting type against the `match` list
// the admin configured.
// ---------------------------------------------------------------------------

/**
 * A bet placed on a roulette spin.
 *
 * @typedef {object} Bet
 * @property {string} type - bet type, must be a key of `config.bets`.
 * @property {number} amount - staked chips, a positive number.
 */

/**
 * One entry of the roulette paytable: which numbers win, and what they return.
 *
 * @typedef {object} RouletteBetRule
 * @property {number[]} match - the winning numbers this bet type covers. A bet
 *   wins when the drawn number is in this list.
 * @property {number} multiplier - TOTAL return multiplier, stake included.
 *   0 returns nothing, 1 gives the stake back.
 */

/**
 * Runtime configuration for the roulette.
 *
 * Only the paytable is required. The table layout (which numbers belong to
 * which bet type) belongs to the Core and the admin configuration, NOT to the
 * rules. Keeping the layout out of here avoids forcing an identity rule
 * between the Core's `raw` and a second copy of the layout, which would break
 * as soon as the two drift apart.
 *
 * @typedef {object} RouletteConfig
 * @property {Record<string, RouletteBetRule>} bets - paytable, keyed by bet type.
 */

const ROULETTE_MIN = 0;
const ROULETTE_MAX = 36;

/**
 * Checks that `raw` is a usable roulette draw.
 *
 * @param {unknown} raw
 * @returns {boolean} true when `raw` is an integer within the wheel range.
 */
function isDrawnNumber(raw) {
  return Number.isInteger(raw) && raw >= ROULETTE_MIN && raw <= ROULETTE_MAX;
}

/**
 * Checks that a bet is a well-formed roulette bet.
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
 * Settles one roulette spin for every placed bet.
 *
 * @param {number} raw - the number drawn by the Core (0..36).
 * @param {object} [options]
 * @param {Bet[]} [options.bets] - always an array, even for a single bet.
 * @param {RouletteConfig} [options.config] - must provide `bets`, the paytable.
 * @returns {{ outcome: 'win' | 'loss' | 'push', multiplier: number, details: object }}
 * @throws {Error} when the draw, the bets or the config are unusable.
 */
export function resolve(raw, { bets, config } = {}) {
  if (!isDrawnNumber(raw)) {
    throw new Error(
      `roulette: raw must be an integer between ${ROULETTE_MIN} and ${ROULETTE_MAX}, received ${raw}`
    );
  }

  if (!Array.isArray(bets)) {
    throw new Error(`roulette: bets must be an array, received ${typeof bets}`);
  }
  if (bets.length === 0) {
    throw new Error('roulette: bets must contain at least one bet');
  }
  if (!bets.every(isValidBet)) {
    throw new Error('roulette: every bet must look like { type: <string>, amount: <positive> }');
  }

  if (typeof config !== 'object' || config === null) {
    throw new Error('roulette: config is required. The paytable is admin data and must never be hardcoded.');
  }
  if (typeof config.bets !== 'object' || config.bets === null) {
    throw new Error('roulette: config.bets (the paytable) is required');
  }

  const paytable = config.bets;

  const settledBets = bets.map((bet) => {
    const rule = paytable[bet.type];
    if (!rule || typeof rule !== 'object') {
      throw new Error(`roulette: unknown bet type '${bet.type}', not in the paytable`);
    }
    if (!Array.isArray(rule.match)) {
      throw new Error(`roulette: paytable entry '${bet.type}' has no 'match' list`);
    }
    if (typeof rule.multiplier !== 'number' || !Number.isFinite(rule.multiplier)) {
      throw new Error(`roulette: paytable entry '${bet.type}' has no numeric 'multiplier'`);
    }
    if (rule.multiplier < 0) {
      throw new Error(`roulette: paytable entry '${bet.type}' has a negative 'multiplier'`);
    }

    const won = rule.match.includes(raw);
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
      raw,
      bets: settledBets,
      totalBet,
      payout,
    },
  };
}
