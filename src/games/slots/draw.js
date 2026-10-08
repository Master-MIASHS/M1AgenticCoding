// ---------------------------------------------------------------------------
// Games - Slots draw (Groupe 2, issue #31)
// ---------------------------------------------------------------------------
// The Core's roll() exposes a single float, but Slots needs three reel
// symbols: this module is the game's own `draw(core, context)` (contrat G2
// § 4.1, écart 8) and asks the Core for the three draws through the weighted
// primitive `tirageAvecPoids` (PR #115).
//
// The symbol distribution lives in `config.symbols.bands` (règle absolue 4 :
// no tuning value is hardcoded here): each exclusive band width over [0, 1)
// becomes the weight passed to the Core, so the drawn symbols follow exactly
// the configured distribution. The bands MUST cover the whole [0, 1) range,
// otherwise the configured probabilities would be silently renormalized.
//
// This file is the ONLY place where the game asks the Core for randomness;
// `rules.js` stays pure and only reads the symbols drawn here.
//
// Usage: createGame({ id: 'slots', rules, config, draw: drawSlots })
// ---------------------------------------------------------------------------

/** Number of reels of the machine (game mechanic, not a tuning value). */
const REEL_COUNT = 3;

/** @param {unknown} value @returns {boolean} */
function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Validates the injected reel -> symbol distribution.
 *
 * @param {unknown} config - candidate config.
 * @returns {Array<{ max: number, symbol: string }>} the validated bands.
 * @throws {TypeError} when the distribution is missing or malformed.
 * @throws {RangeError} when the bands do not cover the whole [0, 1) range.
 */
function assertValidSymbols(config) {
  const bands = config?.symbols?.bands;
  if (!Array.isArray(bands) || bands.length === 0) {
    throw new TypeError(
      'slots/draw: config.symbols.bands is required (reel distribution not defined by the project yet)',
    );
  }
  let previousMax = 0;
  for (const band of bands) {
    if (typeof band !== 'object' || band === null) {
      throw new TypeError('slots/draw: each symbol band must be an object');
    }
    if (!isFiniteNumber(band.max) || band.max <= 0 || band.max > 1) {
      throw new TypeError('slots/draw: symbol band max must be a number in (0, 1]');
    }
    if (band.max <= previousMax) {
      throw new TypeError('slots/draw: symbol bands must be sorted by ascending exclusive max');
    }
    if (typeof band.symbol !== 'string' || band.symbol.length === 0) {
      throw new TypeError('slots/draw: symbol band symbol must be a non-empty string');
    }
    previousMax = band.max;
  }
  if (previousMax !== 1) {
    throw new RangeError('slots/draw: symbol bands must cover [0, 1) (last band max must be 1)');
  }
  return bands;
}

/**
 * Converts the band widths into weights for `core.tirageAvecPoids`.
 *
 * Bands are exclusive upper bounds over [0, 1): the weight of a band is its
 * width, so a band configured as [0, 0.4) keeps its 40 % probability.
 *
 * @param {Array<{ max: number }>} bands - validated, ascending bands.
 * @returns {number[]} parallel weights (same length as the bands).
 */
function toWeights(bands) {
  let previousMax = 0;
  return bands.map((band) => {
    const weight = band.max - previousMax;
    previousMax = band.max;
    return weight;
  });
}

/**
 * Draws the three reel symbols through the Core.
 *
 * Injected as `draw` by createGame (never called by the rules, which stay
 * pure). Each reel is drawn independently with the same distribution.
 *
 * @param {{ tirageAvecPoids?: (elements: Array<string>, poids: number[]) => string }} core
 *   public Core facade supplied by `createGame`.
 * @param {{ config?: object }} [context] - draw context from the orchestrator.
 * @returns {{ gameId: 'slots', symbols: string[] }} the raw draw handed to the rules.
 * @throws {TypeError} when the Core facade lacks `tirageAvecPoids` or the
 *   config distribution is missing/malformed.
 * @throws {RangeError} when the bands do not cover [0, 1).
 */
export function drawSlots(core, { config } = {}) {
  if (typeof core?.tirageAvecPoids !== 'function') {
    throw new TypeError('slots/draw: Core facade must provide tirageAvecPoids()');
  }
  const bands = assertValidSymbols(config);
  const elements = bands.map((band) => band.symbol);
  const weights = toWeights(bands);

  const symbols = [];
  for (let reel = 0; reel < REEL_COUNT; reel += 1) {
    symbols.push(core.tirageAvecPoids(elements, weights));
  }
  return { gameId: 'slots', symbols };
}

// Short alias for `draw(core, context)` (contrat G2 § 4.1): both names point
// to the same function, importers pick whichever reads best.
export { drawSlots as draw };
