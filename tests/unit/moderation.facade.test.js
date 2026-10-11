// Modération via la façade du Core (Groupe 1, #352) : un compte désactivé ne
// peut plus jouer, acheter ni réclamer le bonus ; il peut toujours lire.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../src/services/coreService.js';
import { updateState } from '../../src/core/state.js';

const PARTIE = { outcome: 'win', multiplier: 2, details: {} };

describe('modération via coreService', () => {
  it('expose setPlayerStatus et refuse un joueur', () => {
    assert.strictEqual(typeof coreService.setPlayerStatus, 'function');
    assert.throws(() => coreService.setPlayerStatus('banned'), /permission/);
    assert.notStrictEqual(coreService.getState().isBanned, true);
  });

  it('désactive le compte courant (admin)', () => {
    updateState((etat) => ({ ...etat, role: 'admin' }));
    assert.strictEqual(coreService.setPlayerStatus('banned'), 'banned');
    assert.strictEqual(coreService.getState().isBanned, true);
  });

  it('refuse les parties, les achats et le bonus d’un compte désactivé, sans écriture', () => {
    const avant = coreService.getState();
    assert.throws(() => coreService.play('slots', 10, PARTIE), /désactivé/);
    assert.throws(() => coreService.purchaseShopItem('avatar_chapeau'), /désactivé/);
    assert.throws(() => coreService.claimDailyBonus(), /désactivé/);
    assert.deepStrictEqual(coreService.getState(), avant);
  });

  it('laisse lire le solde, le classement et l’historique', () => {
    assert.strictEqual(typeof coreService.getBalance(), 'number');
    assert.ok(Array.isArray(coreService.getLeaderboard()));
    assert.ok(Array.isArray(coreService.getHistory()));
  });

  it('réactive le compte : les actions sont de nouveau possibles', () => {
    assert.strictEqual(coreService.setPlayerStatus('active'), 'active');
    assert.doesNotThrow(() => coreService.claimDailyBonus());
    assert.doesNotThrow(() => coreService.play('slots', 10, PARTIE));
  });
});
