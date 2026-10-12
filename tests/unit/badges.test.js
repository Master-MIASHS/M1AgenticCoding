// Tests unitaires des badges du joueur (Groupe 1, tâche n°33, #272).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { BADGES_CONFIG } from '../../src/core/config/badges.config.js';
import { validerDefinitionsBadges, calculerBadges, compteursDuJoueur } from '../../src/core/badges.js';

describe('badges.config', () => {
  it('définit seulement les deux badges cités par AGENTS.md', () => {
    assert.deepStrictEqual(BADGES_CONFIG.definitions, [
      { id: 'parties-1000', nom: '1000 parties jouées', compteur: 'partiesJouees', seuil: 1000 },
      { id: 'faillites-5', nom: 'A survécu à la faillite 5 fois', compteur: 'faillites', seuil: 5 },
    ]);
  });

  it('ne peut pas être modifiée par erreur', () => {
    assert.ok(Object.isFrozen(BADGES_CONFIG));
    assert.ok(Object.isFrozen(BADGES_CONFIG.definitions));
    assert.ok(BADGES_CONFIG.definitions.every((d) => Object.isFrozen(d)));
  });
});

/**
 * Définition de badge de test, modifiable (ne fixe pas le contenu des badges).
 * @param {object} [changements] - Champs à remplacer.
 * @returns {object} Définition de badge.
 */
function definition(changements = {}) {
  return { id: 'test', nom: 'Badge de test', compteur: 'partiesJouees', seuil: 10, ...changements };
}

describe('validerDefinitionsBadges', () => {
  it('accepte la configuration par défaut et une liste vide', () => {
    assert.doesNotThrow(() => validerDefinitionsBadges(BADGES_CONFIG.definitions));
    assert.doesNotThrow(() => validerDefinitionsBadges([]));
  });

  it('rejette une liste ou une définition invalide', () => {
    const invalides = [
      null,
      'badges',
      [null],
      [definition({ id: '' })],
      [definition({ nom: 3 })],
      [definition({ compteur: 'victoires' })],
      [definition({ seuil: 0 })],
      [definition({ seuil: 2.5 })],
      [definition({ seuil: '10' })],
      [definition(), definition({ nom: 'Doublon' })],
    ];
    for (const liste of invalides) {
      assert.throws(() => validerDefinitionsBadges(liste), /badges/, JSON.stringify(liste));
    }
  });
});

describe('calculerBadges', () => {
  const definitions = [
    definition({ id: 'a', nom: 'A', compteur: 'partiesJouees', seuil: 10 }),
    definition({ id: 'b', nom: 'B', compteur: 'faillites', seuil: 5 }),
  ];

  it('renvoie la progression de chaque badge, dans l’ordre des définitions', () => {
    assert.deepStrictEqual(calculerBadges({ partiesJouees: 3, faillites: 0 }, definitions), [
      { id: 'a', nom: 'A', obtenu: false, actuel: 3, seuil: 10 },
      { id: 'b', nom: 'B', obtenu: false, actuel: 0, seuil: 5 },
    ]);
  });

  it('marque un badge obtenu au seuil et plafonne la progression', () => {
    const [a, b] = calculerBadges({ partiesJouees: 10, faillites: 9 }, definitions);
    assert.deepStrictEqual(a, { id: 'a', nom: 'A', obtenu: true, actuel: 10, seuil: 10 });
    assert.deepStrictEqual(b, { id: 'b', nom: 'B', obtenu: true, actuel: 5, seuil: 5 });
  });

  it('compte 0 pour un compteur absent', () => {
    assert.strictEqual(calculerBadges({ partiesJouees: 1 }, definitions)[1].actuel, 0);
  });

  it('rejette des compteurs ou des définitions invalides', () => {
    for (const compteurs of [null, { partiesJouees: -1 }, { faillites: 1.5 }, { partiesJouees: '3' }]) {
      assert.throws(() => calculerBadges(compteurs, definitions), /badges/, JSON.stringify(compteurs));
    }
    assert.throws(() => calculerBadges({ partiesJouees: 1 }, [definition({ seuil: 0 })]), /badges/);
  });

  it('utilise les définitions de la configuration par défaut', () => {
    assert.deepStrictEqual(calculerBadges({ partiesJouees: 0, faillites: 0 }).map((b) => b.id), ['parties-1000', 'faillites-5']);
  });
});

describe('compteursDuJoueur', () => {
  it('compte les parties dans l’historique et lit les faillites de l’état', () => {
    const etat = { history: [{ gameId: 'slots' }, { gameId: 'dice' }], faillites: 2 };
    assert.deepStrictEqual(compteursDuJoueur(etat), { partiesJouees: 2, faillites: 2 });
  });

  it('compte 0 faillite tant que l’état ne tient pas ce compteur (#131)', () => {
    assert.deepStrictEqual(compteursDuJoueur({ history: [] }), { partiesJouees: 0, faillites: 0 });
  });

  it('ne compte pas les ajustements de l’admin comme des parties (#322)', () => {
    const ajustement = { type: 'ADMIN_ADJUSTMENT', amount: 50, balanceBefore: 0, balanceAfter: 50,
      adjustedAt: '2026-10-11T10:00:00.000Z' };
    const etat = { history: [{ gameId: 'slots' }, ajustement, { gameId: 'dice' }] };
    assert.deepStrictEqual(compteursDuJoueur(etat), { partiesJouees: 2, faillites: 0 });
  });

  it('rejette un état sans historique', () => {
    for (const etat of [null, {}, { history: 'parties' }]) {
      assert.throws(() => compteursDuJoueur(etat), /badges/, JSON.stringify(etat));
    }
  });
});
