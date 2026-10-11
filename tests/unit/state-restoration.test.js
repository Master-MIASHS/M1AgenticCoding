import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { getState, restoreState, updateState } from '../../src/core/state.js';
import { importSave } from '../../src/services/coreService.js';
import { computeIntegrityHash } from '../../src/core/storage.js';

const initial = getState();
const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => {
  delete globalThis.localStorage;
  restoreState(initial);
  if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
});

function save(data) {
  return JSON.stringify({ version: 1, data, hash: computeIntegrityHash(JSON.stringify(data)) });
}

function storage() {
  let writes = 0;
  let value = JSON.stringify(getState());
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => value, setItem: (_, next) => { value = next; writes++; } },
  });
  return { writes: () => writes, value: () => value };
}

describe('cohérence du meilleur solde restauré', () => {
  it('refuse un import à hash valide incohérent sans écriture ni mutation', () => {
    const persisted = storage();
    const before = persisted.value();
    assert.throws(() => importSave(save({ ...initial, balance: 1200, bestBalance: 1000 })), /state:/);
    assert.deepEqual(getState(), initial);
    assert.equal(persisted.writes(), 0);
    assert.equal(persisted.value(), before);
  });

  it('refuse aussi une restauration interne incohérente', () => {
    const persisted = storage();
    assert.throws(() => restoreState({ ...initial, balance: 1200, bestBalance: 1000 }), /state:/);
    assert.deepEqual(getState(), initial);
    assert.equal(persisted.writes(), 0);
  });

  it('restaure une ancienne sauvegarde cohérente même avec moins de progression', () => {
    updateState(s => ({ ...s, balance: 2000, bestBalance: 2000, xp: 100, level: 2 }));
    const persisted = storage();
    const older = { ...initial, balance: 500, bestBalance: 500 };
    assert.deepEqual(importSave(save(older)), older);
    assert.deepEqual(getState(), older);
    assert.equal(persisted.writes(), 1);
  });

  it('au démarrage conserve le stockage incohérent et utilise le repli en mémoire', () => {
    const url = new URL('../../src/core/state.js', import.meta.url).href;
    const source = `
      import assert from 'node:assert/strict';
      const invalid = ${JSON.stringify({ ...initial, balance: 1200, bestBalance: 1000 })};
      const stored = JSON.stringify(invalid);
      let writes = 0, warnings = 0;
      globalThis.localStorage = { getItem: () => stored, setItem: () => { writes++; } };
      console.warn = () => { warnings++; };
      const { getState } = await import(${JSON.stringify(url)});
      assert.deepEqual(getState(), ${JSON.stringify(initial)});
      assert.equal(writes, 0);
      assert.equal(warnings, 1);
      assert.equal(localStorage.getItem('casino_state'), stored);
    `;
    execFileSync(process.execPath, ['--input-type=module', '-e', source], { stdio: 'pipe' });
  });
});
