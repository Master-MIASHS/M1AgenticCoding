// Tests unitaires de la création du profil dans l'état (Groupe 1, #226).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { creerProfil } from '../../src/core/player.js';

const MAINTENANT = new Date('2026-10-06T12:00:00Z');

/**
 * Faux stockage qui imite updateState (#139) et compte les écritures.
 * @param {object} [changements] - Champs de l'état de départ à remplacer.
 * @returns {{ getState: function(): object, updateState: function(function(object): object): object,
 *   ecritures: function(): number }} Stockage de test.
 */
function fauxStockage(changements = {}) {
  let etat = {
    balance: 1000,
    bestBalance: 1000,
    xp: 0,
    level: 1,
    unlockedGames: ['slots', 'dice'],
    history: [],
    role: 'player',
    ...changements,
  };
  let ecritures = 0;
  return {
    getState: () => structuredClone(etat),
    updateState: (calcul) => {
      etat = structuredClone(calcul(structuredClone(etat)));
      ecritures += 1;
      return structuredClone(etat);
    },
    ecritures: () => ecritures,
  };
}

describe('creerProfil : partie neuve', () => {
  it('enregistre le joueur en une seule écriture et renvoie l’état', () => {
    const stockage = fauxStockage();
    const etat = creerProfil(
      { pseudo: '  alice ', dateNaissance: '2000-05-17' },
      { stockage, maintenant: MAINTENANT },
    );
    assert.strictEqual(stockage.ecritures(), 1);
    assert.strictEqual(etat.pseudo, 'alice');
    assert.strictEqual(etat.birthDate, '2000-05-17');
    assert.strictEqual(etat.balance, 1000);
    assert.strictEqual(etat.bestBalance, 1000);
    assert.deepStrictEqual(etat.history, []);
    assert.deepStrictEqual(stockage.getState(), etat);
  });

  it('utilise le capital de la config fournie', () => {
    const stockage = fauxStockage();
    const etat = creerProfil({ pseudo: 'bob' }, { stockage, config: { capitalDeDepart: 2500 } });
    assert.strictEqual(etat.balance, 2500);
    assert.strictEqual(etat.bestBalance, 2500);
    assert.strictEqual(etat.birthDate, null);
  });

  it('propage une erreur de validation du joueur, sans écriture', () => {
    const stockage = fauxStockage();
    assert.throws(() => creerProfil({ pseudo: '   ' }, { stockage }), /pseudo/);
    assert.strictEqual(stockage.ecritures(), 0);
  });
});
