import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createProgression } from '../../src/core/progression.js';
import { createProgressionStore } from '../../src/core/progression.store.js';

let storageDescriptor;
let saved;
let writes;
let failWrite;
let state;
let progression;
let instance = 0;

beforeEach(async () => {
  storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  saved = null;
  writes = 0;
  failWrite = false;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem(key) {
        assert.equal(key, 'casino_state');
        return saved;
      },
      setItem(key, value) {
        assert.equal(key, 'casino_state');
        if (failWrite) throw new Error('quota dépassé');
        saved = value;
        writes += 1;
      },
    },
  });
  state = await import(`../../src/core/state.js?progression-state=${instance++}`);
  progression = createProgression(createProgressionStore(state), [0, 100, 250]);
});

afterEach(() => {
  if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
  else delete globalThis.localStorage;
});

describe('progression sur le véritable état persistant', () => {
  it('enregistre XP et niveau ensemble, préserve les autres champs et recharge le résultat', async () => {
    state.restoreState({ ...state.getState(), balance: 750, history: [{ gameId: 'dice' }] });
    const before = state.getState();
    const previousWrites = writes;

    assert.deepEqual(progression.addXP(100.5), { xp: 100.5, level: 2 });
    const expected = { ...before, xp: 100.5, level: 2 };
    assert.deepEqual(state.getState(), expected);
    assert.deepEqual(JSON.parse(saved), expected);
    assert.equal(writes, previousWrites + 1);

    const reloaded = await import(`../../src/core/state.js?progression-state=${instance++}`);
    const resumed = createProgression(createProgressionStore(reloaded), [0, 100, 250]);
    assert.deepEqual(reloaded.getState(), expected);
    assert.equal(resumed.getLevel(), 2);
    assert.deepEqual(resumed.addXP(149.5), { xp: 250, level: 3 });
    assert.deepEqual(JSON.parse(saved), { ...expected, xp: 250, level: 3 });
  });

  it('relit une restauration avec la même instance de progression sans perdre les autres données', () => {
    progression.addXP(100);
    const restored = {
      ...state.getState(), xp: 300, level: 3, balance: 600,
      history: [{ gameId: 'slots', details: { payout: 0 } }],
    };
    state.restoreState(restored);
    const previousWrites = writes;
    assert.equal(progression.getLevel(), 3);
    assert.equal(writes, previousWrites);
    assert.deepEqual(progression.addXP(5), { xp: 305, level: 3 });
    assert.deepEqual(state.getState(), { ...restored, xp: 305 });
    assert.deepEqual(JSON.parse(saved), state.getState());
    assert.equal(writes, previousWrites + 1);
  });

  it('conserve mémoire et sauvegarde en cas de quota dépassé, puis applique le gain une seule fois', () => {
    progression.addXP(90);
    const before = state.getState();
    const previousSave = saved;
    const previousWrites = writes;
    failWrite = true;
    assert.throws(() => progression.addXP(10), /quota dépassé/);
    assert.deepEqual(state.getState(), before);
    assert.equal(progression.getLevel(), 1);
    assert.equal(saved, previousSave);
    assert.equal(writes, previousWrites);

    failWrite = false;
    assert.deepEqual(progression.addXP(10), { xp: 100, level: 2 });
    assert.deepEqual(state.getState(), { ...before, xp: 100, level: 2 });
    assert.deepEqual(JSON.parse(saved), state.getState());
    assert.equal(writes, previousWrites + 1);
  });
});
