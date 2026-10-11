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
    assert.deepStrictEqual(
      coreService.getShopCatalog().map((article) => article.id),
      ['avatar_chapeau', 'theme_nuit', 'effect_confettis', 'badge_fidele'],
    );
    assert.deepStrictEqual(coreService.getShopInventory(), { ownedItemIds: [] });
  });

  it('refuse un article inconnu sans toucher au solde', () => {
    const avant = coreService.getBalance();
    const resultat = coreService.purchaseShopItem('inconnu');
    assert.strictEqual(resultat.status, 'rejected');
    assert.strictEqual(resultat.balance, avant);
    assert.strictEqual(coreService.getBalance(), avant);
  });

  it('achète un article du catalogue avec le solde du joueur (#325)', () => {
    const avant = coreService.getBalance();
    const resultat = coreService.purchaseShopItem('avatar_chapeau');
    assert.strictEqual(resultat.status, 'purchased');
    assert.strictEqual(coreService.getBalance(), avant - 200);
    assert.deepStrictEqual(coreService.getShopInventory(), { ownedItemIds: ['avatar_chapeau'] });
    assert.strictEqual(coreService.purchaseShopItem('avatar_chapeau').status, 'already-owned');
  });
});
