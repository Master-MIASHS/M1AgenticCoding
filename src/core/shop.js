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
