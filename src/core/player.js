// ---------------------------------------------------------------------------
// Core - Création d'un nouveau joueur (Groupe 1, tâche n°3)
// ---------------------------------------------------------------------------
// Construit un joueur valide, prêt à être enregistré dans l'état.
//
//  * Fonctions PURES : rien n'est écrit dans l'état ni dans localStorage.
//    L'enregistrement relève de l'état réel et du branchement (n°1, n°8).
//  * Aucune valeur de réglage en dur (règle 4 d'AGENTS.md) : le capital de
//    départ vient de config/player.config.js.
//  * Conception détaillée : docs/design/nouveau-joueur.md
// ---------------------------------------------------------------------------

/**
 * Valide le pseudo d'un nouveau joueur.
 *
 * Seule une validation minimale est appliquée (chaîne non vide) : les règles
 * de longueur et de caractères ne sont pas encore définies par le projet.
 *
 * @param {string} pseudo - Pseudo saisi par le joueur.
 * @returns {string} Le pseudo sans espaces superflus au début et à la fin.
 * @throws {Error} Si le pseudo n'est pas une chaîne ou s'il est vide.
 */
export function validerPseudo(pseudo) {
  if (typeof pseudo !== 'string') {
    throw new Error('validerPseudo : le pseudo doit être une chaîne');
  }
  const pseudoNettoye = pseudo.trim();
  if (pseudoNettoye === '') {
    throw new Error('validerPseudo : le pseudo ne doit pas être vide');
  }
  return pseudoNettoye;
}
