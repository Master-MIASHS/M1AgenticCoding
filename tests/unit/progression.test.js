import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addXP, getLevel, calculateLevel, createProgression } from '../../src/core/progression.js';
import { getState, restoreState } from '../../src/core/state.js';
import { createProgressionMock } from '../../src/core/progression.mock.js';
import { TEMPORARY_LEVEL_THRESHOLDS } from '../../src/core/config/progression.config.js';

describe('Calcul XP → niveau', () => {
  it('respecte chaque seuil temporaire et ses bornes', () => {
    for (const [xp, level] of [[0, 1], [99, 1], [100, 2], [249, 2],
      [250, 3], [499, 3], [500, 4], [999, 4], [1000, 5], [5000, 5]]) {
      assert.equal(calculateLevel(xp), level);
    }
    assert.deepEqual(TEMPORARY_LEVEL_THRESHOLDS, [0, 100, 250, 500, 1000]);
  });

  it('accepte une autre configuration sans changer le calcul', () => {
    assert.equal(calculateLevel(20, [0, 10, 20]), 3);
    assert.equal(calculateLevel(200, [0]), 1);
  });

  it('rejette les XP invalides', () => {
    for (const xp of [-1, NaN, Infinity, '100', null, undefined]) {
      assert.throws(() => calculateLevel(xp), RangeError);
    }
  });

  it('rejette les configurations invalides', () => {
    for (const thresholds of [[], [1], [0, 10, 10], [0, 20, 10],
      [0, -1], [0, NaN], [0, Infinity], [0, '100'], null]) {
      assert.throws(() => calculateLevel(0, thresholds), RangeError);
    }
  });
});

describe('Gestion XP avec adaptateur de progression', () => {
  it('branche les fonctions existantes sur l’état Core sans modifier les autres champs', () => {
    const before = getState();
    try {
      restoreState({ ...before, xp: 0, level: 1 });
      assert.deepEqual(addXP(100), { xp: 100, level: 2 });
      assert.equal(getLevel(), 2);
      assert.deepEqual(addXP(150), { xp: 250, level: 3 });
      assert.equal(getLevel(), 3);
      assert.deepEqual(getState(), { ...before, xp: 250, level: 3 });
    } finally {
      restoreState(before);
    }
  });

  it('cumule les gains et franchit plusieurs niveaux en un appel', () => {
    const progression = createProgression(createProgressionMock());
    assert.deepEqual(progression.addXP(99), { xp: 99, level: 1 });
    assert.deepEqual(progression.addXP(1), { xp: 100, level: 2 });
    assert.deepEqual(progression.addXP(900), { xp: 1000, level: 5 });
    assert.deepEqual(progression.addXP(20), { xp: 1020, level: 5 });
    assert.equal(progression.getLevel(), 5);
  });

  it('conserve la progression pour un gain nul et rejette les gains invalides', () => {
    const progression = createProgression(createProgressionMock({ xp: 250, level: 3 }));
    for (const amount of [-1, NaN, Infinity, '10', null, undefined]) {
      assert.throws(() => progression.addXP(amount), RangeError);
    }
    assert.deepEqual(progression.addXP(0), { xp: 250, level: 3 });
  });

  it('ne diminue pas un niveau acquis avec une autre courbe', () => {
    const progression = createProgression(createProgressionMock({ xp: 350, level: 8 }));
    assert.equal(progression.getLevel(), 8);
    assert.deepEqual(progression.addXP(10), { xp: 360, level: 8 });
  });

  it('isole les mocks et retourne des copies', () => {
    const initial = { xp: 0, level: 1, balance: 1000 };
    const store = createProgressionMock(initial);
    const progression = createProgression(store);
    progression.addXP(100).xp = 9999;
    store.read().level = 99;
    assert.deepEqual(store.read(), { xp: 100, level: 2 });
    assert.deepEqual(initial, { xp: 0, level: 1, balance: 1000 });
    assert.equal(createProgression(createProgressionMock()).getLevel(), 1);
  });

  it('utilise les lectures et écritures de l’adaptateur fourni par le Core', () => {
    let state = { xp: 0, level: 1, balance: 1000 };
    const progression = createProgression({
      read: () => state,
      write: (next) => { state = { ...state, ...next }; },
    }, [0, 10, 20]);
    state = { ...state, xp: 10, level: 2 };
    assert.deepEqual(progression.addXP(10), { xp: 20, level: 3 });
    assert.equal(state.balance, 1000);
  });

  it('rejette un dépassement numérique sans écrire dans le store', () => {
    const store = createProgressionMock({ xp: Number.MAX_VALUE, level: 5 });
    const progression = createProgression(store);
    assert.throws(() => progression.addXP(Number.MAX_VALUE), RangeError);
    assert.equal(store.read().xp, Number.MAX_VALUE);
  });

  it('propage un échec d’écriture du Core', () => {
    const failure = new Error('Écriture refusée');
    const progression = createProgression({
      read: () => ({ xp: 0, level: 1 }),
      write: () => { throw failure; },
    });
    assert.throws(() => progression.addXP(100), (error) => error === failure);
    assert.equal(progression.getLevel(), 1);
  });
});
