// Tests unitaires de la création d'un nouveau joueur (Groupe 1, tâche n°3, #133).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PLAYER_CONFIG } from '../../src/core/config/player.config.js';
import { validerPseudo } from '../../src/core/player.js';

describe('player.config', () => {
  it('fournit un capital de départ de 1000 par défaut', () => {
    assert.strictEqual(PLAYER_CONFIG.capitalDeDepart, 1000);
  });

  it('ne peut pas être modifiée par erreur', () => {
    assert.ok(Object.isFrozen(PLAYER_CONFIG));
  });
});

describe('validerPseudo', () => {
  it('renvoie le pseudo sans espaces superflus', () => {
    assert.strictEqual(validerPseudo('alice'), 'alice');
    assert.strictEqual(validerPseudo('  Bob 42  '), 'Bob 42');
  });

  it('rejette une valeur qui n\'est pas une chaîne', () => {
    for (const pseudo of [undefined, null, 42, {}, ['alice']]) {
      assert.throws(() => validerPseudo(pseudo), /pseudo/);
    }
  });

  it('rejette un pseudo vide ou composé uniquement d\'espaces', () => {
    for (const pseudo of ['', '   ', '\t\n']) {
      assert.throws(() => validerPseudo(pseudo), /pseudo/);
    }
  });
});
