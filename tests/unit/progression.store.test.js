import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createProgressionStore } from '../../src/core/progression.store.js';
import { createProgression } from '../../src/core/progression.js';

function fixture() {
  let state = { xp: 10, level: 1, balance: 900, bestBalance: 1000, history: [] };
  let writes = 0;
  const backend = {
    getState: () => structuredClone(state),
    updateState(updater) {
      const next = updater(structuredClone(state));
      state = structuredClone(next);
      writes += 1;
    },
  };
  return { backend, store: createProgressionStore(backend),
    current: () => state, writes: () => writes,
    replace: (next) => { state = next; } };
}

describe('adaptateur de progression injecté', () => {
  it('lit une nouvelle copie de la progression courante sans cache', () => {
    const f = fixture();
    const first = f.store.read();
    first.xp = 99;
    assert.deepEqual(f.store.read(), { xp: 10, level: 1 });
    f.replace({ ...f.current(), xp: 250, level: 3 });
    assert.deepEqual(f.store.read(), { xp: 250, level: 3 });
  });

  it('écrit uniquement XP et niveau ensemble, en une opération', () => {
    const f = fixture();
    const before = structuredClone(f.current());
    f.store.write({ xp: 100.5, level: 2, balance: 0, history: ['intrus'] });
    assert.equal(f.writes(), 1);
    assert.deepEqual(f.current(), { ...before, xp: 100.5, level: 2 });
  });

  it('rejette les données invalides sans appeler le stockage', () => {
    const f = fixture();
    for (const value of [null, [], {}, { xp: 20 }, { level: 2 },
      { xp: '20', level: 2 }, { xp: NaN, level: 2 }, { xp: Infinity, level: 2 },
      { xp: -1, level: 2 }, { xp: 20, level: 0 }, { xp: 20, level: 1.5 },
      { xp: 20, level: Number.MAX_SAFE_INTEGER + 1 }]) {
      assert.throws(() => f.store.write(value));
      assert.equal(f.writes(), 0);
    }
  });

  it('refuse une diminution et conserve tous les champs', () => {
    const f = fixture();
    f.store.write({ xp: 100, level: 2 });
    const before = structuredClone(f.current());
    for (const pair of [{ xp: 99, level: 2 }, { xp: 100, level: 1 }]) {
      assert.throws(() => f.store.write(pair));
      assert.deepEqual(f.current(), before);
      assert.equal(f.writes(), 1);
    }
  });

  it('compare la progression avec l’état fourni par la transaction', () => {
    const store = createProgressionStore({
      getState: () => ({ xp: 0, level: 1 }),
      updateState: (updater) => updater({ xp: 200, level: 3, balance: 1000 }),
    });
    assert.throws(() => store.write({ xp: 100, level: 2 }), /diminuer/);
  });

  it('propage les erreurs de lecture et d’écriture', () => {
    const error = new Error('stockage indisponible');
    const store = createProgressionStore({
      getState() { throw error; },
      updateState() { throw error; },
    });
    assert.throws(() => store.read(), (caught) => caught === error);
    assert.throws(() => store.write({ xp: 10, level: 1 }), (caught) => caught === error);
  });

  it('rejette un état courant invalide et des dépendances manquantes', () => {
    assert.throws(() => createProgressionStore({}));
    const f = fixture();
    f.replace({ xp: NaN, level: 1 });
    assert.throws(() => f.store.read());
    assert.throws(() => f.store.write({ xp: 20, level: 2 }));
    assert.equal(f.writes(), 0);
  });

  it('permet à createProgression de cumuler l’XP et de calculer les niveaux', () => {
    const f = fixture();
    const progression = createProgression(f.store, [0, 100, 250]);
    assert.deepEqual(progression.addXP(90.5), { xp: 100.5, level: 2 });
    assert.equal(f.current().balance, 900);
    assert.equal(f.writes(), 1);
    f.replace({ ...f.current(), xp: 250, level: 3 });
    assert.equal(progression.getLevel(), 3);
    assert.deepEqual(progression.addXP(0), { xp: 250, level: 3 });
  });
});
