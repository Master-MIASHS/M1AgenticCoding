// Tests unitaires de la boutique côté Core (Groupe 1, tâche n°37, #205).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { SHOP_CONFIG } from '../../src/core/config/shop.config.js';
import { validerCatalogue, createShop } from '../../src/core/shop.js';

describe('shop.config', () => {
  it('fournit un catalogue vide par défaut (contenu de la boutique non décidé)', () => {
    assert.deepStrictEqual(SHOP_CONFIG.catalogue, []);
  });

  it('ne peut pas être modifiée par erreur', () => {
    assert.ok(Object.isFrozen(SHOP_CONFIG));
    assert.ok(Object.isFrozen(SHOP_CONFIG.catalogue));
  });
});

/**
 * Construit un article valide du catalogue, modifiable.
 * Articles de test uniquement : ils ne fixent pas le contenu de la boutique.
 * @param {object} [changements] - Champs à remplacer.
 * @returns {object} Article de test.
 */
function article(changements = {}) {
  return {
    id: 'article-test',
    name: 'Article de test',
    description: 'Article utilisé par les tests.',
    category: 'test',
    price: 200,
    available: true,
    ...changements,
  };
}

describe('validerCatalogue', () => {
  it('accepte un catalogue valide, vide ou avec un visuel facultatif', () => {
    assert.doesNotThrow(() => validerCatalogue([]));
    assert.doesNotThrow(() =>
      validerCatalogue([article(), article({ id: 'gratuit', price: 0, visual: '✦' })]),
    );
  });

  it('rejette un catalogue qui n’est pas un tableau', () => {
    for (const catalogue of [null, undefined, {}, 'catalogue']) {
      assert.throws(() => validerCatalogue(catalogue), /validerCatalogue/);
    }
  });

  it('rejette un article mal formé', () => {
    const invalides = [
      null,
      article({ id: '' }),
      article({ id: 42 }),
      article({ name: undefined }),
      article({ description: null }),
      article({ category: 3 }),
      article({ price: 1.5 }),
      article({ price: -1 }),
      article({ price: '200' }),
      article({ price: Infinity }),
      article({ available: 'oui' }),
      article({ visual: 7 }),
    ];
    for (const a of invalides) {
      assert.throws(() => validerCatalogue([a]), /validerCatalogue/, JSON.stringify(a));
    }
  });

  it('rejette deux articles de même identifiant', () => {
    assert.throws(
      () => validerCatalogue([article(), article({ name: 'Doublon' })]),
      /validerCatalogue : identifiant en double article-test/,
    );
  });
});

/**
 * Faux stockage qui imite le contrat de updateState (#139) : le callback
 * reçoit une copie et renvoie l'état complet, enregistré d'un seul coup.
 * @param {object} [etatInitial] - Champs de l'état à remplacer.
 * @returns {{ getState: function(): object, updateState: function(function(object): object): object,
 *   ecritures: function(): number }} Stockage de test.
 */
function fauxStockage(etatInitial = {}) {
  let etat = {
    balance: 1000,
    bestBalance: 1500,
    xp: 120,
    level: 3,
    unlockedGames: ['slots', 'dice'],
    history: [],
    role: 'player',
    ...etatInitial,
  };
  let nombreEcritures = 0;
  return {
    getState: () => structuredClone(etat),
    updateState: (calcul) => {
      const suivant = structuredClone(calcul(structuredClone(etat)));
      etat = suivant;
      nombreEcritures += 1;
      return structuredClone(etat);
    },
    ecritures: () => nombreEcritures,
  };
}

describe('createShop', () => {
  it('rejette un stockage invalide', () => {
    for (const stockage of [undefined, null, {}, { getState: () => ({}) }, { updateState: () => ({}) }]) {
      assert.throws(() => createShop(stockage), /createShop/);
    }
  });

  it('rejette un catalogue invalide', () => {
    assert.throws(
      () => createShop(fauxStockage(), { catalogue: [article({ price: -5 })] }),
      /validerCatalogue/,
    );
  });
});

