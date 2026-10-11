// Tests de la modération minimale (Groupe 1, tâche n°34, #352) sur un faux
// état injecté : désactiver / réactiver le compte courant.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { estCompteDesactive, assertCompteActif, createModeration } from '../../src/core/moderation.js';

/**
 * Faux état : même interface que updateState de state.js.
 * @param {object} [initial] - Champs de l'état de départ.
 * @returns {{ lire: function(): object, updateState: function(function): object,
 *   ecritures: function(): number }} Faux état.
 */
function fauxEtat(initial = {}) {
  let etat = { balance: 400, bestBalance: 1000, xp: 30, level: 2, unlockedGames: ['slots'],
    history: [], role: 'moderator', ...initial };
  let nombre = 0;
  return {
    lire: () => structuredClone(etat),
    updateState: (calcul) => {
      etat = structuredClone(calcul(structuredClone(etat)));
      nombre += 1;
      return structuredClone(etat);
    },
    ecritures: () => nombre,
  };
}

describe('estCompteDesactive / assertCompteActif', () => {
  it('reconnaît un compte désactivé', () => {
    assert.strictEqual(estCompteDesactive({ isBanned: true }), true);
    assert.strictEqual(estCompteDesactive({ isBanned: false }), false);
    assert.strictEqual(estCompteDesactive({}), false);
  });

  it('refuse une action d’un compte désactivé', () => {
    assert.throws(() => assertCompteActif({ isBanned: true }), /désactivé/);
    assert.doesNotThrow(() => assertCompteActif({}));
  });
});

describe('setPlayerStatus', () => {
  it('désactive puis réactive le compte courant (modérateur)', () => {
    const etat = fauxEtat();
    const moderation = createModeration({ updateState: etat.updateState });

    assert.strictEqual(moderation.setPlayerStatus('banned'), 'banned');
    assert.strictEqual(etat.lire().isBanned, true);
    assert.strictEqual(moderation.setPlayerStatus('active'), 'active');
    assert.strictEqual(etat.lire().isBanned, false);
  });

  it('accepte aussi un admin (rôles cumulatifs)', () => {
    const etat = fauxEtat({ role: 'admin' });
    createModeration({ updateState: etat.updateState }).setPlayerStatus('banned');
    assert.strictEqual(etat.lire().isBanned, true);
  });

  it('garde le solde, l’XP, le niveau, les jeux et l’historique', () => {
    const etat = fauxEtat();
    const avant = etat.lire();
    createModeration({ updateState: etat.updateState }).setPlayerStatus('banned');
    assert.deepStrictEqual(etat.lire(), { ...avant, isBanned: true });
  });

  it('refuse un joueur sans rien modifier', () => {
    const etat = fauxEtat({ role: 'player' });
    const avant = etat.lire();
    assert.throws(() => createModeration({ updateState: etat.updateState }).setPlayerStatus('banned'),
      /permission/);
    assert.deepStrictEqual(etat.lire(), avant);
  });

  it('refuse un statut inconnu sans écrire', () => {
    const etat = fauxEtat();
    for (const statut of ['ban', '', null, true, undefined]) {
      assert.throws(() => createModeration({ updateState: etat.updateState }).setPlayerStatus(statut),
        TypeError, String(statut));
    }
    assert.strictEqual(etat.ecritures(), 0);
  });
});
