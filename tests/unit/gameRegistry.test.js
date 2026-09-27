// Unit tests - game registry (src/config/gameRegistry.js)
// Verifies the application-level registry and, above all, that it stays in
// sync with the Core canonical list (src/core/config/games.config.js): the
// registry mirrors ids and unlock levels by design, so any drift is a bug.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { GAME_REGISTRY, getGameMeta } from '../../src/config/gameRegistry.js';
import { GAMES } from '../../src/core/config/games.config.js';

test('GAME_REGISTRY is a non-empty list of unique ids', () => {
  assert.ok(Array.isArray(GAME_REGISTRY));
  assert.ok(GAME_REGISTRY.length > 0);
  const ids = GAME_REGISTRY.map((game) => game.id);
  assert.equal(new Set(ids).size, ids.length, 'registry ids must be unique');
});

test('every registry entry has { id, name, unlockLevel, category }', () => {
  for (const game of GAME_REGISTRY) {
    assert.equal(typeof game.id, 'string');
    assert.equal(typeof game.name, 'string');
    assert.ok(game.name.length > 0);
    assert.ok(Number.isInteger(game.unlockLevel), `${game.id}: unlockLevel must be an integer`);
    assert.ok(game.unlockLevel >= 1, `${game.id}: unlockLevel must be >= 1`);
    assert.equal(typeof game.category, 'string');
    assert.ok(game.category.length > 0);
  }
});

test('registry and Core GAMES declare the exact same game ids (mirror)', () => {
  const registryIds = GAME_REGISTRY.map((game) => game.id).sort();
  const coreIds = Object.keys(GAMES).sort();
  assert.deepEqual(registryIds, coreIds);
});

test('registry and Core GAMES agree on every unlock level (mirror)', () => {
  for (const game of GAME_REGISTRY) {
    assert.ok(GAMES[game.id], `registry game missing in Core: ${game.id}`);
    assert.equal(game.unlockLevel, GAMES[game.id].unlockLevel, `unlock level drift for ${game.id}`);
  }
});

test('getGameMeta returns the entry for a known id', () => {
  const meta = getGameMeta('slots');
  assert.ok(meta);
  assert.equal(meta.id, 'slots');
  assert.equal(meta.unlockLevel, 1);
});

test('getGameMeta returns undefined for an unknown id', () => {
  assert.equal(getGameMeta('does-not-exist'), undefined);
});
