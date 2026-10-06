// Tests unitaires des niveaux de déblocage réglables (Groupe 1, tâche n°21, #137).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { GAMES } from '../../src/core/config/games.config.js';
import {
  createUnlockConfig,
  createUnlockMemoryStore,
} from '../../src/core/config/unlock.config.js';

const INVALID_GAME_IDS = ['inconnu', '', '__proto__', 'toString', undefined, null, 42, {}];
const INVALID_LEVELS = [0, -1, 1.5, NaN, Infinity, '3', null, undefined];

/**
 * Stockage en mémoire qui compte les écritures.
 *
 * @param {Object<string, number>} [initial]
 */
function spyStore(initial = {}) {
  const store = createUnlockMemoryStore(initial);
  let writes = 0;
  return {
    read: store.read,
    write: (next) => {
      writes += 1;
      store.write(next);
    },
    get writes() {
      return writes;
    },
  };
}

describe('valeurs par défaut', () => {
  it('reprend le unlockLevel de GAMES pour chaque jeu', () => {
    const config = createUnlockConfig(createUnlockMemoryStore());
    for (const [gameId, game] of Object.entries(GAMES)) {
      assert.equal(config.getUnlockLevel(gameId), game.unlockLevel);
    }
  });

  it('getUnlockLevels() couvre tous les jeux de GAMES', () => {
    const config = createUnlockConfig(createUnlockMemoryStore());
    const expected = Object.fromEntries(
      Object.entries(GAMES).map(([gameId, game]) => [gameId, game.unlockLevel])
    );
    assert.deepEqual(config.getUnlockLevels(), expected);
  });
});

describe('setUnlockLevel', () => {
  it("règle le niveau d'un jeu sans toucher aux autres", () => {
    const config = createUnlockConfig(createUnlockMemoryStore());
    assert.equal(config.setUnlockLevel('roulette', 8), 8);
    assert.equal(config.getUnlockLevel('roulette'), 8);
    assert.equal(config.getUnlockLevels().roulette, 8);
    assert.equal(config.getUnlockLevel('poker'), GAMES.poker.unlockLevel);
  });

  it('accepte de baisser un niveau, y compris à 1', () => {
    const config = createUnlockConfig(createUnlockMemoryStore());
    config.setUnlockLevel('poker', 1);
    assert.equal(config.getUnlockLevel('poker'), 1);
  });

  it('écrit les niveaux réglés dans le stockage injecté', () => {
    const store = createUnlockMemoryStore();
    createUnlockConfig(store).setUnlockLevel('plinko', 3);
    assert.deepEqual(store.read(), { plinko: 3 });
    assert.equal(createUnlockConfig(store).getUnlockLevel('plinko'), 3);
  });

  it('rejette un jeu inconnu sans rien écrire', () => {
    const store = spyStore();
    const config = createUnlockConfig(store);
    for (const gameId of INVALID_GAME_IDS) {
      assert.throws(() => config.setUnlockLevel(gameId, 3), /jeu inconnu/);
    }
    assert.equal(store.writes, 0);
  });

  it('rejette un niveau invalide sans rien écrire', () => {
    const store = spyStore({ roulette: 6 });
    const config = createUnlockConfig(store);
    for (const level of INVALID_LEVELS) {
      assert.throws(() => config.setUnlockLevel('roulette', level), RangeError);
    }
    assert.equal(store.writes, 0);
    assert.equal(config.getUnlockLevel('roulette'), 6);
  });
});

describe('getUnlockLevel', () => {
  it('rejette un jeu inconnu', () => {
    const config = createUnlockConfig(createUnlockMemoryStore());
    for (const gameId of INVALID_GAME_IDS) {
      assert.throws(() => config.getUnlockLevel(gameId), /jeu inconnu/);
    }
  });
});

describe('isolation', () => {
  it('getUnlockLevels() renvoie une copie indépendante', () => {
    const config = createUnlockConfig(createUnlockMemoryStore());
    const levels = config.getUnlockLevels();
    levels.slots = 99;
    assert.equal(config.getUnlockLevel('slots'), GAMES.slots.unlockLevel);
  });

  it('ne modifie jamais GAMES', () => {
    const before = structuredClone(GAMES);
    createUnlockConfig(createUnlockMemoryStore()).setUnlockLevel('dice', 4);
    assert.deepEqual(GAMES, before);
  });

  it('deux configurations sur des stockages différents sont indépendantes', () => {
    const first = createUnlockConfig(createUnlockMemoryStore());
    const second = createUnlockConfig(createUnlockMemoryStore());
    first.setUnlockLevel('wheel', 9);
    assert.equal(second.getUnlockLevel('wheel'), GAMES.wheel.unlockLevel);
  });
});

describe('stockage', () => {
  it('rejette un stockage sans read() ou write()', () => {
    for (const store of [undefined, null, {}, { read: () => ({}) }, { write: () => {} }]) {
      assert.throws(() => createUnlockConfig(store), TypeError);
    }
  });

  it('rejette un contenu de stockage invalide dès la création', () => {
    const contents = [null, [], 'roulette', { inconnu: 3 }, { roulette: 0 }, { roulette: '5' }];
    for (const content of contents) {
      const store = { read: () => content, write: () => {} };
      assert.throws(() => createUnlockConfig(store));
    }
  });
});
