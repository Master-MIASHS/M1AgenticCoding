// Âge minimum vérifié par le Core quand l'UI crée le profil via coreService
// (Groupe 1, #339) : le refus ne dépend pas du formulaire du G4.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { creerProfil, getState } from '../../src/services/coreService.js';

/**
 * Date de naissance au format AAAA-MM-JJ, `ans` années avant aujourd'hui (UTC).
 * @param {number} ans - Nombre d'années.
 * @param {number} [decalageJours] - Jours ajoutés (positif = plus jeune).
 * @returns {string} Date de naissance.
 */
function neIlYA(ans, decalageJours = 0) {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - ans);
  date.setUTCDate(date.getUTCDate() + decalageJours);
  return date.toISOString().slice(0, 10);
}

describe('creerProfil via coreService : 18 ans révolus', () => {
  it('refuse un mineur sans rien enregistrer', () => {
    const avant = getState();
    assert.throws(() => creerProfil({ pseudo: 'Léa', dateNaissance: neIlYA(17) }), /18 ans/);
    assert.throws(() => creerProfil({ pseudo: 'Léa', dateNaissance: neIlYA(18, 1) }), /18 ans/);
    assert.deepStrictEqual(getState(), avant);
  });

  it('crée le profil d’une personne majeure', () => {
    const etat = creerProfil({ pseudo: 'Léa', dateNaissance: neIlYA(18, -1) });
    assert.strictEqual(etat.pseudo, 'Léa');
    assert.strictEqual(etat.birthDate, neIlYA(18, -1));
  });
});
