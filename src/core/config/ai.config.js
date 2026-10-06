// ---------------------------------------------------------------------------
// Core - Configuration de l'IA des bots du poker (Groupe 1, tâche n°32)
// ---------------------------------------------------------------------------
// Règle 4 d'AGENTS.md : le comportement du bot n'est jamais écrit en dur dans
// le code, il se lit ici. Ces valeurs sont un premier réglage du G1 (bot
// jouable, pas optimal), à ajuster en jouant.
// Conception détaillée : docs/design/ia-poker.md
// ---------------------------------------------------------------------------

/**
 * Configuration par défaut de l'IA du poker.
 * Figée en profondeur pour qu'aucun module ne la modifie par erreur : une
 * autre configuration se passe en paramètre aux fonctions de ai/poker.js.
 *
 * - `seuils` : une force de main dans [0, 1] est « moyenne » à partir de
 *   `seuils.moyenne` et « forte » à partir de `seuils.forte`.
 * - `poidsActions` : poids relatifs de chaque action, par niveau de force.
 *   Le poids de `raise` au niveau faible correspond au bluff.
 * - `relance` : une relance vaut `minRaise × multiplicateur`, le
 *   multiplicateur étant tiré avec les poids du niveau (même longueur que
 *   `multiplicateurs`).
 * - `ordreDeRepli` : action choisie quand toutes les actions possibles ont
 *   un poids nul (la première de cette liste qui est possible).
 *
 * @type {Readonly<{
 *   seuils: Readonly<{ moyenne: number, forte: number }>,
 *   poidsActions: Readonly<Record<'faible'|'moyenne'|'forte',
 *     Readonly<{ fold: number, check: number, call: number, raise: number }>>>,
 *   relance: Readonly<{ multiplicateurs: readonly number[],
 *     poids: Readonly<Record<'faible'|'moyenne'|'forte', readonly number[]>> }>,
 *   ordreDeRepli: readonly string[]
 * }>}
 */
export const AI_POKER_CONFIG = Object.freeze({
  seuils: Object.freeze({ moyenne: 0.35, forte: 0.7 }),
  poidsActions: Object.freeze({
    faible: Object.freeze({ fold: 6, check: 6, call: 2, raise: 1 }),
    moyenne: Object.freeze({ fold: 2, check: 5, call: 6, raise: 2 }),
    forte: Object.freeze({ fold: 0, check: 2, call: 4, raise: 6 }),
  }),
  relance: Object.freeze({
    multiplicateurs: Object.freeze([1, 2, 3]),
    poids: Object.freeze({
      faible: Object.freeze([6, 1, 0]),
      moyenne: Object.freeze([5, 2, 1]),
      forte: Object.freeze([2, 3, 3]),
    }),
  }),
  ordreDeRepli: Object.freeze(['check', 'call', 'fold', 'raise']),
});
