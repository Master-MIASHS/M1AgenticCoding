// Tests du démarrage de l'état avec un casino_state inutilisable (Groupe 1, tâche n°27, #239).
// Chaque test recharge state.js avec un faux localStorage, comme state-update.test.js.

import { beforeEach, afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

const DEFAULT_STATE = {
  balance: 1000,
  bestBalance: 1000,
  xp: 0,
  level: 1,
  unlockedGames: ['slots', 'dice'],
  history: [],
  settledRoundIds: [],
  faillites: 0,
  role: 'player',
};

let saved;
let writes;
let warnings;
let storageDescriptor;
let originalWarn;
let instance = 0;

/**
 * Installe un faux localStorage.
 * @param {{ getItem?: function(): (string|null) }} [overrides]
 */
function installStorage(overrides = {}) {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => key === 'casino_state' ? saved : null,
      setItem(key, value) {
        assert.equal(key, 'casino_state');
        saved = value;
        writes += 1;
      },
      ...overrides,
    },
  });
}

/** Charge une nouvelle instance de state.js. */
function loadState() {
  return import(`../../src/core/state.js?startup-test=${instance++}`);
}

beforeEach(() => {
  storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  saved = null;
  writes = 0;
  warnings = [];
  originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  installStorage();
});

afterEach(() => {
  console.warn = originalWarn;
  if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
  else delete globalThis.localStorage;
});

describe('démarrage avec un casino_state inutilisable', () => {
  const unusable = {
    'un JSON invalide': '{ pas du json',
    'un schéma invalide': JSON.stringify({ ...DEFAULT_STATE, balance: 'beaucoup' }),
    'un champ manquant': JSON.stringify({ balance: 1000 }),
    'un état qui n’est pas un objet': JSON.stringify([1, 2, 3]),
    'une XP négative': JSON.stringify({ ...DEFAULT_STATE, xp: -5 }),
    'un registre roundId ambigu': JSON.stringify({
      ...DEFAULT_STATE,
      settledRoundIds: ['round-1', 'round-1'],
    }),
    'un compteur de faillites négatif': JSON.stringify({
      ...DEFAULT_STATE,
      faillites: -1,
    }),
  };

  for (const [label, content] of Object.entries(unusable)) {
    it(`démarre avec l'état par défaut pour ${label}, sans écraser casino_state`, async () => {
      saved = content;
      const state = await loadState();
      assert.deepEqual(state.getState(), DEFAULT_STATE);
      assert.equal(warnings.length, 1);
      assert.equal(writes, 0);
      assert.equal(saved, content);
    });
  }

  it('démarre avec l’état par défaut si getItem lève une exception', async () => {
    installStorage({
      getItem() {
        throw new Error('accès refusé');
      },
    });
    const state = await loadState();
    assert.deepEqual(state.getState(), DEFAULT_STATE);
    assert.equal(warnings.length, 1);
    assert.equal(writes, 0);
  });

  it('démarre avec l’état par défaut si l’accès à localStorage lui-même lève une exception', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      },
    });
    const state = await loadState();
    assert.deepEqual(state.getState(), DEFAULT_STATE);
    assert.equal(warnings.length, 1);
  });

  it('remplace casino_state au premier enregistrement réussi', async () => {
    saved = '{ pas du json';
    const state = await loadState();
    const next = state.updateState((draft) => ({ ...draft, xp: 10 }));
    assert.equal(writes, 1);
    assert.deepEqual(JSON.parse(saved), next);
  });
});

describe('démarrage sans problème (non-régression)', () => {
  it('ajoute les champs Core absents aux anciennes sauvegardes', async () => {
    const { settledRoundIds, faillites, ...legacyState } = DEFAULT_STATE;
    void settledRoundIds;
    void faillites;
    saved = JSON.stringify(legacyState);
    const state = await loadState();
    assert.deepEqual(state.getState(), DEFAULT_STATE);
  });

  it('relit un casino_state valide sans avertissement', async () => {
    const stored = { ...DEFAULT_STATE, balance: 750, xp: 42.5, level: 2 };
    saved = JSON.stringify(stored);
    const state = await loadState();
    assert.deepEqual(state.getState(), stored);
    assert.equal(warnings.length, 0);
    assert.equal(writes, 0);
  });

  it('démarre avec l’état par défaut sans avertissement si rien n’est enregistré', async () => {
    const state = await loadState();
    assert.deepEqual(state.getState(), DEFAULT_STATE);
    assert.equal(warnings.length, 0);
  });

  it('démarre avec l’état par défaut sans avertissement sans localStorage (Node)', async () => {
    delete globalThis.localStorage;
    const state = await loadState();
    assert.deepEqual(state.getState(), DEFAULT_STATE);
    assert.equal(warnings.length, 0);
  });
});
