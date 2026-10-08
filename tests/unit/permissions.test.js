import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ROLES,
  assertCanModifyConfig,
  hasMinimumRole,
} from '../../src/core/permissions.js';
import { setGameConfig } from '../../src/services/coreService.js';
import { getGameConfig } from '../../src/core/config/games.config.js';
import { getState, restoreState } from '../../src/core/state.js';

describe('permissions cumulatives du Core', () => {
  it('accorde les permissions cumulatives aux trois rôles', () => {
    assert.equal(hasMinimumRole(ROLES.PLAYER, ROLES.PLAYER), true);
    assert.equal(hasMinimumRole(ROLES.PLAYER, ROLES.MODERATOR), false);
    assert.equal(hasMinimumRole(ROLES.PLAYER, ROLES.ADMIN), false);

    assert.equal(hasMinimumRole(ROLES.MODERATOR, ROLES.PLAYER), true);
    assert.equal(hasMinimumRole(ROLES.MODERATOR, ROLES.MODERATOR), true);
    assert.equal(hasMinimumRole(ROLES.MODERATOR, ROLES.ADMIN), false);

    assert.equal(hasMinimumRole(ROLES.ADMIN, ROLES.PLAYER), true);
    assert.equal(hasMinimumRole(ROLES.ADMIN, ROLES.MODERATOR), true);
    assert.equal(hasMinimumRole(ROLES.ADMIN, ROLES.ADMIN), true);
  });

  it('rejette les rôles inconnus', () => {
    for (const role of ['superadmin', '', null, undefined, 1]) {
      assert.throws(() => hasMinimumRole(role, ROLES.PLAYER), TypeError);
      assert.throws(() => hasMinimumRole(ROLES.ADMIN, role), TypeError);
    }
  });

  it('autorise un administrateur à modifier la configuration', () => {
    assert.equal(assertCanModifyConfig(ROLES.ADMIN), undefined);
  });

  it('refuse la modification de configuration aux autres rôles', () => {
    for (const role of [ROLES.PLAYER, ROLES.MODERATOR]) {
      assert.throws(() => assertCanModifyConfig(role), /permission refusée/);
    }
  });

  it('expose les rôles sous forme de constantes immuables', () => {
    assert.equal(Object.isFrozen(ROLES), true);
    assert.throws(() => {
      ROLES.ADMIN = 'superadmin';
    }, TypeError);
  });
});

describe('protection de la configuration publique du Core', () => {
  it('refuse un joueur sans modifier la configuration', () => {
    const originalState = getState();
    const before = getGameConfig('roulette');
    try {
      restoreState({ ...originalState, role: ROLES.PLAYER });
      assert.throws(
        () => setGameConfig('roulette', { probabilities: { red: 0.5 } }),
        /permission refusée/
      );
      assert.deepEqual(getGameConfig('roulette'), before);
    } finally {
      restoreState(originalState);
    }
  });

  it('autorise un administrateur et lit le rôle depuis l’état du Core', () => {
    const originalState = getState();
    const before = getGameConfig('roulette');
    try {
      restoreState({ ...originalState, role: ROLES.ADMIN });
      assert.deepEqual(
        setGameConfig('roulette', { probabilities: { red: 0.5 }, multipliers: { red: 2 } }),
        { ok: true, gameId: 'roulette' }
      );
      assert.deepEqual(getGameConfig('roulette'), {
        probabilities: { red: 0.5 },
        multipliers: { red: 2 },
      });
    } finally {
      restoreState({ ...originalState, role: ROLES.ADMIN });
      setGameConfig('roulette', before);
      restoreState(originalState);
    }
  });
});
