// Tests des réglages admin partagés et enregistrés (Groupe 1, #260) :
// capital de départ et événements bonus. Un faux localStorage simule le
// navigateur ; réimporter un module (URL différente) simule un rechargement.

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

const navigateur = new Map();
let numeroDeChargement = 0;

before(() => {
  globalThis.localStorage = {
    getItem: (cle) => (navigateur.has(cle) ? navigateur.get(cle) : null),
    setItem: (cle, valeur) => navigateur.set(cle, String(valeur)),
  };
});

/**
 * Recharge un module comme après un rechargement de la page.
 * @param {string} chemin - Chemin du module depuis ce fichier.
 * @returns {Promise<object>} Nouvelle instance du module.
 */
function recharger(chemin) {
  numeroDeChargement += 1;
  return import(`${chemin}?chargement=${numeroDeChargement}`);
}

/**
 * Exécute du code en masquant (et comptant) les avertissements console.
 * @param {function(): Promise<*>} fonction - Code à exécuter.
 * @returns {Promise<number>} Nombre d'avertissements.
 */
async function compterAvertissements(fonction) {
  let nombre = 0;
  const original = console.warn;
  console.warn = () => { nombre += 1; };
  try {
    await fonction();
  } finally {
    console.warn = original;
  }
  return nombre;
}

const EVENTS = '../../src/core/config/events.config.js';

describe('événements bonus partagés et enregistrés', () => {
  it('vaut 1 sans événement, puis suit l’événement lancé, même après rechargement', async () => {
    const events = await recharger(EVENTS);
    assert.strictEqual(events.getMultiplicateurBonus('gains'), 1);
    const maintenant = Date.now();
    events.lancerEvenementBonus({
      id: 'test-partage', cible: 'xp', multiplicateur: 2, debut: maintenant - 1000, fin: maintenant + 3_600_000,
    });
    assert.strictEqual(events.getMultiplicateurBonus('xp'), 2);
    assert.ok(navigateur.has('casino_config_evenements'));

    const apresRechargement = await recharger(EVENTS);
    assert.strictEqual(apresRechargement.getMultiplicateurBonus('xp'), 2);
    assert.deepStrictEqual(apresRechargement.getEvenementsBonus().map((e) => e.id), ['test-partage']);

    apresRechargement.arreterEvenementBonus('test-partage');
    assert.strictEqual((await recharger(EVENTS)).getMultiplicateurBonus('xp'), 1);
  });

  it('démarre sans événement si l’enregistrement est corrompu, sans planter', async () => {
    navigateur.set('casino_config_evenements', '[{"id":"","cible":"xp"}]');
    let events;
    const avertissements = await compterAvertissements(async () => {
      events = await recharger(EVENTS);
    });
    assert.strictEqual(avertissements, 1);
    assert.deepStrictEqual(events.getEvenementsBonus(), []);
    assert.strictEqual(events.getMultiplicateurBonus('gains'), 1);
  });
});
