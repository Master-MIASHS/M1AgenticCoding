// Tests de la boutique exposée par la façade du Core (Groupe 1, #205) :
// contrat proposé par le G4 (src/pages/Shop/SHOP_CORE_CONTRACT.md).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../src/services/coreService.js';

describe('boutique via coreService (vrai état du Core)', () => {
  it('expose les trois opérations du contrat du G4', () => {
    for (const fn of ['getShopCatalog', 'getShopInventory', 'purchaseShopItem']) {
      assert.strictEqual(typeof coreService[fn], 'function', fn);
    }
  });

  it('lit le catalogue de la config et un inventaire vide au départ', () => {
    assert.deepStrictEqual(coreService.getShopCatalog(), []);
    assert.deepStrictEqual(coreService.getShopInventory(), { ownedItemIds: [] });
  });

  it('refuse un article inconnu sans toucher au solde', () => {
    const avant = coreService.getBalance();
    const resultat = coreService.purchaseShopItem('inconnu');
    assert.strictEqual(resultat.status, 'rejected');
    assert.strictEqual(resultat.balance, avant);
    assert.strictEqual(coreService.getBalance(), avant);
  });
});
