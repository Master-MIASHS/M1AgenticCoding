// Tests de l'instance partagée des niveaux de déblocage (Groupe 1, #314).
// Un faux localStorage simule le navigateur ; réimporter le module (URL
// différente) simule un rechargement de la page, comme reglages-admin.test.js.

import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

import { GAMES } from '../../src/core/config/games.config.js';

const CLE = 'casino_config_deblocage';
const MODULE = '../../src/core/config/unlock.config.js';
const navigateur = new Map();
let ecritures = 0;
let numeroDeChargement = 0;
let descripteurInitial;

const NIVEAUX_PAR_DEFAUT = Object.fromEntries(
  Object.entries(GAMES).map(([gameId, game]) => [gameId, game.unlockLevel])
);

before(() => {
  descripteurInitial = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (cle) => (navigateur.has(cle) ? navigateur.get(cle) : null),
      setItem: (cle, valeur) => {
        ecritures += 1;
        navigateur.set(cle, String(valeur));
      },
    },
  });
});

after(() => {
  if (descripteurInitial) Object.defineProperty(globalThis, 'localStorage', descripteurInitial);
  else delete globalThis.localStorage;
});

beforeEach(() => {
  navigateur.clear();
  ecritures = 0;
});

/**
 * Recharge le module comme après un rechargement de la page.
 * @returns {Promise<object>} Nouvelle instance du module.
 */
function recharger() {
  numeroDeChargement += 1;
  return import(`${MODULE}?chargement=${numeroDeChargement}`);
}

/**
 * Exécute du code en masquant (et comptant) les avertissements console.
 * @param {function(): Promise<*>} fonction - Code à exécuter.
 * @returns {Promise<number>} Nombre d'avertissements.
 */
async function compterAvertissements(fonction) {
  let nombre = 0;
  const original = console.warn;
  console.warn = () => {
    nombre += 1;
  };
  try {
    await fonction();
  } finally {
    console.warn = original;
  }
  return nombre;
}

describe('niveaux de déblocage partagés et enregistrés', () => {
  it('reprend les niveaux de GAMES tant que rien n’est réglé', async () => {
    const unlock = await recharger();
    assert.deepEqual(unlock.getEffectiveUnlockLevels(), NIVEAUX_PAR_DEFAUT);
    assert.equal(unlock.getEffectiveUnlockLevel('poker'), GAMES.poker.unlockLevel);
    assert.equal(ecritures, 0);
  });

  it('enregistre un niveau réglé et le retrouve après rechargement', async () => {
    const unlock = await recharger();
    assert.equal(unlock.setEffectiveUnlockLevel('roulette', 8), 8);
    assert.equal(unlock.getEffectiveUnlockLevel('roulette'), 8);
    assert.deepEqual(JSON.parse(navigateur.get(CLE)), { roulette: 8 });

    const apresRechargement = await recharger();
    assert.equal(apresRechargement.getEffectiveUnlockLevel('roulette'), 8);
    assert.equal(apresRechargement.getEffectiveUnlockLevel('poker'), GAMES.poker.unlockLevel);
  });

  it('refuse un réglage invalide sans rien enregistrer', async () => {
    const unlock = await recharger();
    unlock.setEffectiveUnlockLevel('dice', 2);
    const avant = navigateur.get(CLE);
    const ecrituresAvant = ecritures;
    assert.throws(() => unlock.setEffectiveUnlockLevel('inconnu', 3), /jeu inconnu/);
    for (const niveau of [0, -1, 1.5, '3', null]) {
      assert.throws(() => unlock.setEffectiveUnlockLevel('dice', niveau), RangeError);
    }
    assert.equal(ecritures, ecrituresAvant);
    assert.equal(navigateur.get(CLE), avant);
    assert.equal(unlock.getEffectiveUnlockLevel('dice'), 2);
  });

  it('renvoie une copie indépendante et ne modifie jamais GAMES', async () => {
    const avant = structuredClone(GAMES);
    const unlock = await recharger();
    unlock.setEffectiveUnlockLevel('slots', 3);
    const niveaux = unlock.getEffectiveUnlockLevels();
    niveaux.slots = 99;
    assert.equal(unlock.getEffectiveUnlockLevel('slots'), 3);
    assert.deepEqual(GAMES, avant);
  });

  for (const [cas, contenu] of Object.entries({
    'un JSON illisible': '{ pas du json',
    'un jeu inconnu': JSON.stringify({ inconnu: 3 }),
    'un niveau invalide': JSON.stringify({ roulette: 0 }),
    'un tableau': JSON.stringify([5]),
  })) {
    it(`démarre avec les niveaux de GAMES pour ${cas}, sans planter ni effacer la clé`, async () => {
      navigateur.set(CLE, contenu);
      let unlock;
      const avertissements = await compterAvertissements(async () => {
        unlock = await recharger();
      });
      assert.equal(avertissements, 1);
      assert.deepEqual(unlock.getEffectiveUnlockLevels(), NIVEAUX_PAR_DEFAUT);
      assert.equal(navigateur.get(CLE), contenu);
      assert.equal(ecritures, 0);
    });
  }

  it('remplace une clé corrompue au premier réglage réussi', async () => {
    navigateur.set(CLE, '{ pas du json');
    let unlock;
    await compterAvertissements(async () => {
      unlock = await recharger();
    });
    unlock.setEffectiveUnlockLevel('plinko', 3);
    assert.deepEqual(JSON.parse(navigateur.get(CLE)), { plinko: 3 });
  });
});
