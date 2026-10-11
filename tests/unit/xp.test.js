import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateXPGained } from '../../src/core/xp.js';
import { XP_GAIN_CONFIG, TEMPORARY_LEVEL_THRESHOLDS } from '../../src/core/config/progression.config.js';

describe('Gain XP pur par partie (#247)', () => {
  it('lit la base par défaut dans la configuration', () => {
    assert.equal(XP_GAIN_CONFIG.baseXP, 10);
    assert.equal(calculateXPGained({ completed: true }), XP_GAIN_CONFIG.baseXP);
    assert.ok(Object.isFrozen(XP_GAIN_CONFIG));
    assert.deepEqual(TEMPORARY_LEVEL_THRESHOLDS, [0, 100, 250, 500, 1000]);
  });

  for (const outcome of ['win', 'loss', 'push']) {
    it(`attribue la même base pour ${outcome}, sans dépendre des montants`, () => {
      assert.equal(calculateXPGained({ completed: true, outcome, bet: 500, netGain: -500 }), 10);
    });
  }

  it('utilise une base personnalisée et un bonus sans arrondi', () => {
    assert.equal(calculateXPGained({ completed: true, baseXP: 2.5, xpMultiplier: 1.25 }), 3.125);
  });

  it('utilise le multiplicateur fourni à chaque appel', () => {
    assert.equal(calculateXPGained({ completed: true, xpMultiplier: 2 }), 20);
    assert.equal(calculateXPGained({ completed: true, xpMultiplier: 1 }), 10);
  });

  it('retourne zéro pour une partie non éligible, même avec bonus', () => {
    assert.equal(calculateXPGained({ completed: false, xpMultiplier: 3 }), 0);
  });

  it('accepte une base nulle sans augmenter la progression', () => {
    assert.equal(calculateXPGained({ completed: true, baseXP: 0, xpMultiplier: 2 }), 0);
  });

  it('ne modifie pas les données et ne cumule rien entre appels', () => {
    const input = Object.freeze({ completed: true, baseXP: 2.5, xpMultiplier: 2 });
    assert.equal(calculateXPGained(input), 5);
    assert.equal(calculateXPGained(input), 5);
    assert.deepEqual(input, { completed: true, baseXP: 2.5, xpMultiplier: 2 });
  });

  it('refuse une entrée absente ou non objet', () => {
    for (const value of [undefined, null, [], 0, true, 'input']) {
      assert.throws(() => calculateXPGained(value), TypeError);
    }
  });

  it('exige une éligibilité booléenne explicite', () => {
    for (const completed of [undefined, null, 0, 1, 'true', {}, []]) {
      assert.throws(() => calculateXPGained({ completed }), TypeError);
    }
  });

  for (const field of ['baseXP', 'xpMultiplier']) {
    it(`refuse ${field} non numérique ou non fini sans coercition`, () => {
      for (const value of [null, '10', NaN, Infinity, -Infinity, true, 10n]) {
        assert.throws(() => calculateXPGained({ completed: true, [field]: value }), TypeError);
      }
    });
  }

  it('refuse une base négative et un multiplicateur nul ou négatif', () => {
    assert.throws(() => calculateXPGained({ completed: true, baseXP: -1 }), RangeError);
    for (const xpMultiplier of [0, -1]) {
      assert.throws(() => calculateXPGained({ completed: true, xpMultiplier }), RangeError);
    }
  });

  it('valide aussi les paramètres des parties non éligibles', () => {
    assert.throws(() => calculateXPGained({ completed: false, baseXP: NaN }), TypeError);
    assert.throws(() => calculateXPGained({ completed: false, xpMultiplier: 0 }), RangeError);
  });

  it('refuse un produit non fini sans imposer de borne aux fractions', () => {
    assert.throws(() => calculateXPGained({ completed: true, baseXP: Number.MAX_VALUE, xpMultiplier: 2 }), RangeError);
    assert.equal(calculateXPGained({ completed: true, baseXP: Number.MAX_VALUE }), Number.MAX_VALUE);
  });
});
