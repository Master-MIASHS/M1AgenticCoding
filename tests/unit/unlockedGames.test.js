import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateUnlockedGames } from '../../src/core/unlockedGames.js';
import { createUnlockConfig, createUnlockMemoryStore } from '../../src/core/config/unlock.config.js';

describe('calculateUnlockedGames (#234)', () => {
  it('compare le niveau inférieur, égal et supérieur au seuil', () => {
    assert.deepEqual(calculateUnlockedGames(2, { blackjack: 3 }), []);
    assert.deepEqual(calculateUnlockedGames(3, { blackjack: 3 }), ['blackjack']);
    assert.deepEqual(calculateUnlockedGames(4, { blackjack: 3 }), ['blackjack']);
  });

  it('ajoute tous les jeux accessibles dans l’ordre de la table', () => {
    assert.deepEqual(calculateUnlockedGames(4, { slots: 1, poker: 12, blackjack: 3 }), ['slots', 'blackjack']);
  });

  it('conserve les acquis après hausse du seuil', () => {
    assert.deepEqual(calculateUnlockedGames(3, { blackjack: 8 }, ['blackjack']), ['blackjack']);
  });

  it('conserve aussi les acquis absents de la table', () => {
    assert.deepEqual(calculateUnlockedGames(1, {}, ['ancien-jeu']), ['ancien-jeu']);
  });

  it('déduplique les acquis et les nouveaux en gardant l’ordre des acquis', () => {
    assert.deepEqual(calculateUnlockedGames(3, { slots: 1, dice: 1, blackjack: 3 }, ['dice', 'dice', 'slots']), ['dice', 'slots', 'blackjack']);
  });

  it('renvoie un tableau vide indépendant sans jeu accessible', () => {
    const acquired = [];
    const result = calculateUnlockedGames(1, {}, acquired);
    assert.deepEqual(result, []);
    assert.notEqual(result, acquired);
  });

  it('ne modifie pas les entrées gelées et isole le retour', () => {
    const levels = Object.freeze({ slots: 1, blackjack: 3 });
    const acquired = Object.freeze(['slots']);
    const result = calculateUnlockedGames(3, levels, acquired);
    result.push('ajout-externe');
    assert.deepEqual(acquired, ['slots']);
    assert.deepEqual(levels, { slots: 1, blackjack: 3 });
    assert.deepEqual(calculateUnlockedGames(3, levels, acquired), ['slots', 'blackjack']);
  });

  it('reste idempotent quand on réinjecte le résultat', () => {
    const levels = { slots: 1, dice: 1 };
    const first = calculateUnlockedGames(1, levels);
    assert.deepEqual(calculateUnlockedGames(1, levels, first), first);
  });

  it('accepte une table sans prototype et un seuil supérieur à la courbe XP', () => {
    const levels = Object.assign(Object.create(null), { poker: 12 });
    assert.deepEqual(calculateUnlockedGames(12, levels), ['poker']);
  });

  it('rejette les niveaux invalides sans coercition', () => {
    for (const level of [0, -1, 1.5, NaN, Infinity, '3', null, undefined, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => calculateUnlockedGames(level, {}), RangeError);
    }
  });

  it('rejette les tables qui ne sont pas des objets de niveaux', () => {
    for (const levels of [null, undefined, [], 'table', 1, new Date(), new Map()]) {
      assert.throws(() => calculateUnlockedGames(1, levels), TypeError);
    }
  });

  it('valide tous les seuils même si le jeu est déjà acquis', () => {
    for (const threshold of [0, -1, 1.5, NaN, Infinity, '3', null, undefined, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => calculateUnlockedGames(1, { slots: threshold }, ['slots']), RangeError);
    }
  });

  it('rejette les acquis non tableaux, non chaînes ou creux', () => {
    for (const acquired of [null, {}, 'slots', [42], [null], [undefined], new Array(1)]) {
      assert.throws(() => calculateUnlockedGames(1, {}, acquired), TypeError);
    }
  });

  it('consomme les seuils réels d’Ania et conserve un jeu après hausse administrative', () => {
    const config = createUnlockConfig(createUnlockMemoryStore());
    config.setUnlockLevel('poker', 2);
    const acquired = calculateUnlockedGames(2, config.getUnlockLevels());
    assert.ok(acquired.includes('poker'));
    config.setUnlockLevel('poker', 12);
    assert.ok(calculateUnlockedGames(2, config.getUnlockLevels(), acquired).includes('poker'));
    assert.ok(!calculateUnlockedGames(2, config.getUnlockLevels()).includes('poker'));
  });
});
