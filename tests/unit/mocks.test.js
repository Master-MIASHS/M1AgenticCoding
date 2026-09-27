// Unit tests - development mocks (src/mocks/*)
// The mocks feed G3/G4 screens before real integration. They must stay
// coherent: valid shapes, business invariants respected (bestBalance >=
// balance, ranked and sorted leaderboard, positive prices).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { playerMock } from '../../src/mocks/player.mock.js';
import { gamesMock } from '../../src/mocks/games.mock.js';
import { leaderboardMock } from '../../src/mocks/leaderboard.mock.js';
import { statsMock } from '../../src/mocks/stats.mock.js';
import { shopMock } from '../../src/mocks/shop.mock.js';

test('playerMock matches the documented player shape', () => {
  assert.equal(typeof playerMock.pseudo, 'string');
  assert.ok(playerMock.pseudo.length > 0);
  assert.equal(typeof playerMock.birthDate, 'string');
  assert.equal(typeof playerMock.balance, 'number');
  assert.equal(typeof playerMock.bestBalance, 'number');
  assert.equal(typeof playerMock.xp, 'number');
  assert.equal(typeof playerMock.level, 'number');
  assert.ok(Array.isArray(playerMock.unlockedGames));
  assert.ok(playerMock.unlockedGames.every((id) => typeof id === 'string'));
  assert.ok(['player', 'admin'].includes(playerMock.role));
});

test('playerMock respects the business invariants', () => {
  assert.ok(
    playerMock.bestBalance >= playerMock.balance,
    'bestBalance must never be below balance',
  );
  assert.ok(playerMock.level >= 1);
  assert.ok(playerMock.xp >= 0);
  assert.ok(playerMock.balance >= 0);
});

test('gamesMock has unique ids and { id, name, unlocked } shape', () => {
  assert.ok(Array.isArray(gamesMock));
  const ids = gamesMock.map((game) => game.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const game of gamesMock) {
    assert.equal(typeof game.id, 'string');
    assert.equal(typeof game.name, 'string');
    assert.equal(typeof game.unlocked, 'boolean');
  }
});

test('leaderboardMock is ranked from 1 and sorted by balance desc', () => {
  assert.ok(Array.isArray(leaderboardMock));
  assert.ok(leaderboardMock.length > 0);
  leaderboardMock.forEach((entry, index) => {
    assert.equal(entry.rank, index + 1, 'ranks must be 1..n without gap');
    assert.equal(typeof entry.pseudo, 'string');
    assert.equal(typeof entry.balance, 'number');
    assert.equal(typeof entry.level, 'number');
  });
  for (let i = 1; i < leaderboardMock.length; i += 1) {
    assert.ok(
      leaderboardMock[i - 1].balance >= leaderboardMock[i].balance,
      'leaderboard mock must be sorted by best balance descending',
    );
  }
});

test('statsMock has non-negative counters and a favorite game', () => {
  assert.ok(statsMock.totalPlays >= 0);
  assert.ok(statsMock.totalWagered >= 0);
  assert.ok(statsMock.totalWon >= 0);
  assert.equal(typeof statsMock.favoriteGame, 'string');
});

test('shopMock items have unique ids and positive prices', () => {
  assert.ok(Array.isArray(shopMock.items));
  const ids = shopMock.items.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const item of shopMock.items) {
    assert.equal(typeof item.name, 'string');
    assert.equal(typeof item.price, 'number');
    assert.ok(item.price > 0, `price must be positive: ${item.id}`);
  }
});
