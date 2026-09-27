// Unit tests - Core storage / save (src/core/storage.js)
// Verifies the integrity-hash contract: deterministic hash, round-trip
// export/import, and rejection of corrupted or tampered saves.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeIntegrityHash, exportSave, importSave } from '../../src/core/storage.js';
import { getState } from '../../src/core/state.js';

test('computeIntegrityHash is deterministic and returns 8-char lowercase hex', () => {
  const a = computeIntegrityHash('payload');
  const b = computeIntegrityHash('payload');
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{8}$/);
});

test('computeIntegrityHash differs for different inputs', () => {
  assert.notEqual(computeIntegrityHash('a'), computeIntegrityHash('b'));
});

test('exportSave produces { version, hash, data } with a valid hash', () => {
  const save = JSON.parse(exportSave());
  assert.equal(save.version, 1);
  assert.equal(typeof save.hash, 'string');
  assert.ok(save.data && typeof save.data === 'object');
  assert.equal(save.hash, computeIntegrityHash(JSON.stringify(save.data)));
});

test('importSave round-trips a save produced by exportSave', () => {
  const loaded = importSave(exportSave());
  assert.deepEqual(loaded, getState());
});

test('importSave rejects a tampered data payload', () => {
  const save = JSON.parse(exportSave());
  save.data.balance = 999999; // cheat attempt
  assert.throws(() => importSave(JSON.stringify(save)), /integrity check failed/);
});

test('importSave rejects a tampered hash', () => {
  const save = JSON.parse(exportSave());
  save.hash = 'deadbeef';
  assert.throws(() => importSave(JSON.stringify(save)), /integrity check failed/);
});

test('importSave rejects non-JSON content', () => {
  assert.throws(() => importSave('this is not json'), /not JSON/);
});

test('importSave rejects content without an integrity hash', () => {
  assert.throws(() => importSave(JSON.stringify({ version: 1, data: getState() })));
});
