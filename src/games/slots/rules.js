// ---------------------------------------------------------------------------
// Games - Slots rules (Groupe 2, issue #31, perimeter P4)
// Pure interpretation of the drawn reels into a gameResult.
//
// ABSOLUTE RULES honored by this module:
//   * Zero imports: no Core, no coreService, no React, no Math.random().
//   * Every function is pure: same input, same output, no side effect,
//     inputs are never mutated.
//   * The rules never decide anything by themselves: they receive the RAW
//     result produced by the Core and only interpret it.
//
// RAW SHAPE: roll() only exposes a single float, so the three reel symbols
// are drawn by the game's own `draw(core, context)` (src/games/slots/draw.js,
// contrat G2 § 4.1, écart 8) through core.tirageAvecPoids(). resolve() reads
// `{ gameId: 'slots', symbols: [s1, s2, s3] }` and only maps the symbols to
// the paytable; it never touches the random source.
//
// OUTCOME: deduced from the multiplier, exactly like the Core settlement
// (src/core/economy.js): > 1 => win, = 1 => push, < 1 => loss. The config
// carries ONLY the multiplier, so an admin typo in an optional legacy
// `outcome` field can never contradict the settlement (relecture #216).
//
// PAYOUT TABLE: the project has not defined the Slots paytable yet (no table
// in discussion #8, empty `multipliers` in src/core/config/games.config.js).
// Per AGENTS.md rule 4, no tuning value is hardcoded here: the paytable is
// INJECTED through `config.paytable` and resolve() throws when it is missing.
// ---------------------------------------------------------------------------

/**
 * @typedef {object} SlotsConfig
 * @property {Record<string, { multiplier: number }>} paytable
 *   - injected paytable, keyed by the reel symbols concatenated. Only the
 *     multiplier is read: the outcome is deduced from it.
 */

/**
 * @typedef {object} SlotsRaw
 * @property {string} gameId - always 'slots'.
 * @property {string[]} symbols - the three drawn reel symbols.
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
 * @param {number} multiplier - validated payout multiplier.
 * @returns {'win' | 'loss' | 'push'} the matching outcome.
 */
function outcomeFromMultiplier(multiplier) {
  if (multiplier > 1) return 'win';
  if (multiplier < 1) return 'loss';
  return 'push';
}

/**
 * Validates the raw draw and extracts the three drawn reel symbols.
 *
 * @param {unknown} raw - candidate raw draw.
 * @returns {string[]} exactly three non-empty symbols.
 * @throws {TypeError} when raw is not an object with a `symbols` array of
 *   non-empty strings.
 * @throws {RangeError} when there are not exactly three reels.
 */
export function getReels(raw) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new TypeError('slots/rules: raw must be an object produced by the slots draw');
  }
  const { symbols } = raw;
  if (!Array.isArray(symbols) || symbols.length === 0) {
    throw new TypeError('slots/rules: raw.symbols must be an array of non-empty strings');
  }
  if (symbols.some((symbol) => typeof symbol !== 'string' || symbol.length === 0)) {
    throw new TypeError('slots/rules: raw.symbols must be an array of non-empty strings');
  }
  if (symbols.length !== 3) {
    throw new RangeError('slots/rules: slots has exactly 3 reels');
  }
  return symbols;
}

/**
 * Validates the injected paytable. Only `multiplier` is read: any legacy
 * `outcome` field carried by the config is ignored, never trusted.
 *
 * @param {unknown} config - candidate config.
 * @returns {Record<string, { multiplier: number }>} validated paytable.
 * @throws {TypeError} when the paytable is missing or malformed.
 */
function assertValidPaytable(config) {
  const paytable = config?.paytable;
  if (typeof paytable !== 'object' || paytable === null || Array.isArray(paytable)) {
    throw new TypeError(
      'slots/rules: config.paytable is required (paytable not defined by the project yet)',
    );
  }
  for (const [combination, payout] of Object.entries(paytable)) {
    if (typeof payout !== 'object' || payout === null) {
      throw new TypeError(`slots/rules: payout for "${combination}" must be an object`);
    }
    if (!isFiniteNumber(payout.multiplier) || payout.multiplier < 0) {
      throw new TypeError(`slots/rules: payout "${combination}".multiplier must be a number >= 0`);
    }
  }
  return paytable;
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
 * Interprets three drawn reels into a gameResult.
 *
 * @param {SlotsRaw} raw - raw draw produced by `src/games/slots/draw.js`.
 * @param {{ bets: Array<{ type: string, amount: number }>, config?: SlotsConfig }} context
 * @returns {GameResult} `{ outcome, multiplier, details }`, the outcome being
 *   deduced from the payout multiplier.
 * @throws {TypeError} on an invalid raw, bets, missing config, or a combination
 *   absent from the paytable.
 * @throws {RangeError} when the reel count is not exactly three.
 * @example
 * resolve({ gameId: 'slots', symbols: ['A', 'A', 'A'] }, { bets: [{ type: 'mise', amount: 20 }], config });
 * // => { outcome: 'win', multiplier: 50, details: { symbols: ['A','A','A'], combination: 'AAA', stake: 20 } }
 */
export function resolve(raw, { bets, config } = {}) {
  const symbols = getReels(raw);
  const stake = getTotalStake(bets);
  const paytable = assertValidPaytable(config);

  const combination = symbols.join('');
  const payout = paytable[combination];
  if (payout === undefined) {
    throw new TypeError(`slots/rules: no payout for combination "${combination}"`);
  }

  const { multiplier } = payout;
  return {
    outcome: outcomeFromMultiplier(multiplier),
    multiplier,
    details: {
      symbols,
      combination,
      stake,
    },
  };
}
