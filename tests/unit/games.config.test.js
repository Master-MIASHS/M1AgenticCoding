// Unit tests - Core games configuration (src/core/config/games.config.js)
// Verifies the canonical game list shape, the runtime config store contract
// (set/get, defaults) and the global stats shape.
//
// NOTE: the registry is expected to hold the 13 games of AGENTS.md. The
// current Core config only holds 10 (memory, quiz, bingo missing) - tracked
// as a G1 follow-up, so the count is NOT asserted here.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  GAMES,
  setGameConfig,
  getGameConfig,
  getGlobalStats,
} from '../../src/core/config/games.config.js';

test('GAMES is a non-empty map of unique game ids', () => {
  const ids = Object.keys(GAMES);
  assert.ok(ids.length > 0);
  assert.equal(new Set(ids).size, ids.length, 'game ids must be unique');
});

test('every game has { id, name, unlockLevel } with a valid unlock level', () => {
  for (const [key, game] of Object.entries(GAMES)) {
    assert.equal(game.id, key, `game id must match its key (${key})`);
    assert.equal(typeof game.name, 'string');
    assert.ok(game.name.length > 0);
    assert.ok(
      Number.isInteger(game.unlockLevel),
      `${key}: unlockLevel must be an integer`,
    );
    assert.ok(game.unlockLevel >= 1, `${key}: unlockLevel must be >= 1`);
  }
});

test('slots and dice are available at start (unlockLevel 1)', () => {
  assert.equal(GAMES.slots.unlockLevel, 1);
  assert.equal(GAMES.dice.unlockLevel, 1);
});

test('setGameConfig / getGameConfig round-trip probabilities and multipliers', () => {
  const config = {
    probabilities: { jackpot: 0.01 },
    multipliers: { jackpot: 50 },
  };
  const result = setGameConfig('slots', config);
  assert.deepEqual(result, { ok: true, gameId: 'slots' });
  assert.deepEqual(getGameConfig('slots'), config);
});

test('getGameConfig returns empty defaults for an unknown game', () => {
  assert.deepEqual(getGameConfig('unknown-game'), { probabilities: {}, multipliers: {} });
});

test('setGameConfig fills missing sections with empty defaults', () => {
  setGameConfig('dice', { probabilities: { six: 0.16 } });
  const config = getGameConfig('dice');
  assert.deepEqual(config.probabilities, { six: 0.16 });
  assert.deepEqual(config.multipliers, {});
});

test('getGlobalStats returns the documented shape with non-negative numbers', () => {
  const stats = getGlobalStats();
  assert.equal(typeof stats.totalPlays, 'number');
  assert.equal(typeof stats.totalWagered, 'number');
  assert.equal(typeof stats.totalWon, 'number');
  assert.equal(typeof stats.activePlayers, 'number');
  assert.ok(stats.totalPlays >= 0);
  assert.ok(stats.totalWagered >= 0);
  assert.ok(stats.totalWon >= 0);
  assert.ok(stats.activePlayers >= 0);
});
