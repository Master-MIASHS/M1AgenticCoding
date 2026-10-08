import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { creerProfil, getState } from '../../src/services/coreService.js';
import { restoreState, updateState } from '../../src/core/state.js';

const initial = getState();
const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => {
  delete globalThis.localStorage;
  restoreState(initial);
  if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
});

function countWrites() {
  let writes = 0;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { setItem: () => { writes += 1; } },
  });
  return () => writes;
}

describe('création publique : dépendances privées et état vierge', () => {
  for (const [nom, options] of [
    ['capital', { config: { capitalDeDepart: 1000000 } }],
    ['jeux', { jeux: { poker: { id: 'poker', unlockLevel: 1 } } }],
    ['stockage', { stockage: {
      getState: () => initial,
      updateState: () => { throw Error('injection'); },
    } }],
  ]) {
    it(`ne permet pas de choisir ${nom} depuis la façade`, () => {
      const writes = countWrites();
      const result = creerProfil({ pseudo: 'Alice' }, options);
      assert.equal(result.balance, initial.balance);
      assert.deepEqual(result.unlockedGames, initial.unlockedGames);
      assert.equal(writes(), 1);
    });
  }

  for (const [nom, changes] of [
    ['dépense', { balance: 900 }],
    ['inventaire', { ownedItemIds: ['article'] }],
    ['jeu acquis', { unlockedGames: [...initial.unlockedGames, 'scratch'] }],
    ['rôle administrateur', { role: 'admin' }],
  ]) {
    it(`refuse sans écriture un état existant : ${nom}`, () => {
      updateState((s) => ({ ...s, ...changes }));
      const before = getState();
      const writes = countWrites();
      assert.throws(() => creerProfil({ pseudo: 'Alice' }), /partie|état|profil/);
      assert.deepEqual(getState(), before);
      assert.equal(writes(), 0);
    });
  }
});
