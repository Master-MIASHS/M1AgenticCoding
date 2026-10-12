import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { shopPreviewCatalog, shopPreviewScenarios } from '../../mocks/shop.mock.js';

test('Shop traduit le contrat public du Core sans calculer un achat', async (t) => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const {
      getItemStatus,
      getPurchaseFeedback,
      isPurchaseDisabled,
      readShopSnapshot,
      requestPurchase,
      shouldRefreshPlayerSnapshot,
    } = await server.ssrLoadModule('/src/pages/Shop/Shop.jsx');

    const article = shopPreviewCatalog[0];

    const service = ({ catalogue = [article], ownedItemIds = [], balance = 1000, purchase }) => ({
      getShopCatalog: () => catalogue,
      getShopInventory: () => ({ ownedItemIds }),
      getBalance: () => balance,
      purchaseShopItem: purchase,
    });

    await t.test('conserve un catalogue Core vide comme état distinct', () => {
      assert.deepEqual(
        readShopSnapshot(service({ catalogue: shopPreviewScenarios.empty.catalogue })),
        {
          catalogue: shopPreviewScenarios.empty.catalogue,
          ownedItemIds: [],
          balance: 1000,
        }
      );
    });

    await t.test('déduit les statuts depuis available et ownedItemIds', () => {
      assert.equal(getItemStatus(article, []), 'available');
      assert.equal(getItemStatus(article, [article.id]), 'owned');
      assert.equal(getItemStatus({ ...article, available: false }, [article.id]), 'unavailable');
      assert.equal(isPurchaseDisabled('available', null), false);
      assert.equal(isPurchaseDisabled('available', article.id), true);
      assert.equal(isPurchaseDisabled('owned', null), true);
    });

    await t.test("demande à l'application de relire le joueur seulement après un achat", () => {
      assert.equal(shouldRefreshPlayerSnapshot({ status: 'purchased' }), true);
      assert.equal(shouldRefreshPlayerSnapshot({ status: 'already-owned' }), false);
      assert.equal(shouldRefreshPlayerSnapshot({ status: 'unavailable' }), false);
      assert.equal(shouldRefreshPlayerSnapshot({ status: 'insufficient-funds' }), false);
      assert.equal(shouldRefreshPlayerSnapshot({ status: 'rejected' }), false);
    });

    await t.test('répercute achat, refus et inventaire tels que renvoyés par le Core', async () => {
      const cases = [
        {
          status: 'purchased',
          balance: 800,
          ownedItemIds: [article.id],
          message: 'Achat effectué.',
        },
        {
          status: 'already-owned',
          balance: 800,
          ownedItemIds: [article.id],
          message: 'Vous possédez déjà cet article.',
        },
        {
          status: 'unavailable',
          balance: 1000,
          ownedItemIds: [],
          message: "Cet article n'est pas disponible à l'achat.",
        },
        {
          status: 'insufficient-funds',
          balance: 100,
          ownedItemIds: [],
          message: 'Solde insuffisant pour acheter cet article.',
        },
        {
          status: 'rejected',
          balance: 1000,
          ownedItemIds: [],
          message: "Cet article n'existe pas dans la boutique.",
        },
      ];

      for (const expected of cases) {
        let requestedItemId = null;
        const shopService = service({
          balance: expected.balance,
          ownedItemIds: expected.ownedItemIds,
          purchase: async (itemId) => {
            requestedItemId = itemId;
            return { ...expected, itemId };
          },
        });
        const { result, ownedItemIds } = await requestPurchase(shopService, article.id);
        assert.equal(requestedItemId, article.id);
        assert.equal(result.status, expected.status);
        assert.equal(result.balance, expected.balance);
        assert.deepEqual(ownedItemIds, expected.ownedItemIds);
        assert.equal(getPurchaseFeedback(result), expected.message);
      }
    });

    await t.test("propage une erreur d'écriture sans produire de résultat d'achat", async () => {
      const shopService = service({
        purchase: () => {
          throw new Error('stockage indisponible');
        },
      });
      await assert.rejects(() => requestPurchase(shopService, article.id), /stockage indisponible/);
    });
  } finally {
    await server.close();
  }
});
