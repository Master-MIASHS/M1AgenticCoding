// Tests unitaires de la création d'un nouveau joueur (Groupe 1, tâche n°3, #133).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PLAYER_CONFIG } from '../../src/core/config/player.config.js';

describe('player.config', () => {
  it('fournit un capital de départ de 1000 par défaut', () => {
    assert.strictEqual(PLAYER_CONFIG.capitalDeDepart, 1000);
  });

  it('ne peut pas être modifiée par erreur', () => {
    assert.ok(Object.isFrozen(PLAYER_CONFIG));
  });
});
