import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateXPForNextLevel } from '../../src/core/nextLevel.js';

describe('Seuil total XP du prochain niveau (#249)', () => {
  for (const [level, expected] of [[1, 100], [2, 250], [3, 500], [4, 1000]]) {
    it(`renvoie le seuil total suivant le niveau ${level}`, () => {
      assert.equal(calculateXPForNextLevel(level), expected);
    });
  }

  it('renvoie null au niveau maximal et au-delà sans rétrograder les acquis', () => {
    for (const level of [5, 8, Number.MAX_SAFE_INTEGER]) {
      assert.equal(calculateXPForNextLevel(level), null);
    }
  });

  it('conserve un niveau acquis malgré un changement de courbe', () => {
    assert.equal(calculateXPForNextLevel(3, [0, 1000, 2000, 3000]), 3000);
  });

  it('utilise les seuils personnalisés sans arrondir leurs fractions', () => {
    assert.equal(calculateXPForNextLevel(1, [0, 2.5, 7.125]), 2.5);
    assert.equal(calculateXPForNextLevel(2, [0, 2.5, 7.125]), 7.125);
  });

  it('accepte une configuration à un seul niveau', () => {
    assert.equal(calculateXPForNextLevel(1, [0]), null);
  });

  it('ne modifie pas une configuration gelée', () => {
    const thresholds = Object.freeze([0, 10, 20]);
    assert.equal(calculateXPForNextLevel(1, thresholds), 10);
    assert.deepEqual(thresholds, [0, 10, 20]);
  });

  it('utilise la configuration fournie à chaque appel sans cache', () => {
    assert.equal(calculateXPForNextLevel(2, [0, 10, 20]), 20);
    assert.equal(calculateXPForNextLevel(2, [0, 100, 250]), 250);
  });

  it('refuse les niveaux qui ne sont pas des entiers sûrs positifs', () => {
    for (const level of [undefined, null, '2', true, 0, -1, 1.5, NaN,
      Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => calculateXPForNextLevel(level), RangeError);
    }
  });

  it('refuse les configurations non tableaux, vides ou ne commençant pas à zéro', () => {
    for (const thresholds of [null, {}, 'config', [], [1], [null], ['0']]) {
      assert.throws(() => calculateXPForNextLevel(1, thresholds), RangeError);
    }
  });

  it('refuse les seuils invalides, non finis ou non strictement croissants', () => {
    const sparseThresholds = new Array(3);
    sparseThresholds[0] = 0;
    sparseThresholds[2] = 20;
    for (const thresholds of [[0, -1], [0, 10, 10], [0, 20, 10], [0, NaN],
      [0, Infinity], [0, '10'], [0, null], [0, undefined], [0, true], sparseThresholds]) {
      assert.throws(() => calculateXPForNextLevel(1, thresholds), RangeError);
    }
  });

  it('valide toute la courbe même au dernier niveau ou au-delà', () => {
    assert.throws(() => calculateXPForNextLevel(8, [0, 100, NaN]), RangeError);
    assert.throws(() => calculateXPForNextLevel(1, [0, 100, 50]), RangeError);
  });
});
