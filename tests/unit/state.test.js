// Unit tests - Core state (src/core/state.js)
// Verifies the documented default state shape, the business invariants it
// must respect, and the isolation of the returned object (callers must not
// be able to corrupt the Core state by mutating the result).

import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getState, STORAGE_KEY } from '../../src/core/state.js';
import { getState as getPublicState } from '../../src/core/core.js';

test('STORAGE_KEY is the documented main key', () => {
  assert.equal(STORAGE_KEY, 'casino_state');
});

test('getState returns the documented default shape', () => {
  const state = getState();
  assert.equal(state.balance, 1000);
  assert.equal(state.bestBalance, 1000);
  assert.equal(state.xp, 0);
  assert.equal(state.level, 1);
  assert.deepEqual(state.unlockedGames, ['slots', 'dice']);
  assert.deepEqual(state.history, []);
  assert.equal(state.role, 'player');
});

test('default state respects the business invariants', () => {
  const state = getState();
  assert.ok(
    state.bestBalance >= state.balance,
    'bestBalance must never be below balance',
  );
  assert.ok(state.level >= 1, 'level must never be below 1');
  assert.ok(state.xp >= 0, 'xp must never be negative');
  assert.ok(state.balance >= 0, 'balance must not be negative');
  assert.ok(state.unlockedGames.length > 0, 'a new player always has at least one game');
});

test('slots and dice are unlocked at start (AGENTS.md: "Départ")', () => {
  const state = getState();
  assert.ok(state.unlockedGames.includes('slots'));
  assert.ok(state.unlockedGames.includes('dice'));
});

test('getState returns a fresh copy (isolation)', () => {
  const first = getState();
  first.balance = 0;
  first.unlockedGames.push('poker');
  first.history.push({ gameId: 'slots' });

  const second = getState();
  assert.equal(second.balance, 1000);
  assert.deepEqual(second.unlockedGames, ['slots', 'dice']);
  assert.deepEqual(second.history, []);
});

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
