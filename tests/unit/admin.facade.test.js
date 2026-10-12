// Tests de l'administration exposée par la façade du Core (#322) : rôle lu
// dans l'état du Core, bascule admin refusée hors du mode dev, aucune option
// injectable (leçon de #227).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../src/services/coreService.js';
import { updateState } from '../../src/core/state.js';

describe('administration via coreService', () => {
  it('expose l’ajustement du solde et la bascule admin', () => {
    assert.strictEqual(typeof coreService.updatePlayerBalance, 'function');
    assert.strictEqual(typeof coreService.activerRoleAdminDev, 'function');
  });

  it('refuse la bascule admin hors du mode dev (Node), sans rien modifier', () => {
    assert.throws(() => coreService.activerRoleAdminDev(), /mode développement/);
    assert.strictEqual(coreService.getState().role, 'player');
  });

  it('refuse l’ajustement à un joueur, sans rien modifier', () => {
    const avant = coreService.getState();
    assert.throws(() => coreService.updatePlayerBalance(100), /permission/);
    assert.deepStrictEqual(coreService.getState(), avant);
  });

  it('refuse un identifiant de joueur en premier argument (profils multiples pas encore faits)', () => {
    assert.throws(() => coreService.updatePlayerBalance('u1', 100), TypeError);
  });

  it('ajuste le solde d’un admin et le trace dans l’historique', () => {
    updateState((etat) => ({ ...etat, role: 'admin' }));
    const avant = coreService.getState();
    const entree = coreService.updatePlayerBalance(-200);

    assert.strictEqual(entree.type, 'ADMIN_ADJUSTMENT');
    assert.strictEqual(entree.balanceAfter, avant.balance - 200);
    const apres = coreService.getState();
    assert.strictEqual(apres.balance, avant.balance - 200);
    assert.strictEqual(apres.bestBalance, avant.bestBalance);
    assert.deepStrictEqual(apres.history.at(-1), entree);
    assert.strictEqual(coreService.getGlobalStats().totalPlays, 0);
  });

  it('refuse un retrait plus grand que le solde', () => {
    const avant = coreService.getState();
    assert.throws(() => coreService.updatePlayerBalance(-(avant.balance + 1)), RangeError);
    assert.deepStrictEqual(coreService.getState(), avant);
  });
});
