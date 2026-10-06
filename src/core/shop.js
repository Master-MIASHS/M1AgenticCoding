// ---------------------------------------------------------------------------
// Core - Boutique (Groupe 1, tâche n°37)
// ---------------------------------------------------------------------------
// Catalogue, inventaire et achat d'articles avec des jetons fictifs, selon la
// proposition de contrat du G4 (src/pages/Shop/SHOP_CORE_CONTRACT.md).
//
//  * Aucun vrai argent (règle 1 d'AGENTS.md) : uniquement des jetons fictifs.
//  * Catalogue lu dans config/shop.config.js (règle 4) ; son contenu est une
//    décision ouverte, il est vide par défaut.
//  * Stockage injecté ({ getState, updateState }) : le branchement sur l'état
//    réel et l'exposition via coreService relèvent des tâches n°8 et n°6.
//  * Conception détaillée : docs/design/boutique.md
// ---------------------------------------------------------------------------

import { SHOP_CONFIG } from './config/shop.config.js';

const CHAMPS_TEXTE = ['name', 'description', 'category'];

/**
 * Vérifie la forme d'un catalogue de la boutique.
 *
 * Chaque article doit avoir un identifiant unique (chaîne non vide), un nom,
 * une description et une catégorie (chaînes), un prix entier ≥ 0 en jetons
 * fictifs, un booléen `available` et, s'il est fourni, un visuel (chaîne).
 *
 * @param {Array<object>} catalogue - Articles de la boutique.
 * @returns {void}
 * @throws {Error} Si le catalogue n'est pas un tableau, si un article est mal
 *   formé ou si deux articles ont le même identifiant.
 */
export function validerCatalogue(catalogue) {
  if (!Array.isArray(catalogue)) {
    throw new Error('validerCatalogue : le catalogue doit être un tableau');
  }
  const identifiants = new Set();
  for (const article of catalogue) {
    if (article === null || typeof article !== 'object' || Array.isArray(article)) {
      throw new Error('validerCatalogue : chaque article doit être un objet');
    }
    if (typeof article.id !== 'string' || article.id === '') {
      throw new Error('validerCatalogue : chaque article doit avoir un id non vide');
    }
    const champInvalide = CHAMPS_TEXTE.find((champ) => typeof article[champ] !== 'string');
    if (champInvalide !== undefined) {
      throw new Error(`validerCatalogue : ${champInvalide} de ${article.id} doit être une chaîne`);
    }
    // Prix entier : pas d'arrondi à gérer lors du débit du solde.
    if (!Number.isSafeInteger(article.price) || article.price < 0) {
      throw new Error(`validerCatalogue : le prix de ${article.id} doit être un entier ≥ 0`);
    }
    if (typeof article.available !== 'boolean') {
      throw new Error(`validerCatalogue : available de ${article.id} doit être un booléen`);
    }
    if (article.visual !== undefined && typeof article.visual !== 'string') {
      throw new Error(`validerCatalogue : visual de ${article.id} doit être une chaîne`);
    }
    if (identifiants.has(article.id)) {
      throw new Error(`validerCatalogue : identifiant en double ${article.id}`);
    }
    identifiants.add(article.id);
  }
}

/**
 * Lit l'inventaire du joueur dans l'état.
 *
 * Le champ `ownedItemIds` (nom proposé par le G4, à confirmer au branchement)
 * est absent tant que le joueur n'a rien acheté : l'inventaire est alors vide.
 *
 * @param {object} etat - État du joueur.
 * @returns {string[]} Identifiants des articles possédés (nouveau tableau).
 * @throws {Error} Si l'inventaire de l'état est corrompu (pas un tableau de
 *   chaînes, ou un article en double).
 */
function lireInventaire(etat) {
  const { ownedItemIds } = etat;
  if (ownedItemIds === undefined) {
    return [];
  }
  if (
    !Array.isArray(ownedItemIds) ||
    !ownedItemIds.every((id) => typeof id === 'string') ||
    new Set(ownedItemIds).size !== ownedItemIds.length
  ) {
    throw new Error("boutique : l'inventaire de l'état est corrompu");
  }
  return [...ownedItemIds];
}

/**
 * Crée la boutique du Core, branchée sur un stockage injecté.
 *
 * Le catalogue est validé et copié à la création : le modifier ensuite ne
 * change pas la boutique.
 *
 * @param {{ getState: function(): object,
 *   updateState: function(function(object): object): object }} stockage -
 *   Accès à l'état du joueur (contrat de updateState, #139).
 * @param {object} [options] - Dépendances injectables (tests, réglages).
 * @param {Array<object>} [options.catalogue] - Articles de la boutique
 *   (SHOP_CONFIG.catalogue par défaut).
 * @returns {{ getShopCatalog: function(): Array<object>,
 *   getShopInventory: function(): { ownedItemIds: string[] } }} Opérations de
 *   la boutique.
 * @throws {Error} Si le stockage ou le catalogue est invalide.
 */
export function createShop(stockage, { catalogue = SHOP_CONFIG.catalogue } = {}) {
  if (typeof stockage?.getState !== 'function' || typeof stockage?.updateState !== 'function') {
    throw new Error('createShop : getState et updateState sont requis');
  }
  validerCatalogue(catalogue);
  const articles = structuredClone(catalogue);

  return {
    /**
     * Renvoie le catalogue de la boutique.
     * @returns {Array<object>} Copie indépendante des articles.
     */
    getShopCatalog() {
      return structuredClone(articles);
    },

    /**
     * Renvoie l'inventaire du joueur, relu dans l'état à chaque appel.
     * @returns {{ ownedItemIds: string[] }} Copie indépendante de l'inventaire.
     * @throws {Error} Si l'inventaire de l'état est corrompu.
     */
    getShopInventory() {
      return { ownedItemIds: lireInventaire(stockage.getState()) };
    },
  };
}
