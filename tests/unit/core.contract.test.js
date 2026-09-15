// Minimal smoke test: validates that the public Core contract (exposed via
// coreService) is intact. This is an architecture test, not a business test.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../src/services/coreService.js';

const EXPECTED_API = [
  'getState',
  'roll',
  'play',
  'getBalance',
  'claimDailyBonus',
  'requestLoan',
  'addXP',
  'getLevel',
  'getUnlockedGames',
  'getLeaderboard',
  'getHistory',
  'setGameConfig',
  'getGlobalStats',
  'exportSave',
  'importSave',
];

test('coreService exposes the full public contract', () => {
  for (const fn of EXPECTED_API) {
    assert.equal(typeof coreService[fn], 'function', `missing export: ${fn}`);
  }
});

test('getState returns the documented state shape', () => {
  const state = coreService.getState();
  assert.equal(typeof state.balance, 'number');
  assert.equal(typeof state.bestBalance, 'number');
  assert.equal(typeof state.xp, 'number');
  assert.equal(typeof state.level, 'number');
  assert.ok(Array.isArray(state.unlockedGames));
  assert.ok(Array.isArray(state.history));
  assert.equal(typeof state.role, 'string');
});

test('roll returns a raw random result (no win/loss decision)', () => {
  const r = coreService.roll('slots', {});
  assert.equal(r.gameId, 'slots');
  assert.equal(typeof r.value, 'number');
  assert.ok(r.value >= 0 && r.value < 1);
});

test('exportSave / importSave round-trip and reject tampered saves', () => {
  const save = coreService.exportSave();
  const loaded = coreService.importSave(save);
  assert.equal(typeof loaded.balance, 'number');

  const parsed = JSON.parse(save);
  parsed.hash = 'deadbeef'; // tamper with the integrity hash
  const corrupted = JSON.stringify(parsed);
  assert.throws(() => coreService.importSave(corrupted));
});