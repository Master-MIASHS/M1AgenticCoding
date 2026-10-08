// Tests unitaires des badges du joueur (Groupe 1, tâche n°33, #272).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { BADGES_CONFIG } from '../../src/core/config/badges.config.js';
import { validerDefinitionsBadges } from '../../src/core/badges.js';

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
