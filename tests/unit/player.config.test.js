// Tests unitaires du capital de départ réglable par l'admin (Groupe 1, #207).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createPlayerConfigMemoryStore } from '../../src/core/config/player.config.js';

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
