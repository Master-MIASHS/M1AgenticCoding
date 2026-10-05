// ---------------------------------------------------------------------------
// Games - Plinko rules (Groupe 2 - ticket #26)
// ---------------------------------------------------------------------------
// Pure interpretation of a Plinko draw: the ball has already landed, this
// module only translates that landing slot into a settled game result.
//
// ABSOLUTE RULES honored by this module:
//  * Zero imports: no Core, no coreService, no Math.random().
//  * Pure function: `raw` and every argument are never mutated.
//  * No tuning value is hardcoded: the paytable comes from `config`, which the
//    admin fills through the Core (AGENTS.md rule 4).
//
// DRAW SHAPE - decided by Camille on 30/09/2026, following the G1 proposal
// in issue #27: `raw` is the INDEX of the landing slot (the slot the ball
// falls into at the bottom of the board). The alternative shape - one 0/1 per
// row, i.e. the whole path - is deliberately not used: it would make this
// module rebuild the trajectory instead of reading its outcome.
//
// The physical board itself (number of rows, peg layout, per-slot probability)
// is NOT modelled here. G1 owns the randomness and the weights, G3 owns the
// animation. This module only settles.
// ---------------------------------------------------------------------------

/**
 * A bet placed on a Plinko round.
 *
 * `type` is always 'slot': in Plinko the player does not pick a target, they
 * only stake an amount and the ball decides where it lands.
 *
 * @typedef {object} Bet
 * @property {string} type - must be 'slot'.
 * @property {number} amount - staked chips, a positive number.
 */

/**
 * Runtime configuration for Plinko.
 *
 * CONTRACT NOTE - OPEN (contract G2 v0.3, section 6): how the rules receive
 * the admin configuration is not settled yet. The shape below is a PROPOSITION
 * and may change once G1 exposes `getGameConfig` through `coreService`.
 *
 * @typedef {object} PlinkoConfig
 * @property {number[]} paytable - TOTAL return multiplier for each landing
 *   slot, indexed by slot number. Index 0 is the leftmost slot.
 *   0 means the round returns nothing, 1 means the stake is simply given back.
 */

/**
 * The one and only bet type this game accepts.
 */
const BET_TYPE = 'slot';

/**
 * Checks that `raw` is a usable slot index.
 *
 * @param {unknown} raw
 * @returns {boolean} true when `raw` is a non-negative integer.
 */
function isSlotIndex(raw) {
  return Number.isInteger(raw) && raw >= 0;
}

/**
 * Checks that a bet is a well-formed Plinko bet.
 *
 * @param {unknown} bet
 * @returns {boolean} true when `bet` has the right type and a positive amount.
 */
function isValidBet(bet) {
  return (
    typeof bet === 'object' &&
    bet !== null &&
    bet.type === BET_TYPE &&
    typeof bet.amount === 'number' &&
    Number.isFinite(bet.amount) &&
    bet.amount > 0
  );
}

/**
 * Reads the total return multiplier of a landing slot.
 *
 * @param {PlinkoConfig} config
 * @param {number} slotIndex
 * @returns {number} the multiplier, or NaN when the slot is not configured.
 */
function multiplierForSlot(config, slotIndex) {
  return config.paytable[slotIndex];
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
 * Settles one Plinko round.
 *
 * @param {number} raw - index of the landing slot (see header).
 * @param {object} [options]
 * @param {Bet[]} [options.bets] - always an array, even for a single bet.
 * @param {PlinkoConfig} [options.config] - must provide `paytable`.
 * @returns {{ outcome: 'win' | 'loss' | 'push', multiplier: number, details: object }}
 * @throws {Error} when the draw, the bets or the config are unusable.
 */
export function resolve(raw, { bets, config } = {}) {
  if (!isSlotIndex(raw)) {
    throw new Error(`plinko: raw must be a slot index (integer >= 0), received ${raw}`);
  }

  if (!Array.isArray(bets)) {
    throw new Error(`plinko: bets must be an array, received ${typeof bets}`);
  }
  if (bets.length === 0) {
    throw new Error('plinko: bets must contain at least one bet');
  }
  if (!bets.every(isValidBet)) {
    throw new Error(
      `plinko: every bet must look like { type: '${BET_TYPE}', amount: <positive number> }`
    );
  }

  if (typeof config !== 'object' || config === null || !Array.isArray(config.paytable)) {
    throw new Error(
      'plinko: config.paytable is required. The paytable is admin data and must never be hardcoded.'
    );
  }

  const multiplier = multiplierForSlot(config, raw);
  if (!Number.isFinite(multiplier) || multiplier < 0) {
    throw new Error(`plinko: no paytable entry for slot ${raw}`);
  }

  const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const payout = totalBet * multiplier;

  return {
    outcome: outcomeFor(multiplier),
    multiplier,
    details: {
      slot: raw,
      bets: bets.map((bet) => ({ type: bet.type, amount: bet.amount })),
      totalBet,
      payout,
    },
  };
}