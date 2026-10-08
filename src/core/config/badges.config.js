// ---------------------------------------------------------------------------
// Core - Configuration des badges (Groupe 1, tâche n°33, #272)
// ---------------------------------------------------------------------------
// Règle 4 d'AGENTS.md : les seuils des badges ne sont pas écrits en dur dans
// le code, ils se lisent ici.
//
// Seuls les deux exemples du glossaire d'AGENTS.md sont définis : le contenu
// des badges n'est pas une décision du G1 (règle 10). D'autres badges
// s'ajoutent ici, sans changer le code.
// Conception détaillée : docs/design/badges.md
// ---------------------------------------------------------------------------

/**
 * Définitions des badges : `compteur` désigne un compteur du joueur
 * (`partiesJouees` ou `faillites`) et `seuil` la valeur à atteindre.
 * Figées pour qu'aucun module ne les modifie par erreur.
 *
 * @type {Readonly<{ definitions: ReadonlyArray<Readonly<{ id: string,
 *   nom: string, compteur: 'partiesJouees'|'faillites', seuil: number }>> }>}
 */
export const BADGES_CONFIG = Object.freeze({
  definitions: Object.freeze([
    Object.freeze({ id: 'parties-1000', nom: '1000 parties jouées', compteur: 'partiesJouees', seuil: 1000 }),
    Object.freeze({ id: 'faillites-5', nom: 'A survécu à la faillite 5 fois', compteur: 'faillites', seuil: 5 }),
  ]),
});
