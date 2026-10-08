// Tests unitaires des badges du joueur (Groupe 1, tâche n°33, #272).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { BADGES_CONFIG } from '../../src/core/config/badges.config.js';

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
