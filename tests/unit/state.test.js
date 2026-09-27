// Unit tests - Core state (src/core/state.js)
// Verifies the documented default state shape, the business invariants it
// must respect, and the isolation of the returned object (callers must not
// be able to corrupt the Core state by mutating the result).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getState, STORAGE_KEY } from '../../src/core/state.js';

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
