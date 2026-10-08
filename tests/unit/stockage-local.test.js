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
