import { beforeEach, afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../src/core/core.js';
import * as service from '../../src/services/coreService.js';

let state;
let saved;
let writes;
let failWrite;
let storageDescriptor;
let instance = 0;

beforeEach(async () => {
  storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  saved = null;
  writes = 0;
  failWrite = false;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => saved,
      setItem(key, value) {
        assert.equal(key, 'casino_state');
        if (failWrite) throw new Error('stockage indisponible');
        saved = value;
        writes += 1;
      },
    },
  });
  state = await import(`../../src/core/state.js?update-test=${instance++}`);
});

afterEach(() => {
  if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
  else delete globalThis.localStorage;
});

describe('écriture atomique de l’état', () => {
  it('applique et persiste les champs ensemble, puis les retrouve au rechargement', async () => {
    const before = state.getState();
    const next = state.updateState((draft) => {
      draft.balance += 50;
      draft.bestBalance = draft.balance;
      draft.xp = 100.5;
      draft.level = 2;
      draft.history.push({ gameId: 'dice', details: { payout: 50 } });
      assert.deepEqual(state.getState(), before);
      assert.equal(saved, null);
      return draft;
    });
    assert.equal(writes, 1);
    assert.deepEqual(state.getState(), next);
    assert.deepEqual(JSON.parse(saved), next);
    const reloaded = await import(`../../src/core/state.js?reload-update=${instance++}`);
    assert.deepEqual(reloaded.getState(), next);
  });

  it('isole les références du callback, du résultat et des lectures', () => {
    let retained;
    const result = state.updateState((draft) => {
      retained = draft;
      draft.history.push({ details: { value: 1 } });
      return draft;
    });
    retained.history[0].details.value = 2;
    result.history[0].details.value = 3;
    state.getState().history[0].details.value = 4;
    assert.equal(state.getState().history[0].details.value, 1);
    assert.equal(JSON.parse(saved).history[0].details.value, 1);
  });

  it('annule un callback qui échoue après avoir modifié sa copie', () => {
    const before = state.getState();
    assert.throws(() => state.updateState((draft) => {
      draft.history.push({ gameId: 'dice' });
      throw new Error('calcul échoué');
    }), /calcul échoué/);
    assert.deepEqual(state.getState(), before);
    assert.equal(writes, 0);
    assert.doesNotThrow(() => state.updateState((draft) => draft));
  });

  it('rejette une forme invalide, une baisse ou un niveau non sûr sans écriture', () => {
    const before = state.getState();
    const invalid = [
      null, {}, { ...before, balance: Infinity }, { ...before, xp: -1 },
      { ...before, level: 0 }, { ...before, level: Number.MAX_SAFE_INTEGER + 1 },
      { ...before, bestBalance: before.bestBalance - 1 },
      { ...before, balance: before.bestBalance + 1 },
    ];
    for (const next of invalid) {
      assert.throws(() => state.updateState(() => next));
      assert.deepEqual(state.getState(), before);
      assert.equal(writes, 0);
    }
    state.updateState((draft) => ({ ...draft, xp: 100, level: 2 }));
    const advanced = state.getState();
    for (const change of [{ xp: 99 }, { level: 1 }]) {
      assert.throws(() => state.updateState((draft) => ({ ...draft, ...change })));
      assert.deepEqual(state.getState(), advanced);
      assert.equal(writes, 1);
    }
  });

  it('rejette un callback absent ou un résultat asynchrone', () => {
    const before = state.getState();
    assert.throws(() => state.updateState(null));
    assert.throws(() => state.updateState(() => undefined));
    assert.throws(() => state.updateState(() => Promise.resolve(before)));
    assert.deepEqual(state.getState(), before);
    assert.equal(writes, 0);
  });

  it('conserve l’état et la sauvegarde précédente si le stockage échoue', () => {
    state.updateState((draft) => ({ ...draft, xp: 10 }));
    const before = state.getState();
    const previousSave = saved;
    failWrite = true;
    assert.throws(() => state.updateState((draft) => ({ ...draft, xp: 20 })), /stockage indisponible/);
    assert.deepEqual(state.getState(), before);
    assert.equal(saved, previousSave);
    failWrite = false;
    assert.doesNotThrow(() => state.updateState((draft) => ({ ...draft, xp: 20 })));
  });

  it('rejette les données impossibles à enregistrer sans altération JSON', () => {
    const before = state.getState();
    const circular = {};
    circular.self = circular;
    for (const value of [1n, circular, undefined, NaN, new Date(), new Map()]) {
      assert.throws(() => state.updateState((draft) => ({ ...draft, history: [value] })));
      assert.deepEqual(state.getState(), before);
      assert.equal(writes, 0);
    }
  });

  it('refuse une écriture ou restauration imbriquée', () => {
    const before = state.getState();
    for (const nested of [
      () => state.updateState((draft) => draft),
      () => state.restoreState(before),
    ]) {
      assert.throws(() => state.updateState((draft) => {
        nested();
        return draft;
      }), /en cours/);
      assert.deepEqual(state.getState(), before);
      assert.equal(writes, 0);
    }
  });

  it('refuse les propriétés de tableau que JSON omettrait', () => {
    const before = state.getState();
    assert.throws(() => state.updateState((draft) => {
      draft.history.summary = { rounds: 1 };
      return draft;
    }), /propriétés supplémentaires/);
    assert.deepEqual(state.getState(), before);
    assert.equal(writes, 0);
  });

  it('fonctionne en mémoire sans stockage navigateur', () => {
    delete globalThis.localStorage;
    const result = state.updateState((draft) => ({ ...draft, xp: 5 }));
    assert.equal(result.xp, 5);
    assert.equal(state.getState().xp, 5);
  });

  it('rend une écriture visible dans la façade et dans une sauvegarde exportée', async () => {
    const shared = await import('../../src/core/state.js');
    const before = shared.getState();
    try {
      shared.updateState((draft) => ({ ...draft, xp: draft.xp + 5 }));
      assert.equal(service.getState().xp, before.xp + 5);
      assert.deepEqual(JSON.parse(service.exportSave()).data, shared.getState());
    } finally {
      shared.restoreState(before);
    }
  });

  it('garde la restauration distincte et ne publie pas le setter à l’UI', () => {
    const before = state.getState();
    state.updateState((draft) => ({ ...draft, xp: 100, level: 2 }));
    state.restoreState(before);
    assert.deepEqual(state.getState(), before);
    assert.equal(Object.hasOwn(core, 'updateState'), false);
    assert.equal(Object.hasOwn(service, 'updateState'), false);
  });
});
