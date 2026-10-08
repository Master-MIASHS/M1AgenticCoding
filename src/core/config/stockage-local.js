// ---------------------------------------------------------------------------
// Core - Stockage local des réglages admin (Groupe 1, #260)
// ---------------------------------------------------------------------------
// Stockage { read, write } d'un réglage admin global (capital de départ,
// événements bonus…) sur localStorage, une clé par réglage. Ces réglages ne
// dépendent ni du joueur ni de sa sauvegarde : ils restent hors de
// casino_state (state.js n'est pas modifié).
//
//  * Sans localStorage (Node, tests) : mémoire seule.
//  * Conception détaillée : docs/design/reglages-admin.md
// ---------------------------------------------------------------------------

/**
 * Crée le stockage d'un réglage admin.
 *
 * @param {string} cle - Clé localStorage du réglage.
 * @param {*} valeurParDefaut - Valeur utilisée tant que rien n'est enregistré
 *   (donnée JSON).
 * @param {object} [options] - Dépendances injectables (tests).
 * @param {{ getItem: function(string): (string|null),
 *   setItem: function(string, string): void }} [options.stockage] -
 *   localStorage du navigateur par défaut.
 * @returns {{ read: function(): *, write: function(*): void }} Stockage
 *   synchrone ; read() renvoie une copie.
 * @throws {Error} Si la clé n'est pas une chaîne non vide.
 */
export function createStockageLocal(
  cle,
  valeurParDefaut,
  { stockage = globalThis.localStorage } = {},
) {
  if (typeof cle !== 'string' || cle === '') {
    throw new Error('stockage-local : la clé doit être une chaîne non vide');
  }

  let valeur = structuredClone(valeurParDefaut);
  const enregistre = stockage?.getItem(cle);
  if (enregistre !== null && enregistre !== undefined) {
    valeur = JSON.parse(enregistre);
  }

  return {
    read: () => structuredClone(valeur),
    write: (suivante) => {
      const copie = structuredClone(suivante);
      stockage?.setItem(cle, JSON.stringify(copie));
      valeur = copie;
    },
  };
}
