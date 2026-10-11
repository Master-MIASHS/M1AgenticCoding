// ---------------------------------------------------------------------------
// Games - Wheel of Fortune draw (Groupe 2 - #26, #256)
// ---------------------------------------------------------------------------
// The Core's roll() exposes a single float, but the Wheel needs a weighted
// draw over its segments: this module is the game's own `draw(core, context)`
// (contrat G2 § 4.1, écart 8) and asks the Core for it through the weighted
// primitive `tirageAvecPoids`.
//
// The wheel layout (segments, their weights) lives in `config.segments`
// (règle absolue 4 : no tuning value is hardcoded here): each segment's
// `weight` becomes the weight passed to the Core, so the draw respects
// exactly the configured distribution. `tirageAvecPoids` returns the element
// itself: the raw draw is therefore the segment object, exactly what
// `wheel/rules.js` expects to settle.
//
// This file is the ONLY place where the game asks the Core for randomness;
// `rules.js` stays pure and only reads the segment drawn here.
//
// Usage: createGame({ id: 'wheel', rules, config, draw: drawWheel })
// ---------------------------------------------------------------------------

/**
 * Draws one wheel segment through the Core.
 *
 * Injected as `draw` by createGame (never called by the rules, which stay
 * pure). The weighted draw is delegated to the Core; the weight of each
 * segment is read from the injected config.
 *
 * @param {{ tirageAvecPoids?: (elements: object[], poids: number[]) => object }} core
 *   public Core facade supplied by `createGame`.
 * @param {{ config?: object }} [context] - draw context from the orchestrator.
 * @returns {object} the segment drawn, handed to the rules as `raw`.
 * @throws {TypeError} when the Core facade lacks `tirageAvecPoids` or the
 *   `config.segments` layout is missing, empty or a segment carries no usable
 *   weight. Weight validation itself (sum, finiteness) is delegated to the
 *   Core primitive.
 */
export function drawWheel(core, { config } = {}) {
  if (typeof core?.tirageAvecPoids !== 'function') {
    throw new TypeError('wheel/draw: Core facade must provide tirageAvecPoids()');
  }
  const segments = config?.segments;
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new TypeError(
      'wheel/draw: config.segments is required (wheel layout, admin data, #256)',
    );
  }
  const weights = segments.map((segment) => {
    const weight = segment?.weight;
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0) {
      throw new TypeError('wheel/draw: each segment must carry a finite, non-negative `weight`');
    }
    return weight;
  });
  return core.tirageAvecPoids(segments, weights);
}

// Short alias for `draw(core, context)` (contrat G2 § 4.1): both names point
// to the same function, importers pick whichever reads best.
export { drawWheel as draw };