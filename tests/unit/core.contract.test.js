// Minimal smoke test: validates that the public Core contract (exposed via
// coreService) is intact. This is an architecture test, not a business test.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../src/services/coreService.js';
import { computeIntegrityHash } from '../../src/core/storage.js';

const EXPECTED_API = [
  'getState',
  'roll',
  'choisirAction',
  'play',
  'getBalance',
  'claimDailyBonus',
  'requestLoan',
  'getShopCatalog',
  'getShopInventory',
  'purchaseShopItem',
  'getStartingCapital',
  'setStartingCapital',
  'getEvenementsBonus',
  'getMultiplicateurBonus',
  'lancerEvenementBonus',
  'arreterEvenementBonus',
  'addXP',
  'getLevel',
  'getUnlockedGames',
  'getLeaderboard',
  'getHistory',
  'getBadges',
  'setGameConfig',
  'getGlobalStats',
  'exportSave',
  'importSave',
  'creerProfil',
];

function createSave(data, version = 1) {
  return JSON.stringify({
    version,
    hash: computeIntegrityHash(JSON.stringify(data)),
    data,
  });
}

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

test('importSave rejects invalid JSON, unsupported versions, and invalid state shapes', () => {
  assert.throws(() => coreService.importSave('{invalid json'));

  const save = JSON.parse(coreService.exportSave());
  save.version += 1;
  assert.throws(() => coreService.importSave(JSON.stringify(save)));

  const invalidData = { ...JSON.parse(coreService.exportSave()).data, history: {} };
  const invalidSave = createSave(invalidData);
  const previousState = coreService.getState();
  assert.throws(() => coreService.importSave(invalidSave));
  assert.deepEqual(coreService.getState(), previousState);
});

test('importSave restores the state after validating the save', () => {
  const originalState = coreService.getState();
  const restoredState = {
    ...originalState,
    balance: originalState.balance + 250,
    bestBalance: Math.max(originalState.bestBalance, originalState.balance + 250),
  };
  const save = createSave(restoredState);

  assert.deepEqual(coreService.importSave(save), restoredState);
  assert.deepEqual(coreService.getState(), restoredState);
  assert.deepEqual(coreService.importSave(coreService.exportSave()), restoredState);
});

test('importSave persists state and does not replace memory if persistence fails', async () => {
  const originalState = coreService.getState();
  const originalSave = coreService.exportSave();
  const originalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let storedState = null;
  let failWrite = false;

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem(key) {
        return key === 'casino_state' ? storedState : null;
      },
      setItem(key, value) {
        if (failWrite) {
          throw new Error('storage unavailable');
        }
        assert.equal(key, 'casino_state');
        storedState = value;
      },
    },
  });

  try {
    const restoredState = {
      ...originalState,
      balance: originalState.balance + 500,
      bestBalance: Math.max(originalState.bestBalance, originalState.balance + 500),
    };
    assert.deepEqual(coreService.importSave(createSave(restoredState)), restoredState);
    assert.deepEqual(JSON.parse(storedState), restoredState);

    const reloadedState = await import('../../src/core/state.js?reload-test');
    assert.deepEqual(reloadedState.getState(), restoredState);

    failWrite = true;
    const stateBeforeFailedImport = coreService.getState();
    assert.throws(() => coreService.importSave(createSave({
      ...stateBeforeFailedImport,
      balance: stateBeforeFailedImport.balance + 1,
      bestBalance: Math.max(stateBeforeFailedImport.bestBalance, stateBeforeFailedImport.balance + 1),
    })), /storage unavailable/);
    assert.deepEqual(coreService.getState(), stateBeforeFailedImport);
  } finally {
    failWrite = false;
    coreService.importSave(originalSave);
    if (originalStorageDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalStorageDescriptor);
    } else {
      delete globalThis.localStorage;
    }
  }
});
