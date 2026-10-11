// Unit tests for the Plinko draw (Groupe 2 - #26, #256).
//
// Contract under test: drawPlinko(core, { config }) is the game's own
// draw(core, context) (contrat G2 § 4.1, écart 8): it turns the configured
// slot indices into elements and the parallel `weights` into weights, asks
// core.tirageAvecPoids() once and returns the landing slot index for the
// rules to read.
//
// No Math.random() here either: the ONLY randomness is the injected Core
// facade, which these tests replace by a spy.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { drawPlinko, draw } from '../../src/games/plinko/draw.js';

/** Test-only Plinko config: 5 slots, weights chosen so each index is drawable. */
const CONFIG = {
  paytable: [0, 0.5, 1, 2, 5],
  weights: [1, 1, 1, 1, 1],
};

/**
 * Core spy: records every tirageAvecPoids call and returns `queue`'s next
 * element (the first one repeated when the queue is exhausted).
 *
 * @param {number[]} [queue] slot indices returned in order.
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

describe('plinko draw - appel au Core', () => {
  it('tire une seule fois via tirageAvecPoids au-dessus des indices de cases', () => {
    const core = makeCore();
    const raw = drawPlinko(core, { config: CONFIG });

    assert.equal(core.calls.length, 1, 'un seul tirage par partie');
    assert.equal(raw, 0, 'l\'index par défaut est le premier élément');
  });

  it('passe les indices des cases comme éléments et config.weights comme poids', () => {
    const core = makeCore();
    drawPlinko(core, { config: CONFIG });

    assert.equal(core.calls.length, 1);
    assert.deepEqual(core.calls[0].elements, [0, 1, 2, 3, 4], 'les éléments sont les indices de cases');
    assert.deepEqual(core.calls[0].poids, CONFIG.weights, 'config.weights est passé tel quel au Core');
  });

  it('retourne l\'index renvoyé par le Core', () => {
    const raw = drawPlinko(makeCore([3]), { config: CONFIG });

    assert.equal(raw, 3);
  });

  it('expose aussi le nom court `draw` (contrat G2 § 4.1)', () => {
    assert.equal(draw, drawPlinko);
  });
});

describe('plinko draw - validation des entrées', () => {
  it('exige une façade Core avec tirageAvecPoids', () => {
    assert.throws(() => drawPlinko(undefined, { config: CONFIG }), TypeError);
    assert.throws(() => drawPlinko({}, { config: CONFIG }), TypeError);
    assert.throws(() => drawPlinko({ tirageAvecPoids: 'non' }, { config: CONFIG }), TypeError);
  });

  it('exige config.paytable et config.weights', () => {
    const core = makeCore();
    assert.throws(() => drawPlinko(core, undefined), TypeError);
    assert.throws(() => drawPlinko(core, { config: {} }), TypeError);
    assert.throws(() => drawPlinko(core, { config: { paytable: [] } }), TypeError);
    assert.throws(() => drawPlinko(core, { config: { paytable: [1] } }), TypeError);
  });

  it('exige des tableaux de même longueur', () => {
    assert.throws(
      () =>
        drawPlinko(makeCore(), {
          config: { paytable: [0, 1], weights: [1] },
        }),
      TypeError,
    );
  });

  it('ne mute pas la configuration injectée', () => {
    const before = JSON.stringify(CONFIG);
    drawPlinko(makeCore(), { config: CONFIG });
    assert.equal(JSON.stringify(CONFIG), before, 'config ne doit pas être muté');
  });
});