// Tests unitaires de la création d'un nouveau joueur (Groupe 1, tâche n°3, #133).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PLAYER_CONFIG } from '../../src/core/config/player.config.js';
import { validerPseudo, validerDateNaissance } from '../../src/core/player.js';

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

describe('validerDateNaissance', () => {
  // Date de référence fixe : les tests ne dépendent pas du jour d'exécution.
  const maintenant = new Date('2026-10-05T12:00:00Z');

  it('accepte une date valide au format AAAA-MM-JJ', () => {
    assert.strictEqual(validerDateNaissance('2000-05-17', maintenant), '2000-05-17');
    assert.strictEqual(validerDateNaissance('2024-02-29', maintenant), '2024-02-29');
    assert.strictEqual(validerDateNaissance('2026-10-05', maintenant), '2026-10-05');
  });

  it('renvoie null quand la date n\'est pas fournie', () => {
    assert.strictEqual(validerDateNaissance(null, maintenant), null);
    assert.strictEqual(validerDateNaissance(undefined, maintenant), null);
  });

  it('rejette un format invalide', () => {
    for (const date of ['17/05/2000', '2000-5-17', '', 20000517, {}]) {
      assert.throws(() => validerDateNaissance(date, maintenant), /date/);
    }
  });

  it('rejette une date qui n\'existe pas dans le calendrier', () => {
    for (const date of ['2023-02-29', '2000-13-01', '2000-04-31', '2000-00-10']) {
      assert.throws(() => validerDateNaissance(date, maintenant), /date/);
    }
  });

  it('rejette une date dans le futur', () => {
    assert.throws(() => validerDateNaissance('2026-10-06', maintenant), /date/);
  });
});
