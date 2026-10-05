
// Unit tests - Core progression (src/core/progression.js)
// Verifies the XP / level contract, the invariants "XP and level never
// decrease", and that unlocked games are always valid game ids.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  addXP,
  getLevel,
  getUnlockedGames,
  getLeaderboard,
  getHistory,
} from '../../src/core/progression.js';
import { getState } from '../../src/core/state.js';
import { GAMES } from '../../src/core/config/games.config.js';

test('addXP returns { xp, level } and grants the requested amount', () => {
  const { xp, level } = getState();
  const result = addXP(25);
  assert.equal(result.xp, xp + 25);
  assert.equal(result.level, level);
});

test('addXP never decreases XP', () => {
  const { xp } = getState();
  for (const amount of [0, 1, 100]) {
    assert.ok(addXP(amount).xp >= xp, `xp must never decrease for addXP(${amount})`);
  }
});

test('addXP never decreases the level', () => {
  const { level } = getState();
  assert.ok(addXP(10000).level >= level, 'level must never decrease');
});

test('getLevel is consistent with the global state', () => {
  assert.equal(getLevel(), getState().level);
});

test('getUnlockedGames returns only valid game ids', () => {
  const unlocked = getUnlockedGames();
  assert.ok(Array.isArray(unlocked));
  const known = new Set(Object.keys(GAMES));
  for (const id of unlocked) {
    assert.ok(known.has(id), `unknown game id in unlockedGames: ${id}`);
  }
});

test('getUnlockedGames returns a copy (isolation)', () => {
  const first = getUnlockedGames();
  first.push('poker');
  const second = getUnlockedGames();
  assert.ok(!second.includes('poker'), 'mutating the returned list must not leak');
});

test('getLeaderboard returns entries shaped { pseudo, balance, level } sorted desc', () => {
  const board = getLeaderboard();
  assert.ok(Array.isArray(board));
  board.forEach((entry) => {
    assert.equal(typeof entry.pseudo, 'string');
    assert.equal(typeof entry.balance, 'number');
    assert.equal(typeof entry.level, 'number');
  });
  for (let i = 1; i < board.length; i += 1) {
    assert.ok(
      board[i - 1].balance >= board[i].balance,
      'leaderboard must be sorted by best balance descending',
    );
  }
});

test('getHistory returns an array', () => {
  assert.ok(Array.isArray(getHistory()));

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addXP, getLevel, calculateLevel, createProgression } from '../../src/core/progression.js';
import { getState } from '../../src/core/state.js';
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
  it('branche les fonctions existantes sur le mock sans modifier le state Core', () => {
    const before = getState();
    assert.deepEqual(addXP(100), { xp: 100, level: 2 });
    assert.equal(getLevel(), 2);
    assert.deepEqual(addXP(150), { xp: 250, level: 3 });
    assert.equal(getLevel(), 3);
    assert.deepEqual(getState(), before);
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
