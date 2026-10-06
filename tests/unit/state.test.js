import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getState } from '../../src/core/state.js';
import { getState as getPublicState } from '../../src/core/core.js';

describe('lecture de l’état du Core', () => {
  it('expose la même fonction de lecture par l’API publique', () => {
    assert.strictEqual(getPublicState, getState);
  });

  it('empêche un appelant de modifier les valeurs des lectures suivantes', () => {
    const expected = getState();
    const snapshot = getState();

    snapshot.balance = 0;
    snapshot.xp = 999;
    snapshot.role = 'admin';

    const next = getState();
    assert.strictEqual(next.balance, expected.balance);
    assert.strictEqual(next.xp, expected.xp);
    assert.strictEqual(next.role, expected.role);
  });

  it('isole les jeux débloqués et l’historique entre les lectures', () => {
    const expected = getState();
    const snapshot = getState();

    snapshot.unlockedGames.splice(0, snapshot.unlockedGames.length, 'jeu-fictif');
    snapshot.history.push({ gameId: 'jeu-fictif', bet: 10 });

    const next = getState();
    assert.deepStrictEqual(next.unlockedGames, expected.unlockedGames);
    assert.deepStrictEqual(next.history, expected.history);
    assert.deepStrictEqual(expected.unlockedGames, ['slots', 'dice']);
    assert.deepStrictEqual(expected.history, []);
  });
});
