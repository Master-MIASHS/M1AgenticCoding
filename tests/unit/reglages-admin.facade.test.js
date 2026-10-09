// Tests des réglages admin exposés par la façade du Core (Groupe 1, #260) :
// lectures publiques, réglages réservés à l'admin (n°24), aucune option
// injectable (leçon de #227).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../src/services/coreService.js';
import { updateState } from '../../src/core/state.js';

/**
 * Événement de test en cours (données de test, pas un contenu décidé).
 * @param {string} id - Identifiant.
 * @returns {object} Événement actif pendant une heure.
 */
function evenementEnCours(id) {
  const maintenant = Date.now();
  return { id, cible: 'gains', multiplicateur: 2, debut: maintenant - 1000, fin: maintenant + 3_600_000 };
}

describe('réglages admin via coreService', () => {
  it('expose les lectures et les réglages', () => {
    for (const fn of ['getStartingCapital', 'setStartingCapital', 'getEvenementsBonus',
      'getMultiplicateurBonus', 'lancerEvenementBonus', 'arreterEvenementBonus']) {
      assert.strictEqual(typeof coreService[fn], 'function', fn);
    }
  });

  it('refuse les réglages à un joueur, sans rien modifier', () => {
    assert.strictEqual(coreService.getState().role, 'player');
    assert.throws(() => coreService.setStartingCapital(500), /permission/);
    assert.throws(() => coreService.lancerEvenementBonus(evenementEnCours('refuse')), /permission/);
    assert.throws(() => coreService.arreterEvenementBonus('refuse'), /permission/);
    assert.strictEqual(coreService.getStartingCapital(), 1000);
    assert.deepStrictEqual(coreService.getEvenementsBonus(), []);
    assert.strictEqual(coreService.getMultiplicateurBonus('gains'), 1);
  });

  it('accepte les réglages d’un admin, lus dans l’état du Core', () => {
    updateState((etat) => ({ ...etat, role: 'admin' }));
    try {
      assert.strictEqual(coreService.setStartingCapital(500), 500);
      assert.strictEqual(coreService.getStartingCapital(), 500);
      coreService.lancerEvenementBonus(evenementEnCours('admin'));
      assert.strictEqual(coreService.getMultiplicateurBonus('gains'), 2);
      coreService.arreterEvenementBonus('admin');
      assert.strictEqual(coreService.getMultiplicateurBonus('gains'), 1);
    } finally {
      updateState((etat) => ({ ...etat, role: 'player' }));
    }
  });

  it('n’accepte aucune option injectée par l’appelant', () => {
    updateState((etat) => ({ ...etat, role: 'admin' }));
    try {
      coreService.lancerEvenementBonus(evenementEnCours('options'), { now: () => 0 });
      // Une horloge injectée (now = 0) masquerait l'événement : elle est ignorée.
      assert.strictEqual(coreService.getMultiplicateurBonus('gains', { now: () => 0 }), 2);
      coreService.arreterEvenementBonus('options');
    } finally {
      updateState((etat) => ({ ...etat, role: 'player' }));
    }
  });
});
