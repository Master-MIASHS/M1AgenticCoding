// Unit tests for the Slots draw (Groupe 2 - issue #31).
//
// Contract under test: drawSlots(core, { config }) is the game's own
// draw(core, context) (contrat G2 § 4.1, écart 8): it turns the configured
// band widths into weights, asks core.tirageAvecPoids() for each of the three
// reels and returns { gameId: 'slots', symbols } for the rules to read.
//
// No Math.random() here either: the ONLY randomness is the injected Core
// facade, which these tests replace by a spy.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { drawSlots, draw } from '../../src/games/slots/draw.js';

/** Test-only reel -> symbol distribution: A 50 %, B 25 %, C 25 %. */
const CONFIG = {
  symbols: {
    bands: [
      { max: 0.5, symbol: 'A' },
      { max: 0.75, symbol: 'B' },
      { max: 1, symbol: 'C' },
    ],
  },
};

/**
 * Core spy: records every tirageAvecPoids call and returns `queue`'s next
 * element (the first one repeated when the queue is exhausted).
 *
 * @param {string[]} [queue] elements returned in order.
 */
function makeCore(queue = []) {
  const calls = [];
  const remaining = [...queue];
  return {
    calls,
    tirageAvecPoids(elements, poids) {
      calls.push({ elements, poids });
      return remaining.length > 0 ? remaining.shift() : elements[0];
    },
  };
}

describe('slots draw - appel au Core', () => {
  it('tire exactement trois fois via tirageAvecPoids', () => {
    const core = makeCore();
    const raw = drawSlots(core, { config: CONFIG });

    assert.equal(core.calls.length, 3, 'un tirage par rouleau');
    assert.deepEqual(raw, { gameId: 'slots', symbols: ['A', 'A', 'A'] });
  });

  it('passe les symboles de la config comme éléments et les largeurs de bandes comme poids', () => {
    const core = makeCore();
    drawSlots(core, { config: CONFIG });

    for (const call of core.calls) {
      assert.deepEqual(call.elements, ['A', 'B', 'C']);
      assert.deepEqual(call.poids, [0.5, 0.25, 0.25], 'le poids est la largeur de la bande');
    }
  });

  it('retourne les éléments renvoyés par le Core', () => {
    const core = makeCore(['C', 'B', 'A']);
    const raw = drawSlots(core, { config: CONFIG });

    assert.deepEqual(raw.symbols, ['C', 'B', 'A']);
  });

  it('expose aussi le nom court `draw` (contrat G2 § 4.1)', () => {
    assert.equal(draw, drawSlots);
  });
});

describe('slots draw - validation des entrées', () => {
  it('exige une façade Core avec tirageAvecPoids', () => {
    assert.throws(() => drawSlots(undefined, { config: CONFIG }), TypeError);
    assert.throws(() => drawSlots({}, { config: CONFIG }), TypeError);
    assert.throws(() => drawSlots({ tirageAvecPoids: 'non' }, { config: CONFIG }), TypeError);
  });

  it('exige la distribution des symboles injectée dans config.symbols', () => {
    const core = makeCore();
    assert.throws(() => drawSlots(core, undefined), TypeError);
    assert.throws(() => drawSlots(core, { config: {} }), TypeError);
    assert.throws(() => drawSlots(core, { config: { symbols: { bands: [] } } }), TypeError);
  });

  it('rejette une distribution mal formée', () => {
    const malformed = (bands) =>
      assert.throws(
        () => drawSlots(makeCore(), { config: { symbols: { bands } } }),
        TypeError,
      );

    malformed([{ max: 0.4 }]); // no symbol
    malformed([{ max: 0.4, symbol: '' }]); // empty symbol
    malformed([{ max: 1.4, symbol: 'A' }]); // max > 1
    malformed([{ max: 0, symbol: 'A' }]); // max <= 0
    malformed([
      { max: 0.7, symbol: 'B' },
      { max: 0.4, symbol: 'A' },
    ]); // not sorted
  });

  it('rejette une distribution qui ne couvre pas tout [0, 1)', () => {
    // Une bande manquante renormaliserait silencieusement les probabilités.
    assert.throws(
      () =>
        drawSlots(makeCore(), {
          config: { symbols: { bands: [{ max: 0.4, symbol: 'A' }, { max: 0.8, symbol: 'B' }] } },
        }),
      RangeError,
    );
  });

  it('ne mute pas la configuration injectée', () => {
    const before = JSON.stringify(CONFIG);
    drawSlots(makeCore(), { config: CONFIG });
    assert.equal(JSON.stringify(CONFIG), before, 'config ne doit pas être muté');
  });
});
