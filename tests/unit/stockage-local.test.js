// Tests unitaires du stockage local des réglages admin (Groupe 1, #260).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createStockageLocal } from '../../src/core/config/stockage-local.js';

/**
 * Faux localStorage en mémoire (Map), pour simuler le navigateur.
 * @param {Object<string, string>} [initial] - Contenu de départ.
 * @returns {{ getItem: function(string): (string|null), setItem: function(string, string): void,
 *   donnees: Map<string, string> }} Faux stockage.
 */
function fauxLocalStorage(initial = {}) {
  const donnees = new Map(Object.entries(initial));
  return {
    getItem: (cle) => (donnees.has(cle) ? donnees.get(cle) : null),
    setItem: (cle, valeur) => donnees.set(cle, String(valeur)),
    donnees,
  };
}

describe('createStockageLocal : lecture et écriture', () => {
  it('renvoie la valeur par défaut quand la clé est absente', () => {
    const stockage = createStockageLocal('cle-test', { a: 1 }, { stockage: fauxLocalStorage() });
    assert.deepStrictEqual(stockage.read(), { a: 1 });
  });

  it('enregistre en JSON et relit la valeur, même depuis un nouveau stockage', () => {
    const navigateur = fauxLocalStorage();
    createStockageLocal('cle-test', [], { stockage: navigateur }).write([1, 2]);
    assert.strictEqual(navigateur.donnees.get('cle-test'), '[1,2]');
    assert.deepStrictEqual(createStockageLocal('cle-test', [], { stockage: navigateur }).read(), [1, 2]);
  });

  it('renvoie des copies indépendantes', () => {
    const stockage = createStockageLocal('cle-test', { liste: [] }, { stockage: fauxLocalStorage() });
    stockage.read().liste.push('modifie');
    const ecrit = { liste: ['a'] };
    stockage.write(ecrit);
    ecrit.liste.push('apres');
    assert.deepStrictEqual(stockage.read(), { liste: ['a'] });
  });

  it('garde la valeur en mémoire seule sans localStorage', () => {
    const stockage = createStockageLocal('cle-test', 0, { stockage: undefined });
    stockage.write(42);
    assert.strictEqual(stockage.read(), 42);
  });

  it('rejette une clé invalide', () => {
    for (const cle of ['', 3, null]) {
      assert.throws(() => createStockageLocal(cle, 0), /stockage-local/);
    }
  });
});

/**
 * Exécute une fonction en capturant les avertissements console.
 * @param {function(): *} fonction - Code à exécuter.
 * @returns {{ resultat: *, avertissements: Array<Array<*>> }} Résultat et avertissements.
 */
function avecAvertissements(fonction) {
  const avertissements = [];
  const original = console.warn;
  console.warn = (...args) => avertissements.push(args);
  try {
    return { resultat: fonction(), avertissements };
  } finally {
    console.warn = original;
  }
}

describe('createStockageLocal : ne jamais planter au chargement', () => {
  const valider = (valeur) => {
    if (!Array.isArray(valeur)) throw new Error('tableau attendu');
  };

  it('JSON illisible : avertissement, valeur par défaut, clé conservée', () => {
    const navigateur = fauxLocalStorage({ 'cle-test': '{pas du json' });
    const { resultat, avertissements } = avecAvertissements(
      () => createStockageLocal('cle-test', [], { stockage: navigateur, valider }).read(),
    );
    assert.deepStrictEqual(resultat, []);
    assert.strictEqual(avertissements.length, 1);
    assert.match(String(avertissements[0][0]), /cle-test/);
    assert.strictEqual(navigateur.donnees.get('cle-test'), '{pas du json');
  });

  it('contenu refusé par valider : avertissement, valeur par défaut, clé conservée', () => {
    const navigateur = fauxLocalStorage({ 'cle-test': '{"pas":"un tableau"}' });
    const { resultat, avertissements } = avecAvertissements(
      () => createStockageLocal('cle-test', [], { stockage: navigateur, valider }).read(),
    );
    assert.deepStrictEqual(resultat, []);
    assert.strictEqual(avertissements.length, 1);
    assert.strictEqual(navigateur.donnees.get('cle-test'), '{"pas":"un tableau"}');
  });

  it('localStorage inaccessible en lecture : avertissement, valeur par défaut', () => {
    const bloque = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => {} };
    const { resultat, avertissements } = avecAvertissements(
      () => createStockageLocal('cle-test', 7, { stockage: bloque }).read(),
    );
    assert.strictEqual(resultat, 7);
    assert.strictEqual(avertissements.length, 1);
  });

  it('valide aussi les valeurs écrites, sans rien enregistrer en cas de refus', () => {
    const navigateur = fauxLocalStorage();
    const stockage = createStockageLocal('cle-test', [], { stockage: navigateur, valider });
    assert.throws(() => stockage.write('pas un tableau'), /tableau attendu/);
    assert.strictEqual(navigateur.donnees.has('cle-test'), false);
    assert.deepStrictEqual(stockage.read(), []);
  });

  it('une écriture qui échoue lève une erreur et ne change rien', () => {
    const plein = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
    const stockage = createStockageLocal('cle-test', [1], { stockage: plein });
    assert.throws(() => stockage.write([2]), /QuotaExceededError/);
    assert.deepStrictEqual(stockage.read(), [1]);
  });
});
