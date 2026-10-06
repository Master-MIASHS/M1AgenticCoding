// Tests unitaires des événements bonus (Groupe 1, tâche n°35, #223).
// Les événements ci-dessous sont des données de test : ils ne fixent pas le
// contenu des événements, qui est décidé par l'admin.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createEvenementsMemoryStore,
  validerEvenement,
  createEvenementsBonus,
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

/**
 * Stockage de test qui compte les écritures.
 * @param {Array<object>} [initial] - Événements de départ.
 * @returns {{ read: function(): Array<object>, write: function(Array<object>): void,
 *   ecritures: function(): number }} Stockage de test.
 */
function stockageCompte(initial = []) {
  const memoire = createEvenementsMemoryStore(initial);
  let ecritures = 0;
  return {
    read: memoire.read,
    write: (valeur) => {
      ecritures += 1;
      memoire.write(valeur);
    },
    ecritures: () => ecritures,
  };
}

describe('createEvenementsBonus', () => {
  it('rejette un stockage ou une horloge invalide', () => {
    for (const store of [undefined, null, {}, { read: () => [] }, { write: () => {} }]) {
      assert.throws(() => createEvenementsBonus(store), /events\.config/);
    }
    assert.throws(
      () => createEvenementsBonus(createEvenementsMemoryStore(), { now: 123 }),
      /events\.config/,
    );
  });

  it('rejette un stockage au contenu invalide', () => {
    const contenus = [
      null,
      {},
      [evenement({ multiplicateur: 0 })],
      [evenement(), evenement({ cible: 'xp' })],
      [evenement(), evenement({ id: 'chevauche', debut: 1500, fin: 2500 })],
    ];
    for (const contenu of contenus) {
      const store = { read: () => contenu, write: () => {} };
      assert.throws(() => createEvenementsBonus(store), /events\.config/, JSON.stringify(contenu));
    }
  });
});

describe('lancerEvenement et getEvenements', () => {
  it('ajoute l’événement et le renvoie', () => {
    const store = stockageCompte();
    const bonus = createEvenementsBonus(store);
    assert.deepStrictEqual(bonus.lancerEvenement(evenement()), evenement());
    assert.deepStrictEqual(bonus.getEvenements(), [evenement()]);
    assert.strictEqual(store.ecritures(), 1);
  });

  it('refuse un identifiant déjà utilisé ou un chevauchement sur la même cible, sans écriture', () => {
    const store = stockageCompte([evenement()]);
    const bonus = createEvenementsBonus(store);
    const refuses = [
      evenement({ cible: 'xp', debut: 5000, fin: 6000 }),
      evenement({ id: 'pendant', debut: 1500, fin: 1800 }),
      evenement({ id: 'avant', debut: 500, fin: 1001 }),
      evenement({ id: 'englobe', debut: 0, fin: 9000 }),
    ];
    for (const e of refuses) {
      assert.throws(() => bonus.lancerEvenement(e), /events\.config/, JSON.stringify(e));
    }
    assert.strictEqual(store.ecritures(), 0);
    assert.deepStrictEqual(bonus.getEvenements(), [evenement()]);
  });

  it('accepte deux cibles en même temps et deux événements qui se suivent', () => {
    const bonus = createEvenementsBonus(createEvenementsMemoryStore([evenement()]));
    bonus.lancerEvenement(evenement({ id: 'xp', cible: 'xp' }));
    bonus.lancerEvenement(evenement({ id: 'suite', debut: 2000, fin: 3000 }));
    assert.deepStrictEqual(bonus.getEvenements().map((e) => e.id), ['test', 'xp', 'suite']);
  });

  it('rejette un événement invalide sans écriture', () => {
    const store = stockageCompte();
    assert.throws(
      () => createEvenementsBonus(store).lancerEvenement(evenement({ multiplicateur: 1 })),
      /events\.config/,
    );
    assert.strictEqual(store.ecritures(), 0);
  });

  it('renvoie des copies indépendantes', () => {
    const bonus = createEvenementsBonus(createEvenementsMemoryStore());
    const lance = evenement();
    const renvoye = bonus.lancerEvenement(lance);
    lance.multiplicateur = 50;
    renvoye.multiplicateur = 60;
    bonus.getEvenements()[0].multiplicateur = 70;
    assert.strictEqual(bonus.getEvenements()[0].multiplicateur, 2);
  });
});

describe('getMultiplicateurActif', () => {
  /**
   * Gestion d'événements avec une horloge réglable.
   * @param {Array<object>} initial - Événements de départ.
   * @returns {{ bonus: object, regler: function(number): void }} Gestion et réglage de l'heure.
   */
  function avecHorloge(initial) {
    let instant = 0;
    const bonus = createEvenementsBonus(createEvenementsMemoryStore(initial), { now: () => instant });
    return { bonus, regler: (t) => { instant = t; } };
  }

  it('vaut 1 sans événement', () => {
    const { bonus } = avecHorloge([]);
    assert.strictEqual(bonus.getMultiplicateurActif('gains'), 1);
    assert.strictEqual(bonus.getMultiplicateurActif('xp'), 1);
  });

  it('renvoie le multiplicateur pendant l’événement : début inclus, fin exclue', () => {
    const { bonus, regler } = avecHorloge([evenement()]);
    const attendus = [[999, 1], [1000, 2], [1999, 2], [2000, 1]];
    for (const [instant, multiplicateur] of attendus) {
      regler(instant);
      assert.strictEqual(bonus.getMultiplicateurActif('gains'), multiplicateur, String(instant));
    }
  });

  it('ne concerne que la cible de l’événement', () => {
    const { bonus, regler } = avecHorloge([evenement(), evenement({ id: 'xp', cible: 'xp', multiplicateur: 3 })]);
    regler(1500);
    assert.strictEqual(bonus.getMultiplicateurActif('gains'), 2);
    assert.strictEqual(bonus.getMultiplicateurActif('xp'), 3);
  });

  it('rejette une cible inconnue ou une horloge invalide', () => {
    const { bonus, regler } = avecHorloge([]);
    assert.throws(() => bonus.getMultiplicateurActif('solde'), /events\.config/);
    regler(-5);
    assert.throws(() => bonus.getMultiplicateurActif('gains'), /events\.config/);
  });
});

describe('arreterEvenement', () => {
  it('retire l’événement, qui ne compte plus dans le multiplicateur', () => {
    const store = stockageCompte([evenement(), evenement({ id: 'xp', cible: 'xp' })]);
    const bonus = createEvenementsBonus(store, { now: () => 1500 });
    assert.deepStrictEqual(bonus.arreterEvenement('test'), evenement());
    assert.deepStrictEqual(bonus.getEvenements().map((e) => e.id), ['xp']);
    assert.strictEqual(bonus.getMultiplicateurActif('gains'), 1);
    assert.strictEqual(store.ecritures(), 1);
  });

  it('permet de relancer un événement sur la période libérée', () => {
    const bonus = createEvenementsBonus(createEvenementsMemoryStore([evenement()]));
    bonus.arreterEvenement('test');
    assert.doesNotThrow(() => bonus.lancerEvenement(evenement({ id: 'remplace', multiplicateur: 3 })));
  });

  it('lève une erreur pour un identifiant inconnu, sans écriture', () => {
    const store = stockageCompte([evenement()]);
    const bonus = createEvenementsBonus(store);
    for (const id of ['inconnu', '', 42, undefined]) {
      assert.throws(() => bonus.arreterEvenement(id), /events\.config/, String(id));
    }
    assert.strictEqual(store.ecritures(), 0);
  });
});
