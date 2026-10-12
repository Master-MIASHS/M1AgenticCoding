// Tests du classement exposé par la façade du Core (Groupe 1, #327) : calculé
// sur l'état réel du joueur, plus de joueurs fictifs.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../src/services/coreService.js';
import { updateState } from '../../src/core/state.js';

describe('classement via coreService (vrai état du Core)', () => {
  it('ne renvoie plus les joueurs fictifs alice et bob', () => {
    const pseudos = coreService.getLeaderboard().map((entree) => entree.pseudo);
    assert.ok(!pseudos.includes('alice') && !pseudos.includes('bob'), pseudos.join(', '));
  });

  it('contient le joueur courant, avec son meilleur solde et son niveau', () => {
    const { bestBalance, balance, level } = coreService.getState();
    assert.deepStrictEqual(coreService.getLeaderboard(), [
      { pseudo: null, bestBalance, balance, level, badges: [] },
    ]);
  });

  it('reflète l’état après une écriture', () => {
    updateState((etat) => ({ ...etat, pseudo: 'Olti', balance: 300, bestBalance: 1500, xp: 120, level: 2 }));
    assert.deepStrictEqual(coreService.getLeaderboard(), [
      { pseudo: 'Olti', bestBalance: 1500, balance: 300, level: 2, badges: [] },
    ]);
  });

  it('renvoie des copies : modifier le classement ne touche pas l’état', () => {
    coreService.getLeaderboard()[0].bestBalance = 0;
    assert.strictEqual(coreService.getState().bestBalance, 1500);
  });
});
