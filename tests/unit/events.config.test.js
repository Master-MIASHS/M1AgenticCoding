// Tests unitaires des événements bonus (Groupe 1, tâche n°35, #223).
// Les événements ci-dessous sont des données de test : ils ne fixent pas le
// contenu des événements, qui est décidé par l'admin.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createEvenementsMemoryStore,
  validerEvenement,
} from '../../src/core/config/events.config.js';

/**
 * Construit un événement de test valide, modifiable.
 * @param {object} [changements] - Champs à remplacer.
 * @returns {object} Événement de test.
 */
function evenement(changements = {}) {
  return { id: 'test', cible: 'gains', multiplicateur: 2, debut: 1000, fin: 2000, ...changements };
}

describe('createEvenementsMemoryStore', () => {
  it('est vide par défaut', () => {
    assert.deepStrictEqual(createEvenementsMemoryStore().read(), []);
  });

  it('lit une copie et la remplace à l’écriture', () => {
    const store = createEvenementsMemoryStore([evenement()]);
    const lu = store.read();
    lu[0].multiplicateur = 10;
    lu.push(evenement({ id: 'ajout' }));
    assert.deepStrictEqual(store.read(), [evenement()]);
    store.write([evenement({ id: 'autre' })]);
    assert.deepStrictEqual(store.read(), [evenement({ id: 'autre' })]);
  });
});

describe('validerEvenement', () => {
  it('accepte un événement valide sur les gains ou sur l’XP', () => {
    assert.doesNotThrow(() => validerEvenement(evenement()));
    assert.doesNotThrow(() => validerEvenement(evenement({ cible: 'xp', multiplicateur: 1.5, debut: 0 })));
  });

  it('rejette un événement mal formé', () => {
    const invalides = [
      null,
      [],
      evenement({ id: '' }),
      evenement({ id: 3 }),
      evenement({ cible: 'solde' }),
      evenement({ cible: undefined }),
      evenement({ multiplicateur: 1 }),
      evenement({ multiplicateur: 0.5 }),
      evenement({ multiplicateur: '2' }),
      evenement({ multiplicateur: Infinity }),
      evenement({ debut: -1 }),
      evenement({ debut: 1.5 }),
      evenement({ fin: 1000 }),
      evenement({ fin: 500 }),
      evenement({ fin: Number.MAX_VALUE }),
    ];
    for (const e of invalides) {
      assert.throws(() => validerEvenement(e), /events\.config/, JSON.stringify(e));
    }
  });
});
