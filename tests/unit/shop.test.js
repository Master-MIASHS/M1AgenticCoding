// Tests unitaires de la boutique côté Core (Groupe 1, tâche n°37, #205).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { SHOP_CONFIG } from '../../src/core/config/shop.config.js';
import { validerCatalogue, createShop } from '../../src/core/shop.js';
import { getState, updateState } from '../../src/core/state.js';

describe('shop.config', () => {
  it('reprend les 4 articles de la maquette du G4 (#325)', () => {
    assert.deepStrictEqual(
      SHOP_CONFIG.catalogue.map(({ id, name, category, price, visual }) => ({ id, name, category, price, visual })),
      [
        { id: 'avatar_chapeau', name: 'Le Grand Chapeau', category: 'avatars', price: 200, visual: '🎩' },
        { id: 'theme_nuit', name: 'Nuit de velours', category: 'thèmes', price: 500, visual: '🌙' },
        { id: 'effect_confettis', name: 'Pluie de confettis', category: 'effets visuels', price: 750, visual: '🎉' },
        { id: 'badge_fidele', name: 'Habitué du Fantôme', category: 'badges', price: 350, visual: '👻' },
      ],
    );
  });

  it('propose les 4 articles à la vente, avec une description', () => {
    for (const article of SHOP_CONFIG.catalogue) {
      assert.strictEqual(article.available, true, article.id);
      assert.ok(article.description.length > 0, article.id);
    }
  });

  it('fournit un catalogue valide', () => {
    assert.doesNotThrow(() => validerCatalogue(SHOP_CONFIG.catalogue));
  });

  it('ne peut pas être modifiée par erreur', () => {
    assert.ok(Object.isFrozen(SHOP_CONFIG));
    assert.ok(Object.isFrozen(SHOP_CONFIG.catalogue));
    for (const article of SHOP_CONFIG.catalogue) {
      assert.ok(Object.isFrozen(article), article.id);
    }
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

describe('purchaseShopItem : déjà possédé ou solde insuffisant', () => {
  it('already-owned pour un article déjà dans l’inventaire, sans écriture', () => {
    const stockage = fauxStockage({ ownedItemIds: ['article-test'] });
    const resultat = createShop(stockage, { catalogue: [article()] }).purchaseShopItem('article-test');
    verifierRefus(resultat, 'already-owned', 'article-test', stockage, 1000);
  });

  it('insufficient-funds si le solde est inférieur au prix, sans écriture', () => {
    const stockage = fauxStockage({ balance: 199 });
    const resultat = createShop(stockage, { catalogue: [article()] }).purchaseShopItem('article-test');
    verifierRefus(resultat, 'insufficient-funds', 'article-test', stockage, 199);
  });

  it('vérifie la possession avant le solde', () => {
    const stockage = fauxStockage({ balance: 0, ownedItemIds: ['article-test'] });
    const resultat = createShop(stockage, { catalogue: [article()] }).purchaseShopItem('article-test');
    assert.strictEqual(resultat.status, 'already-owned');
  });
});

describe('purchaseShopItem : achat réussi', () => {
  it('purchased : débite le solde et ajoute l’article en une seule écriture', () => {
    const stockage = fauxStockage({ ownedItemIds: ['autre'] });
    const boutique = createShop(stockage, { catalogue: [article()] });
    const resultat = boutique.purchaseShopItem('article-test');
    assert.strictEqual(resultat.status, 'purchased');
    assert.strictEqual(resultat.itemId, 'article-test');
    assert.strictEqual(resultat.balance, 800);
    assert.strictEqual(stockage.ecritures(), 1);
    assert.strictEqual(stockage.getState().balance, 800);
    assert.deepStrictEqual(boutique.getShopInventory(), { ownedItemIds: ['autre', 'article-test'] });
  });

  it('accepte un solde égal au prix et un article gratuit', () => {
    const stockage = fauxStockage({ balance: 200 });
    const catalogue = [article(), article({ id: 'gratuit', price: 0 })];
    const boutique = createShop(stockage, { catalogue });
    assert.strictEqual(boutique.purchaseShopItem('article-test').balance, 0);
    assert.strictEqual(boutique.purchaseShopItem('gratuit').status, 'purchased');
    assert.deepStrictEqual(boutique.getShopInventory(), { ownedItemIds: ['article-test', 'gratuit'] });
  });

  it('ne modifie ni le meilleur solde, ni l’XP, ni le niveau, ni le reste de l’état', () => {
    const stockage = fauxStockage();
    const avant = stockage.getState();
    createShop(stockage, { catalogue: [article()] }).purchaseShopItem('article-test');
    const { balance, ownedItemIds, ...reste } = stockage.getState();
    const { balance: soldeAvant, ...resteAvant } = avant;
    assert.strictEqual(balance, soldeAvant - 200);
    assert.deepStrictEqual(ownedItemIds, ['article-test']);
    assert.deepStrictEqual(reste, resteAvant);
  });

  it('un second achat du même article est refusé', () => {
    const stockage = fauxStockage();
    const boutique = createShop(stockage, { catalogue: [article()] });
    boutique.purchaseShopItem('article-test');
    assert.strictEqual(boutique.purchaseShopItem('article-test').status, 'already-owned');
    assert.strictEqual(stockage.getState().balance, 800);
  });

  it('propage une erreur d’écriture sans annoncer d’achat', () => {
    const stockage = fauxStockage();
    const enPanne = {
      getState: stockage.getState,
      updateState: () => {
        throw new Error('state: échec du stockage');
      },
    };
    const boutique = createShop(enPanne, { catalogue: [article()] });
    assert.throws(() => boutique.purchaseShopItem('article-test'), /échec du stockage/);
    assert.strictEqual(stockage.getState().balance, 1000);
  });
});

describe('purchaseShopItem avec le vrai état du Core', () => {
  it('fonctionne avec getState / updateState de state.js (#139)', () => {
    const boutique = createShop({ getState, updateState }, { catalogue: [article()] });
    const avant = getState();
    const resultat = boutique.purchaseShopItem('article-test');
    assert.strictEqual(resultat.status, 'purchased');
    assert.strictEqual(getState().balance, avant.balance - 200);
    assert.strictEqual(getState().bestBalance, avant.bestBalance);
    assert.deepStrictEqual(boutique.getShopInventory(), { ownedItemIds: ['article-test'] });
  });
});
