// Unit tests for the Wheel draw (Groupe 2 - #26, #256).
//
// Contract under test: drawWheel(core, { config }) is the game's own
// draw(core, context) (contrat G2 § 4.1, écart 8): it turns the configured
// segment weights into weights, asks core.tirageAvecPoids() once and returns
// the drawn segment for the rules to read.
//
// No Math.random() here either: the ONLY randomness is the injected Core
// facade, which these tests replace by a spy.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { drawWheel, draw } from '../../src/games/wheel/draw.js';

/** Test-only wheel layout: s1 and s2 equally likely, s3 weight 0 never drawn. */
const CONFIG = {
  segments: [
    { id: 's1', color: 'red', weight: 1 },
    { id: 's2', color: 'blue', weight: 1 },
    { id: 's3', color: 'green', weight: 0 },
  ],
};

/**
 * Core spy: records every tirageAvecPoids call and returns `queue`'s next
 * element (the first one repeated when the queue is exhausted).
 *
 * @param {object[]} [queue] segments returned in order.
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

describe('wheel draw - appel au Core', () => {
  it('tire une seule fois via tirageAvecPoids au-dessus des segments', () => {
    const core = makeCore();
    const raw = drawWheel(core, { config: CONFIG });

    assert.equal(core.calls.length, 1, 'un seul tirage par partie');
    assert.deepEqual(raw, CONFIG.segments[0]);
    assert.ok(core.calls[0].elements.includes(raw), 'l\'élément tiré appartient à la liste des segments');
  });

  it('passe les segments de la config comme éléments et leurs weight comme poids', () => {
    const core = makeCore();
    drawWheel(core, { config: CONFIG });

    assert.equal(core.calls.length, 1);
    assert.deepEqual(core.calls[0].elements, CONFIG.segments);
    assert.deepEqual(core.calls[0].poids, [1, 1, 0], 'chaque weight de segment devient un poids');
  });

  it('retourne le segment renvoyé par le Core', () => {
    const segment = { id: 's2', color: 'blue', weight: 1 };
    const raw = drawWheel(makeCore([segment]), { config: CONFIG });

    assert.equal(raw, segment);
  });

  it('expose aussi le nom court `draw` (contrat G2 § 4.1)', () => {
    assert.equal(draw, drawWheel);
  });
});

describe('wheel draw - validation des entrées', () => {
  it('exige une façade Core avec tirageAvecPoids', () => {
    assert.throws(() => drawWheel(undefined, { config: CONFIG }), TypeError);
    assert.throws(() => drawWheel({}, { config: CONFIG }), TypeError);
    assert.throws(() => drawWheel({ tirageAvecPoids: 'non' }, { config: CONFIG }), TypeError);
  });

  it('exige la disposition de la roue injectée dans config.segments', () => {
    const core = makeCore();
    assert.throws(() => drawWheel(core, undefined), TypeError);
    assert.throws(() => drawWheel(core, { config: {} }), TypeError);
    assert.throws(() => drawWheel(core, { config: { segments: [] } }), TypeError);
  });

  it('rejette un segment sans poids exploitable', () => {
    const bad = (segments) =>
      assert.throws(() => drawWheel(makeCore(), { config: { segments } }), TypeError);

    bad([{ id: 's1' }]); // no weight
    bad([{ id: 's1', weight: '1' }]); // weight is a string
    bad([{ id: 's1', weight: -1 }]); // negative weight
    bad([{ id: 's1', weight: NaN }]); // not finite
  });

  it('ne mute pas la configuration injectée', () => {
    const before = JSON.stringify(CONFIG);
    drawWheel(makeCore(), { config: CONFIG });
    assert.equal(JSON.stringify(CONFIG), before, 'config ne doit pas être muté');
  });
});