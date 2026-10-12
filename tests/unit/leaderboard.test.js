// Tests unitaires du classement (Groupe 1, #327) : calcul pur à partir des
// états des joueurs.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { entreeDeClassement, calculerClassement } from '../../src/core/leaderboard.js';

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
  it('garde le pseudo, le meilleur solde, le solde, le niveau et les badges', () => {
    assert.deepStrictEqual(entreeDeClassement(etat()), {
      pseudo: 'Olti',
      bestBalance: 1250,
      balance: 800,
      level: 3,
      badges: [],
    });
  });

  it('liste seulement les badges obtenus, avec leur id et leur nom (#273)', () => {
    const entree = entreeDeClassement(etat({ faillites: 5 }));
    assert.deepStrictEqual(entree.badges, [{ id: 'faillites-5', nom: 'A survécu à la faillite 5 fois' }]);
  });

  it('compte les parties de l’historique pour le badge des 1000 parties', () => {
    const history = Array.from({ length: 1000 }, (_, i) => ({ gameId: 'slots', roundId: `r${i}` }));
    const entree = entreeDeClassement(etat({ history }));
    assert.deepStrictEqual(entree.badges.map((badge) => badge.id), ['parties-1000']);
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

describe('calculerClassement', () => {
  it('classe par meilleur solde décroissant, le score d’AGENTS.md', () => {
    const classement = calculerClassement([
      etat({ pseudo: 'A', bestBalance: 900, balance: 900 }),
      etat({ pseudo: 'B', bestBalance: 2000, balance: 10 }),
      etat({ pseudo: 'C', bestBalance: 1500, balance: 1500 }),
    ]);
    assert.deepStrictEqual(classement.map((e) => e.pseudo), ['B', 'C', 'A']);
  });

  it('départage par niveau, puis par pseudo', () => {
    const classement = calculerClassement([
      etat({ pseudo: 'Zoé', level: 2 }),
      etat({ pseudo: 'Bob', level: 5 }),
      etat({ pseudo: 'Ana', level: 2 }),
    ]);
    assert.deepStrictEqual(classement.map((e) => e.pseudo), ['Bob', 'Ana', 'Zoé']);
  });

  it('renvoie une liste vide sans profil', () => {
    assert.deepStrictEqual(calculerClassement([]), []);
  });

  it('ne modifie pas les états reçus', () => {
    const profils = [etat({ pseudo: 'A', bestBalance: 1 }), etat({ pseudo: 'B', bestBalance: 2 })];
    const copie = structuredClone(profils);
    calculerClassement(profils);
    assert.deepStrictEqual(profils, copie);
  });

  it('refuse une liste invalide', () => {
    assert.throws(() => calculerClassement(null), Error);
    assert.throws(() => calculerClassement([etat(), null]), Error);
  });
});
