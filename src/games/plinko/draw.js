// ---------------------------------------------------------------------------
// Games - Plinko draw (Groupe 2 - #26, #256)
// ---------------------------------------------------------------------------
// The Core's roll() exposes a single float, but Plinko needs a weighted draw
// over its landing slots: this module is the game's own `draw(core, context)`
// (contrat G2 § 4.1, écart 8) and asks the Core for it through the weighted
// primitive `tirageAvecPoids`.
//
// The slot probabilities (number of slots, per-slot weight) live in
// `config.paytable` and `config.weights` (règle absolue 4 : no tuning value is
// hardcoded here): `paytable` is the total-return multiplier per slot, and
// `weights` the parallel array of same length giving each slot's probability.
//
// `tirageAvecPoids` returns the element itself; `drawPlinko` therefore passes
// the slot INDICES as elements, so the raw draw is the landing slot index,
// exactly what `plinko/rules.js` expects to settle.
//
// This file is the ONLY place where the game asks the Core for randomness;
// `rules.js` stays pure and only reads the index drawn here.
//
// Usage: createGame({ id: 'plinko', rules, config, draw: drawPlinko })
// ---------------------------------------------------------------------------

/**
 * Draws one landing slot index through the Core.
 *
 * Injected as `draw` by createGame (never called by the rules, which stay
 * pure). The weighted draw is delegated to the Core; the slot indices and
 * weights are read from the injected config.
 *
 * @param {{ tirageAvecPoids?: (elements: number[], poids: number[]) => number }} core
 *   public Core facade supplied by `createGame`.
 * @param {{ config?: object }} [context] - draw context from the orchestrator.
 * @returns {number} the landing slot index, handed to the rules as `raw`.
 * @throws {TypeError} when the Core facade lacks `tirageAvecPoids` or the
 *   `config.paytable` / `config.weights` arrays are missing, empty or of
 *   different lengths. Weight validation itself (sum, finiteness) is
 *   delegated to the Core primitive.
 */
export function drawPlinko(core, { config } = {}) {
  if (typeof core?.tirageAvecPoids !== 'function') {
    throw new TypeError('plinko/draw: Core facade must provide tirageAvecPoids()');
  }
  const paytable = config?.paytable;
  const weights = config?.weights;
  if (!Array.isArray(paytable) || paytable.length === 0 || !Array.isArray(weights)) {
    throw new TypeError(
      'plinko/draw: config.paytable and config.weights are required (admin data, #256)',
    );
  }
  if (paytable.length !== weights.length) {
    throw new TypeError('plinko/draw: config.paytable and config.weights must have the same length');
  }
  const slots = paytable.map((_, index) => index);
  return core.tirageAvecPoids(slots, weights);
}

// Short alias for `draw(core, context)` (contrat G2 § 4.1): both names point
// to the same function, importers pick whichever reads best.
export { drawPlinko as draw };