describe('getShopCatalog', () => {
  it('lit le catalogue de la config par défaut', () => {
    assert.deepStrictEqual(createShop(fauxStockage()).getShopCatalog(), SHOP_CONFIG.catalogue);
  });

  it('renvoie une copie indépendante du catalogue fourni', () => {
    const catalogue = [article(), article({ id: 'visuel', visual: '✦' })];
    const boutique = createShop(fauxStockage(), { catalogue });
    const lu = boutique.getShopCatalog();
    assert.deepStrictEqual(lu, catalogue);
    lu[0].price = 0;
    lu.push(article({ id: 'ajout' }));
    catalogue[1].price = 1;
    assert.deepStrictEqual(boutique.getShopCatalog(), [article(), article({ id: 'visuel', visual: '✦' })]);
  });
});

describe('getShopInventory', () => {
  it('renvoie un inventaire vide si le joueur n’a rien acheté', () => {
    assert.deepStrictEqual(createShop(fauxStockage()).getShopInventory(), { ownedItemIds: [] });
  });

  it('renvoie une copie indépendante de l’inventaire de l’état', () => {
    const boutique = createShop(fauxStockage({ ownedItemIds: ['a', 'b'] }));
    const inventaire = boutique.getShopInventory();
    assert.deepStrictEqual(inventaire, { ownedItemIds: ['a', 'b'] });
    inventaire.ownedItemIds.push('c');
    assert.deepStrictEqual(boutique.getShopInventory(), { ownedItemIds: ['a', 'b'] });
  });

  it('relit l’état à chaque appel', () => {
    const stockage = fauxStockage();
    const boutique = createShop(stockage);
    stockage.updateState((etat) => ({ ...etat, ownedItemIds: ['restaure'] }));
    assert.deepStrictEqual(boutique.getShopInventory(), { ownedItemIds: ['restaure'] });
  });

  it('rejette un inventaire corrompu dans l’état', () => {
    for (const ownedItemIds of [null, 'a', [1], ['a', 'a']]) {
      const boutique = createShop(fauxStockage({ ownedItemIds }));
      assert.throws(() => boutique.getShopInventory(), /inventaire/, JSON.stringify(ownedItemIds));
    }
  });
});

/**
 * Vérifie un achat refusé : statut attendu, solde inchangé, aucune écriture.
 * @param {object} resultat - Réponse de purchaseShopItem.
 * @param {string} status - Statut attendu.
 * @param {*} itemId - Identifiant demandé.
 * @param {ReturnType<typeof fauxStockage>} stockage - Stockage de test.
 * @param {number} solde - Solde attendu (inchangé).
 */
function verifierRefus(resultat, status, itemId, stockage, solde) {
  assert.strictEqual(resultat.status, status);
  assert.strictEqual(resultat.itemId, itemId);
  assert.strictEqual(resultat.balance, solde);
  assert.strictEqual(typeof resultat.message, 'string');
  assert.strictEqual(stockage.ecritures(), 0);
  assert.strictEqual(stockage.getState().balance, solde);
}

describe('purchaseShopItem : refus', () => {
  const catalogue = [article(), article({ id: 'indisponible', available: false })];

  it('rejected pour un article inconnu ou un identifiant invalide, sans écriture', () => {
    for (const itemId of ['inconnu', '', 42, null, undefined]) {
      const stockage = fauxStockage();
      const resultat = createShop(stockage, { catalogue }).purchaseShopItem(itemId);
      verifierRefus(resultat, 'rejected', itemId, stockage, 1000);
    }
  });

  it('unavailable pour un article indisponible, sans écriture', () => {
    const stockage = fauxStockage();
    const resultat = createShop(stockage, { catalogue }).purchaseShopItem('indisponible');
    verifierRefus(resultat, 'unavailable', 'indisponible', stockage, 1000);
  });
});
