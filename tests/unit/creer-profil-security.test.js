import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { creerProfil, getState, exportSave } from '../../src/services/coreService.js';
import { restoreState, updateState } from '../../src/core/state.js';

const initial = JSON.parse(exportSave()).data;
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
      const url = new URL('../../src/services/coreService.js', import.meta.url).href;
      // Une restauration ne remet pas à zéro le cycle de vie d’une partie.
      // Chaque création publique part donc d’un vrai démarrage neuf.
      execFileSync(process.execPath, ['--input-type=module', '-e', `
        import assert from 'node:assert/strict';
        let writes = 0;
        globalThis.localStorage = { getItem: () => null, setItem: () => { writes++; } };
        const core = await import(${JSON.stringify(url)});
        const initial = core.getState();
        const options = ${JSON.stringify(options)};
        if (${JSON.stringify(nom)} === 'stockage') options.stockage = {
          getState() { throw Error('injection'); },
          updateState() { throw Error('injection'); },
          initializePlayerState() { throw Error('injection'); },
        };
        const result = core.creerProfil({ pseudo: 'Alice' }, options);
        assert.equal(result.balance, initial.balance);
        assert.deepEqual(result.unlockedGames, initial.unlockedGames);
        assert.equal(writes, 1);
      `], { stdio: 'pipe', timeout: 10000 });
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
