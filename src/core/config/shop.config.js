// ---------------------------------------------------------------------------
// Core - Configuration de la boutique (Groupe 1, tâche n°37)
// ---------------------------------------------------------------------------
// Règle 4 d'AGENTS.md : les articles et leurs prix ne sont jamais écrits en
// dur dans le code, ils se lisent ici.
//
// Le contenu de la boutique est une DÉCISION OUVERTE d'AGENTS.md : le
// catalogue reste vide tant que le G5 ne l'a pas fixé (question dans #205).
// Les articles du mock du G4 (src/mocks/shop.mock.js) ne sont pas repris.
//
// Forme d'un article (contrat proposé par le G4, SHOP_CORE_CONTRACT.md) :
//   { id, name, description, category, price, visual?, available }
// Conception détaillée : docs/design/boutique.md
// ---------------------------------------------------------------------------

/**
 * Configuration par défaut de la boutique.
 * Figée pour qu'aucun module ne la modifie par erreur : un autre catalogue
 * se passe en paramètre à createShop().
 *
 * @type {Readonly<{ catalogue: ReadonlyArray<{ id: string, name: string,
 *   description: string, category: string, price: number, visual?: string,
 *   available: boolean }> }>}
 */
export const SHOP_CONFIG = Object.freeze({
  catalogue: Object.freeze([]),
});
