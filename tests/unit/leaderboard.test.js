// Tests unitaires du classement (Groupe 1, #327) : calcul pur à partir des
// états des joueurs.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { entreeDeClassement } from '../../src/core/leaderboard.js';

/**
 * État de joueur de test, modifiable.
 * @param {object} [changements] - Champs à remplacer.
 * @returns {object} État de joueur.
 */
function etat(changements = {}) {
  return {
    pseudo: 'Olti',
    balance: 800,
    bestBalance: 1250,
    xp: 300,
    level: 3,
    unlockedGames: ['slots', 'dice'],
    history: [],
    role: 'player',
    ...changements,
  };
}

describe('entreeDeClassement', () => {
  it('garde le pseudo, le meilleur solde, le solde et le niveau', () => {
    assert.deepStrictEqual(entreeDeClassement(etat()), {
      pseudo: 'Olti',
      bestBalance: 1250,
      balance: 800,
      level: 3,
    });
  });

  it('met pseudo à null pour une sauvegarde sans profil', () => {
    const { pseudo, ...sansPseudo } = etat();
    assert.strictEqual(pseudo, 'Olti');
    assert.strictEqual(entreeDeClassement(sansPseudo).pseudo, null);
  });

  it('refuse un état invalide', () => {
    for (const invalide of [null, [], 'Olti', etat({ bestBalance: '1250' }), etat({ level: NaN })]) {
      assert.throws(() => entreeDeClassement(invalide), Error);
    }
  });
});
