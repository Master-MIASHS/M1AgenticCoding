// Tests unitaires du capital de départ réglable par l'admin (Groupe 1, #207).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PLAYER_CONFIG,
  createPlayerConfigMemoryStore,
  createPlayerConfig,
} from '../../src/core/config/player.config.js';

describe('createPlayerConfigMemoryStore', () => {
  it('est vide par défaut', () => {
    assert.deepStrictEqual(createPlayerConfigMemoryStore().read(), {});
  });

  it('lit une copie de la valeur stockée et la remplace à l’écriture', () => {
    const store = createPlayerConfigMemoryStore({ capitalDeDepart: 500 });
    const lu = store.read();
    assert.deepStrictEqual(lu, { capitalDeDepart: 500 });
    lu.capitalDeDepart = 1;
    assert.deepStrictEqual(store.read(), { capitalDeDepart: 500 });
    store.write({ capitalDeDepart: 2000 });
    assert.deepStrictEqual(store.read(), { capitalDeDepart: 2000 });
  });
});

describe('createPlayerConfig', () => {
  it('rejette un stockage sans read() ou write()', () => {
    for (const store of [undefined, null, {}, { read: () => ({}) }, { write: () => {} }]) {
      assert.throws(() => createPlayerConfig(store), /player\.config/);
    }
  });

  it('rejette un stockage au contenu invalide', () => {
    const invalides = [null, [], 'x', { capitalDeDepart: 0 }, { capitalDeDepart: -5 },
      { capitalDeDepart: '500' }, { capitalDeDepart: NaN }, { capitalDeDepart: Infinity }];
    for (const contenu of invalides) {
      const store = { read: () => contenu, write: () => {} };
      assert.throws(() => createPlayerConfig(store), /player\.config/, JSON.stringify(contenu));
    }
  });
});

describe('getCapitalDeDepart', () => {
  it('renvoie le capital par défaut si l’admin n’a rien réglé', () => {
    const config = createPlayerConfig(createPlayerConfigMemoryStore());
    assert.strictEqual(config.getCapitalDeDepart(), PLAYER_CONFIG.capitalDeDepart);
  });

  it('renvoie le capital réglé par l’admin, relu dans le stockage', () => {
    const store = createPlayerConfigMemoryStore({ capitalDeDepart: 2500 });
    const config = createPlayerConfig(store);
    assert.strictEqual(config.getCapitalDeDepart(), 2500);
    store.write({ capitalDeDepart: 300 });
    assert.strictEqual(config.getCapitalDeDepart(), 300);
  });
});

describe('setCapitalDeDepart', () => {
  it('enregistre et renvoie le nouveau capital', () => {
    const store = createPlayerConfigMemoryStore();
    const config = createPlayerConfig(store);
    assert.strictEqual(config.setCapitalDeDepart(5000), 5000);
    assert.strictEqual(config.getCapitalDeDepart(), 5000);
    assert.deepStrictEqual(store.read(), { capitalDeDepart: 5000 });
  });

  it('rejette un capital invalide sans rien écrire', () => {
    let ecritures = 0;
    const memoire = createPlayerConfigMemoryStore({ capitalDeDepart: 800 });
    const store = {
      read: memoire.read,
      write: (valeur) => {
        ecritures += 1;
        memoire.write(valeur);
      },
    };
    const config = createPlayerConfig(store);
    for (const montant of [0, -100, NaN, Infinity, '1000', null, undefined]) {
      assert.throws(() => config.setCapitalDeDepart(montant), /player\.config/, String(montant));
    }
    assert.strictEqual(ecritures, 0);
    assert.strictEqual(config.getCapitalDeDepart(), 800);
  });

  it('ne modifie jamais la configuration par défaut', () => {
    createPlayerConfig(createPlayerConfigMemoryStore()).setCapitalDeDepart(42);
    assert.strictEqual(PLAYER_CONFIG.capitalDeDepart, 1000);
  });
});
