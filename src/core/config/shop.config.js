// ---------------------------------------------------------------------------
// Core - Configuration de la boutique (Groupe 1, tâche n°37)
// ---------------------------------------------------------------------------
// Règle 4 d'AGENTS.md : les articles et leurs prix ne sont jamais écrits en
// dur dans le code, ils se lisent ici.
//
// Le contenu de la boutique est une décision ouverte d'AGENTS.md, restée
// sans réponse du G5 (#205, #20). Pour que la boutique fonctionne, le
// catalogue reprend les 4 articles déjà montrés par la maquette du G4
// (src/mocks/shop.mock.js), sans en inventer (#325). Un autre contenu ne
// demande que de modifier ce fichier.
//
// Forme d'un article (contrat proposé par le G4, SHOP_CORE_CONTRACT.md) :
//   { id, name, description, category, price, visual?, available }
// Conception détaillée : docs/design/boutique.md
// ---------------------------------------------------------------------------

/**
 * Gèle un article pour qu'aucun module ne le modifie par erreur.
 * @param {object} article - Article du catalogue.
 * @returns {Readonly<object>} Le même article, figé.
 */
const figer = (article) => Object.freeze(article);

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
  catalogue: Object.freeze([
    figer({
      id: 'avatar_chapeau',
      name: 'Le Grand Chapeau',
      description: 'Un couvre-chef distingué pour votre profil de joueur.',
      category: 'avatars',
      price: 200,
      visual: '🎩',
      available: true,
    }),
    figer({
      id: 'theme_nuit',
      name: 'Nuit de velours',
      description: 'Un thème sombre aux reflets violets pour le casino.',
      category: 'thèmes',
      price: 500,
      visual: '🌙',
      available: true,
    }),
    figer({
      id: 'effect_confettis',
      name: 'Pluie de confettis',
      description: 'Un effet visuel réservé aux joueurs expérimentés.',
      category: 'effets visuels',
      price: 750,
      visual: '🎉',
      available: true,
    }),
    figer({
      id: 'badge_fidele',
      name: 'Habitué du Fantôme',
      description: 'Un badge qui signale votre fidélité à la table.',
      category: 'badges',
      price: 350,
      visual: '👻',
      available: true,
    }),
  ]),
});
