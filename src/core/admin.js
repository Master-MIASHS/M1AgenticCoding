// ---------------------------------------------------------------------------
// Core - Administration (Groupe 1, #322)
// ---------------------------------------------------------------------------
// Outils de l'admin validés par le G5 dans #255 : ajustement du solde du
// joueur avec une trace dans l'historique, et rôle admin en mode dev.
//
//  * Un seul profil : l'ajustement porte sur le profil courant (n°5 à venir).
//  * Tout passe par updateState : state.js et economy.js ne changent pas.
//  * Conception détaillée : docs/design/ajustement-solde-admin.md
// ---------------------------------------------------------------------------

/** Type des entrées d'historique créées par un ajustement de l'admin. */
export const TYPE_AJUSTEMENT_ADMIN = 'ADMIN_ADJUSTMENT';

/**
 * Indique si une entrée d'historique est un ajustement de l'admin plutôt
 * qu'une partie (les parties n'ont pas de champ `type`).
 *
 * @param {unknown} entree - Entrée d'historique.
 * @returns {boolean} Vrai pour un ajustement de l'admin.
 */
export function estAjustementAdmin(entree) {
  return entree !== null && typeof entree === 'object' && entree.type === TYPE_AJUSTEMENT_ADMIN;
}
