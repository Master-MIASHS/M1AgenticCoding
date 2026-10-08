// ---------------------------------------------------------------------------
// Games - Scratch rules (Groupe 2, issue #31, perimeter P4)
// Pure interpretation of a raw Scratch roll into a gameResult.
//
// ABSOLUTE RULES honored by this module:
//   * Zero imports: no Core, no coreService, no React, no Math.random().
//   * Every function is pure: same input, same output, no side effect,
//     inputs are never mutated.
//   * The rules never decide anything by themselves: they receive the RAW
//     result produced by the Core and only interpret it.
//
// OUTCOME: deduced from the multiplier, exactly like the Core settlement
// (src/core/economy.js): > 1 => win, = 1 => push, < 1 => loss. The config
// carries ONLY the multiplier, so an admin typo in an optional legacy
// `outcome` field can never contradict the settlement (relecture #216).
//
// PAYOUT TABLE: the project has not defined the Scratch paytable yet (no table
// in discussion #8, empty `multipliers` in src/core/config/games.config.js).
// Per AGENTS.md rule 4, no tuning value is hardcoded here: the table is
// INJECTED through `config.payouts` and resolve() throws when it is missing.
// ---------------------------------------------------------------------------

/**
 * @typedef {object} ScratchBand
 * @property {number} max - exclusive upper bound of the band, in [0, 1].
 * @property {string} symbol - game-specific symbol of the band (display).
 * @property {number} multiplier - 0 if loss, 1 if push, > 1 if win.
 */

/**
 * @typedef {object} ScratchConfig
 * @property {{ bands: ScratchBand[] }} payouts - injected payout table.
 */

/**
 * @typedef {object} ScratchRaw
 * @property {string} gameId - always 'scratch'.
 * @property {number} value - raw roll, a float in [0, 1).
 * @property {number} [nonce] - raw integer, kept for auditing.
 */

/**
 * @typedef {object} GameResult
 * @property {'win' | 'loss' | 'push'} outcome
 * @property {number} multiplier - 0 if loss, 1 if push, > 1 if win.
 * @property {object} details - game-specific, opaque for the Core.
 */

/** @param {unknown} value @returns {boolean} */
function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Deduces the outcome from the multiplier, using the exact rule the Core
 * applies when settling (src/core/economy.js): > 1 => win, < 1 => loss,
 * = 1 => push.
 *
 * @param {number} multiplier - validated band multiplier.
 * @returns {'win' | 'loss' | 'push'} the matching outcome.
 */
function outcomeFromMultiplier(multiplier) {
  if (multiplier > 1) return 'win';
  if (multiplier < 1) return 'loss';
  return 'push';
}

/**
 * Validates the raw roll produced by the Core.
 *
 * @param {unknown} raw - candidate raw roll.
 * @returns {ScratchRaw} the validated roll.
 * @throws {TypeError} when raw is not an object with a numeric `value`.
 * @throws {RangeError} when `value` is outside [0, 1).
 */
function assertValidRaw(raw) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new TypeError('scratch/rules: raw must be an object produced by roll()');
  }
  if (!isFiniteNumber(raw.value)) {
    throw new TypeError('scratch/rules: raw.value must be a number in [0, 1)');
  }
  if (raw.value < 0 || raw.value >= 1) {
    throw new RangeError('scratch/rules: raw.value must be in [0, 1)');
  }
  return raw;
}

/**
 * Validates the injected payout table. Only `multiplier` is read: any legacy
 * `outcome` field carried by the config is ignored, never trusted.
 *
 * @param {unknown} config - candidate config.
 * @returns {ScratchBand[]} the validated, ordered bands.
 * @throws {TypeError} when the table is missing or malformed.
 */
function assertValidPayouts(config) {
  const bands = config?.payouts?.bands;
  if (!Array.isArray(bands) || bands.length === 0) {
    throw new TypeError(
      'scratch/rules: config.payouts.bands is required (paytable not defined by the project yet)',
    );
  }
  let previousMax = 0;
  for (const band of bands) {
    if (typeof band !== 'object' || band === null) {
      throw new TypeError('scratch/rules: each band must be an object');
    }
    if (!isFiniteNumber(band.max) || band.max <= 0 || band.max > 1) {
      throw new TypeError('scratch/rules: band.max must be a number in (0, 1]');
    }
    if (band.max <= previousMax) {
      throw new TypeError('scratch/rules: bands must be sorted by ascending exclusive max');
    }
    if (!isFiniteNumber(band.multiplier) || band.multiplier < 0) {
      throw new TypeError('scratch/rules: band.multiplier must be a number >= 0');
    }
    if (typeof band.symbol !== 'string') {
      throw new TypeError('scratch/rules: band.symbol must be a string');
    }
    previousMax = band.max;
  }
  return bands;
}

/**
 * Sums the amounts of a bet array.
 *
 * The orchestrator always sends an array, even for a single bet, so a
 * non-array is a contract violation and throws rather than being coerced.
 *
 * @param {unknown} bets - expected `[{ type, amount }]`.
 * @returns {number} total stake, 0 when the array is empty.
 * @throws {TypeError} when bets is not an array of `{ type, amount }`.
 */
export function getTotalStake(bets) {
  if (!Array.isArray(bets)) {
    throw new TypeError('scratch/rules: bets must be an array of { type, amount }');
  }
  let total = 0;
  for (const bet of bets) {
    if (typeof bet !== 'object' || bet === null || !isFiniteNumber(bet.amount)) {
      throw new TypeError('scratch/rules: each bet must be a { type, amount } object');
    }
    total += bet.amount;
  }
  return total;
}

/**
 * Finds the band whose exclusive upper bound contains the raw value.
 *
 * @param {number} value - raw roll in [0, 1).
 * @param {ScratchBand[]} bands - validated, ascending bands.
 * @returns {ScratchBand} the matching band.
 * @throws {RangeError} when no band contains the value (gap in the table).
 */
function findBand(value, bands) {
  for (const band of bands) {
    if (value < band.max) {
      return band;
    }
  }
  throw new RangeError('scratch/rules: no payout band contains raw.value (gap in the table)');
}

/**
 * Interprets a raw Scratch roll into a gameResult.
 *
 * @param {ScratchRaw} raw - raw result from `coreService.roll()`.
 * @param {{ bets: Array<{ type: string, amount: number }>, config?: ScratchConfig }} context
 * @returns {GameResult} `{ outcome, multiplier, details }`, the outcome being
 *   deduced from the band multiplier.
 * @throws {TypeError} on an invalid raw, bets or missing payout table.
 * @throws {RangeError} when raw.value is outside [0, 1).
 * @example
 * resolve({ gameId: 'scratch', value: 0.6 }, { bets: [{ type: 'mise', amount: 10 }], config });
 * // => { outcome: 'win', multiplier: 2, details: { symbol: 'petit', value: 0.6, stake: 10 } }
 */
export function resolve(raw, { bets, config } = {}) {
  assertValidRaw(raw);
  const stake = getTotalStake(bets);
  const bands = assertValidPayouts(config);
  const band = findBand(raw.value, bands);

  const { multiplier } = band;
  return {
    outcome: outcomeFromMultiplier(multiplier),
    multiplier,
    details: {
      symbol: band.symbol,
      value: raw.value,
      stake,
    },
  };
}
