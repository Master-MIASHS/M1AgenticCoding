// Configuration des jeux enregistrée (Groupe 1, #350) : un faux localStorage
// simule le navigateur ; réimporter le module simule un rechargement de page.

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

const CLE = 'casino_config_jeux';
const navigateur = new Map();
let numeroDeChargement = 0;

before(() => {
  globalThis.localStorage = {
    getItem: (cle) => (navigateur.has(cle) ? navigateur.get(cle) : null),
    setItem: (cle, valeur) => navigateur.set(cle, String(valeur)),
  };
});

/**
 * Recharge games.config.js comme après un rechargement de la page.
 * @returns {Promise<object>} Nouvelle instance du module.
 */
function recharger() {
  numeroDeChargement += 1;
  return import(`../../src/core/config/games.config.js?chargement=${numeroDeChargement}`);
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

describe('configuration des jeux enregistrée (#350)', () => {
  it('garde la configuration réglée après un rechargement', async () => {
    const avant = await recharger();
    avant.setGameConfig('roulette', { multipliers: { red: 2 } });
    assert.ok(navigateur.has(CLE));

    const apres = await recharger();
    assert.deepStrictEqual(apres.getGameConfig('roulette'), { probabilities: {}, multipliers: { red: 2 } });
    assert.deepStrictEqual(apres.getGameConfig('slots'), { probabilities: {}, multipliers: {} });
  });

  it('n’écrit rien quand la configuration est refusée', async () => {
    const module = await recharger();
    const enregistre = navigateur.get(CLE);
    assert.throws(() => module.setGameConfig('roulette', { multipliers: { red: -1 } }), RangeError);
    assert.strictEqual(navigateur.get(CLE), enregistre);
  });

  for (const [cas, valeur] of [
    ['JSON illisible', '{pas du json'],
    ['jeu inconnu', JSON.stringify({ inconnu: { probabilities: {}, multipliers: {} } })],
    ['clé héritée', '{"__proto__":{"probabilities":{},"multipliers":{}}}'],
    ['section inconnue', JSON.stringify({ roulette: { triche: {} } })],
    ['nombre invalide', JSON.stringify({ roulette: { probabilities: { win: -1 }, multipliers: {} } })],
  ]) {
    it(`démarre avec une configuration vide sur une valeur corrompue (${cas}), avec un avertissement`, async () => {
      navigateur.set(CLE, valeur);
      let module;
      const avertissements = await compterAvertissements(async () => { module = await recharger(); });
      assert.strictEqual(avertissements, 1);
      assert.deepStrictEqual(module.getGameConfig('roulette'), { probabilities: {}, multipliers: {} });
      assert.strictEqual(navigateur.get(CLE), valeur);
    });
  }
});
