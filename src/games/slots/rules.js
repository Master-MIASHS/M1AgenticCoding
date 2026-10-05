// ---------------------------------------------------------------------------
// Games - Slots rules (Groupe 2, issue #31, perimeter P4)
// Pure interpretation of raw reels into a gameResult.
//
// ABSOLUTE RULES honored by this module:
//   * Zero imports: no Core, no coreService, no React, no Math.random().
//   * Every function is pure: same input, same output, no side effect,
//     inputs are never mutated.
//   * The rules never decide anything by themselves: they receive the RAW
//     result produced by the Core and only interpret it.
//
// RAW SHAPE (hypothesis, to confirm with the G2 integration referent):
// the Core's roll() exposes a single float (`value`) and ignores `params`, so
// the three reels are read from `raw.values`, an array of three floats in
// [0, 1). The shape of the raw rolls is an open question: see issue #73 and
// issue #27 (RNG, G1).
//
// PAYOUT TABLE: the project has not defined the Slots paytable yet (no table in
// discussion #8, empty `multipliers` in src/core/config/games.config.js). Per
// AGENTS.md rule 4, no tuning value is hardcoded here: both the symbol
// distribution and the paytable are INJECTED through `config`, and resolve()
// throws when either is missing.
// ---------------------------------------------------------------------------

/**
 * @typedef {object} ReelBand
 * @property {number} max - exclusive upper bound of the band, in [0, 1].
 * @property {string} symbol - reel symbol for this band.
 */

/**
 * @typedef {object} SlotsConfig
 * @property {{ bands: ReelBand[] }} symbols - injected reel -> symbol mapping.
 * @property {Record<string, { outcome: 'win' | 'loss' | 'push', multiplier: number }>} payouts
 *   - injected paytable, keyed by the reel symbols concatenated.
 */

/**
 * @typedef {object} SlotsRaw
 * @property {string} gameId - always 'slots'.
 * @property {number[]} values - three raw rolls in [0, 1), one per reel.
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
 * Validates the raw roll and extracts its three reels.
 *
 * @param {unknown} raw - candidate raw roll.
 * @returns {number[]} exactly three values in [0, 1).
 * @throws {TypeError} when raw is not an object with a numeric `values` array.
 * @throws {RangeError} when there are not exactly three reels, or one is out of range.
 */
export function getReels(raw) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new TypeError('slots/rules: raw must be an object produced by roll()');
  }
  const { values } = raw;
  if (!Array.isArray(values) || values.length === 0 || !values.every(isFiniteNumber)) {
    throw new TypeError('slots/rules: raw.values must be an array of numbers in [0, 1)');
  }
  if (values.length !== 3) {
    throw new RangeError('slots/rules: slots has exactly 3 reels');
  }
  for (const value of values) {
    if (value < 0 || value >= 1) {
      throw new RangeError('slots/rules: every reel must be in [0, 1)');
    }
  }
  return values;
}

/**
 * Validates the injected reel -> symbol distribution.
 *
 * @param {unknown} config - candidate config.
 * @returns {ReelBand[]} the validated, ordered bands.
 * @throws {TypeError} when the distribution is missing or malformed.
 */
function assertValidSymbols(config) {
  const bands = config?.symbols?.bands;
  if (!Array.isArray(bands) || bands.length === 0) {
    throw new TypeError(
      'slots/rules: config.symbols.bands is required (reel distribution not defined by the project yet)',
    );
  }
  let previousMax = 0;
  for (const band of bands) {
    if (typeof band !== 'object' || band === null) {
      throw new TypeError('slots/rules: each symbol band must be an object');
    }
    if (!isFiniteNumber(band.max) || band.max <= 0 || band.max > 1) {
      throw new TypeError('slots/rules: symbol band max must be a number in (0, 1]');
    }
    if (band.max <= previousMax) {
      throw new TypeError('slots/rules: symbol bands must be sorted by ascending exclusive max');
    }
    if (typeof band.symbol !== 'string' || band.symbol.length === 0) {
      throw new TypeError('slots/rules: symbol band symbol must be a non-empty string');
    }
    previousMax = band.max;
  }
  return bands;
}

/**
 * Validates the injected paytable.
 *
 * @param {unknown} config - candidate config.
 * @returns {Record<string, { outcome: string, multiplier: number }>} validated paytable.
 * @throws {TypeError} when the paytable is missing or malformed.
 */
function assertValidPayouts(config) {
  const payouts = config?.payouts;
  if (typeof payouts !== 'object' || payouts === null || Array.isArray(payouts)) {
    throw new TypeError(
      'slots/rules: config.payouts is required (paytable not defined by the project yet)',
    );
  }
  for (const [combination, payout] of Object.entries(payouts)) {
    if (typeof payout !== 'object' || payout === null) {
      throw new TypeError(`slots/rules: payout for "${combination}" must be an object`);
    }
    if (!['win', 'loss', 'push'].includes(payout.outcome)) {
      throw new TypeError(`slots/rules: payout "${combination}".outcome must be win, loss or push`);
    }
    if (!isFiniteNumber(payout.multiplier) || payout.multiplier < 0) {
      throw new TypeError(`slots/rules: payout "${combination}".multiplier must be a number >= 0`);
    }
  }
  return payouts;
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
    throw new TypeError('slots/rules: bets must be an array of { type, amount }');
  }
  let total = 0;
  for (const bet of bets) {
    if (typeof bet !== 'object' || bet === null || !isFiniteNumber(bet.amount)) {
      throw new TypeError('slots/rules: each bet must be a { type, amount } object');
    }
    total += bet.amount;
  }
  return total;
}

/**
 * Maps a raw reel value to its symbol.
 *
 * @param {number} value - raw reel in [0, 1).
 * @param {ReelBand[]} bands - validated, ascending bands.
 * @returns {string} the reel symbol.
 * @throws {RangeError} when no band contains the value (gap in the distribution).
 */
function findSymbol(value, bands) {
  for (const band of bands) {
    if (value < band.max) {
      return band.symbol;
    }
  }
  throw new RangeError('slots/rules: no symbol band contains a reel (gap in the distribution)');
}

/**
 * Interprets three raw reels into a gameResult.
 *
 * @param {SlotsRaw} raw - raw result from `coreService.roll()`.
 * @param {{ bets: Array<{ type: string, amount: number }>, config?: SlotsConfig }} context
 * @returns {GameResult} `{ outcome, multiplier, details }`.
 * @throws {TypeError} on an invalid raw, bets, missing config, or a combination
 *   absent from the paytable.
 * @throws {RangeError} when the reel count or a reel value is out of range.
 * @example
 * resolve({ gameId: 'slots', values: [0.1, 0.1, 0.1] }, { bets: [{ type: 'mise', amount: 20 }], config });
 * // => { outcome: 'win', multiplier: 50, details: { reels: [...], symbols: ['A','A','A'], combination: 'AAA', stake: 20 } }
 */
export function resolve(raw, { bets, config } = {}) {
  const reels = getReels(raw);
  const stake = getTotalStake(bets);
  const symbolBands = assertValidSymbols(config);
  const payouts = assertValidPayouts(config);

  const symbols = reels.map((value) => findSymbol(value, symbolBands));
  const combination = symbols.join('');

  const payout = payouts[combination];
  if (payout === undefined) {
    throw new TypeError(`slots/rules: no payout for combination "${combination}"`);
  }

  return {
    outcome: payout.outcome,
    multiplier: payout.multiplier,
    details: {
      reels,
      symbols,
      combination,
      stake,
    },
  };
}
