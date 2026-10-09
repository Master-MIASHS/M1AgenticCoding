import { beforeEach, afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as core from '../../src/services/coreService.js';
import { getState as readState, restoreState } from '../../src/core/state.js';
import { computeIntegrityHash } from '../../src/core/storage.js';

const initial = readState();
let descriptor;
let writes;

function save(data) {
  return JSON.stringify({ version: 1, data, hash: computeIntegrityHash(JSON.stringify(data)) });
}

beforeEach(() => {
  descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { setItem() { writes++; } },
  });
  restoreState(initial);
  writes = 0;
});
afterEach(() => {
  restoreState(initial);
  if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
  else delete globalThis.localStorage;
});

describe('seuil du niveau suivant via coreService (#252)', () => {
  it('fournit le seuil total et suit immédiatement un gain XP', () => {
    assert.equal(core.getState().xpForNextLevel, 100);
    core.addXP(25);
    assert.equal(core.getState().xpForNextLevel, 100); // pas les 75 XP restantes
    core.addXP(75);
    assert.equal(core.getState().xpForNextLevel, 250);
    assert.equal(core.getLevel(), 2);
    assert.equal(writes, 2);
  });

  it('préserve le niveau acquis même si l’XP correspond à un niveau inférieur', () => {
    restoreState({ ...initial, xp: 10, level: 4 });
    assert.equal(core.getLevel(), 4);
    assert.equal(core.getState().xpForNextLevel, 1000);
  });

  for (const level of [5, 12]) {
    it(`renvoie null sans niveau suivant (niveau acquis ${level})`, () => {
      restoreState({ ...initial, level });
      assert.equal(core.getState().xpForNextLevel, null);
    });
  }

  it('garde lisible une ancienne sauvegarde dont le niveau dépasse les entiers sûrs', () => {
    const data = { ...initial, level: Number.MAX_SAFE_INTEGER + 1 };
    core.importSave(save(data));
    assert.deepEqual(core.getState(), { ...data, xpForNextLevel: null });
    assert.deepEqual(readState(), data);
    assert.equal(writes, 1);
  });

  it('recalcule après import sans champ, depuis le niveau effectif', () => {
    core.getLevel(); // Initialise le service avant l’import.
    const data = { ...initial, xp: 250, level: 1 };
    assert.deepEqual(core.importSave(save(data)), data);
    assert.equal(core.getLevel(), 3);
    assert.equal(core.getState().xpForNextLevel, 500);
    assert.equal(core.getState().level, 1); // lecture sans migration implicite
    assert.equal(writes, 1);
  });

  it('ignore un ancien seuil enregistré sans réécrire la sauvegarde', () => {
    core.importSave(save({ ...initial, level: 4, xpForNextLevel: 42 }));
    assert.equal(core.getState().xpForNextLevel, 1000);
    assert.equal(readState().xpForNextLevel, 42);
    assert.equal(writes, 1); // uniquement l’import, aucune écriture de lecture
  });

  it('ne persiste pas le champ dérivé et retourne une copie indépendante', () => {
    const snapshot = core.getState();
    assert.equal(snapshot.xpForNextLevel, 100);
    snapshot.xpForNextLevel = -1;
    snapshot.unlockedGames.push('poker');
    snapshot.history.push({ test: true });
    assert.deepEqual(core.getState(), { ...initial, xpForNextLevel: 100 });
    assert.deepEqual(readState(), initial);
    assert.deepEqual(JSON.parse(core.exportSave()).data, initial);
    assert.equal(writes, 0);
    core.addXP(100);
    assert.equal(Object.hasOwn(readState(), 'xpForNextLevel'), false);
    assert.equal(Object.hasOwn(JSON.parse(core.exportSave()).data, 'xpForNextLevel'), false);
  });

  it('recalcule dans un processus neuf après rechargement d’une ancienne sauvegarde', () => {
    const data = { ...initial, xp: 250, level: 1, xpForNextLevel: 42 };
    const url = new URL('../../src/services/coreService.js', import.meta.url).href;
    const output = execFileSync(process.execPath, ['--input-type=module'], {
      encoding: 'utf8', timeout: 10000,
      input: `
        globalThis.localStorage = {
          getItem: key => key === 'casino_state' ? ${JSON.stringify(JSON.stringify(data))} : null,
          setItem() { throw Error('lecture avec écriture inattendue'); }
        };
        const core = await import(${JSON.stringify(url)});
        console.log(JSON.stringify(core.getState()));
      `,
    });
    assert.deepEqual(JSON.parse(output), { ...data, xpForNextLevel: 500 });
  });
});
