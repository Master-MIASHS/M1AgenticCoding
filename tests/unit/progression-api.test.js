import { beforeEach, afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as service from '../../src/services/coreService.js';
import { restoreState } from '../../src/core/state.js';

const initial = service.getState();
let descriptor;
let saved;
let writes;
let failWrite;

beforeEach(() => {
  descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  saved = null;
  writes = 0;
  failWrite = false;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => saved,
      setItem(key, value) {
        assert.equal(key, 'casino_state');
        if (failWrite) throw new Error('quota dépassé');
        saved = value;
        writes += 1;
      },
    },
  });
  restoreState(initial);
  writes = 0;
});

afterEach(() => {
  failWrite = false;
  try { restoreState(initial); }
  finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

describe('progression persistante via coreService', () => {
  it('publie et exporte XP/niveau sans modifier les autres champs', () => {
    const result = service.addXP(100.5);
    assert.deepEqual(result, { xp: 100.5, level: 2 });
    assert.equal(service.getLevel(), 2);
    const expected = { ...initial, xp: 100.5, level: 2 };
    assert.deepEqual(service.getState(), expected);
    assert.deepEqual(JSON.parse(saved), expected);
    assert.deepEqual(JSON.parse(service.exportSave()).data, expected);
    assert.equal(writes, 1);
  });

  it('relit la sauvegarde importée avec la même instance de progression', () => {
    const restored = { ...initial, xp: 300, level: 3, balance: 650 };
    restoreState(restored);
    const file = service.exportSave();
    restoreState(initial);
    service.addXP(10);
    assert.deepEqual(service.importSave(file), restored);
    assert.equal(service.getLevel(), 3);
    assert.deepEqual(service.addXP(5), { xp: 305, level: 3 });
    assert.deepEqual(service.getState(), { ...restored, xp: 305 });
    assert.deepEqual(JSON.parse(saved), service.getState());
  });

  it('propage un échec de stockage sans gain partiel et permet une nouvelle tentative', () => {
    service.addXP(90);
    const before = service.getState();
    const file = saved;
    const count = writes;
    failWrite = true;
    assert.throws(() => service.addXP(10), /quota dépassé/);
    assert.deepEqual(service.getState(), before);
    assert.equal(saved, file);
    assert.equal(writes, count);
    failWrite = false;
    assert.deepEqual(service.addXP(10), { xp: 100, level: 2 });
    assert.deepEqual(service.getState(), { ...before, xp: 100, level: 2 });
    assert.equal(writes, count + 1);
  });

  it('retrouve les gains via la façade dans un nouveau processus', () => {
    service.addXP(250);
    const moduleURL = new URL('../../src/services/coreService.js', import.meta.url).href;
    const output = execFileSync(process.execPath, ['--input-type=module'], {
      encoding: 'utf8',
      input: `Object.defineProperty(globalThis, 'localStorage', {
        configurable: true, value: { getItem: () => ${JSON.stringify(saved)} }
      });
      const service = await import(${JSON.stringify(moduleURL)});
      console.log(JSON.stringify({ state: service.getState(), level: service.getLevel() }));`,
    });
    assert.deepEqual(JSON.parse(output), {
      state: { ...initial, xp: 250, level: 3 }, level: 3,
    });
  });

  it('rejette les gains invalides sans mutation ni écriture', () => {
    const file = saved;
    for (const amount of [-1, NaN, Infinity, '10']) {
      assert.throws(() => service.addXP(amount), RangeError);
      assert.deepEqual(service.getState(), initial);
      assert.equal(saved, file);
      assert.equal(writes, 0);
    }
  });
});
