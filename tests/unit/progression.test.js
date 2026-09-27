// Unit tests - Core progression (src/core/progression.js)
// Verifies the XP / level contract, the invariants "XP and level never
// decrease", and that unlocked games are always valid game ids.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  addXP,
  getLevel,
  getUnlockedGames,
  getLeaderboard,
  getHistory,
} from '../../src/core/progression.js';
import { getState } from '../../src/core/state.js';
import { GAMES } from '../../src/core/config/games.config.js';

test('addXP returns { xp, level } and grants the requested amount', () => {
  const { xp, level } = getState();
  const result = addXP(25);
  assert.equal(result.xp, xp + 25);
  assert.equal(result.level, level);
});

test('addXP never decreases XP', () => {
  const { xp } = getState();
  for (const amount of [0, 1, 100]) {
    assert.ok(addXP(amount).xp >= xp, `xp must never decrease for addXP(${amount})`);
  }
});

test('addXP never decreases the level', () => {
  const { level } = getState();
  assert.ok(addXP(10000).level >= level, 'level must never decrease');
});

test('getLevel is consistent with the global state', () => {
  assert.equal(getLevel(), getState().level);
});

test('getUnlockedGames returns only valid game ids', () => {
  const unlocked = getUnlockedGames();
  assert.ok(Array.isArray(unlocked));
  const known = new Set(Object.keys(GAMES));
  for (const id of unlocked) {
    assert.ok(known.has(id), `unknown game id in unlockedGames: ${id}`);
  }
});

test('getUnlockedGames returns a copy (isolation)', () => {
  const first = getUnlockedGames();
  first.push('poker');
  const second = getUnlockedGames();
  assert.ok(!second.includes('poker'), 'mutating the returned list must not leak');
});

test('getLeaderboard returns entries shaped { pseudo, balance, level } sorted desc', () => {
  const board = getLeaderboard();
  assert.ok(Array.isArray(board));
  board.forEach((entry) => {
    assert.equal(typeof entry.pseudo, 'string');
    assert.equal(typeof entry.balance, 'number');
    assert.equal(typeof entry.level, 'number');
  });
  for (let i = 1; i < board.length; i += 1) {
    assert.ok(
      board[i - 1].balance >= board[i].balance,
      'leaderboard must be sorted by best balance descending',
    );
  }
});

test('getHistory returns an array', () => {
  assert.ok(Array.isArray(getHistory()));
});
