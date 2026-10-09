// ---------------------------------------------------------------------------
// Core - Stockage local des réglages admin (Groupe 1, #260)
// ---------------------------------------------------------------------------
// Stockage { read, write } d'un réglage admin global (capital de départ,
// événements bonus…) sur localStorage, une clé par réglage. Ces réglages ne
// dépendent ni du joueur ni de sa sauvegarde : ils restent hors de
// casino_state (state.js n'est pas modifié).
//
//  * Sans localStorage (Node, tests) : mémoire seule.
//  * Ne plante jamais au chargement : valeur par défaut et avertissement si
//    l'enregistrement est illisible ou refusé (même règle que #240).
//  * Conception détaillée : docs/design/reglages-admin.md
// ---------------------------------------------------------------------------

/**
 * Crée le stockage d'un réglage admin.
 *
 * @param {string} cle - Clé localStorage du réglage.
 * @param {*} valeurParDefaut - Valeur utilisée tant que rien n'est enregistré
 *   (donnée JSON).
 * @param {object} [options] - Dépendances injectables.
 * @param {function(*): void} [options.valider] - Lève une erreur si une
 *   valeur (lue ou à écrire) est refusée ; règles du module propriétaire.
 * @param {{ getItem: function(string): (string|null),
 *   setItem: function(string, string): void }} [options.stockage] -
 *   localStorage du navigateur par défaut.
 * @returns {{ read: function(): *, write: function(*): void }} Stockage
 *   synchrone ; read() renvoie une copie.
 * @throws {Error} Si la clé n'est pas une chaîne non vide.
 */
export function createStockageLocal(cle, valeurParDefaut, options = {}) {
  if (typeof cle !== 'string' || cle === '') {
    throw new Error('stockage-local : la clé doit être une chaîne non vide');
  }
  const { valider = () => {} } = options;
  // Le stockage n'est lu dans globalThis que s'il n'est pas fourni : l'accès
  // lui-même peut lever une erreur (relecture G5 de #262).
  const stockage = 'stockage' in options ? options.stockage : localStorageDuNavigateur(cle);

  let valeur = lireValeurInitiale(cle, valeurParDefaut, valider, stockage);

  return {
    read: () => structuredClone(valeur),
    write: (suivante) => {
      const copie = structuredClone(suivante);
      valider(copie);
      // Enregistrer d'abord : si l'écriture échoue, la mémoire ne change pas.
      stockage?.setItem(cle, JSON.stringify(copie));
      valeur = copie;
    },
  };
}

/**
 * Renvoie le localStorage du navigateur, ou rien s'il est absent (Node) ou
 * inaccessible. Son simple accès peut lever une erreur (cookies bloqués,
 * certains modes privés) : le module ne doit pas planter au chargement, il
 * passe alors en mémoire seule avec un avertissement (même règle que #240).
 *
 * @param {string} cle - Clé du réglage, pour l'avertissement.
 * @returns {object|undefined} localStorage, ou undefined (mémoire seule).
 */
function localStorageDuNavigateur(cle) {
  try {
    return globalThis.localStorage;
  } catch (erreur) {
    console.warn(`stockage-local : localStorage inaccessible pour ${cle} ; réglage gardé en mémoire seule.`, erreur);
    return undefined;
  }
}

/**
 * Lit la valeur enregistrée sans jamais faire échouer le chargement (même
 * règle que le démarrage robuste de state.js, #240) : stockage inaccessible,
 * JSON illisible ou contenu refusé donnent la valeur par défaut avec un
 * avertissement. La clé n'est pas effacée : elle ne sera remplacée qu'au
 * prochain enregistrement réussi.
 *
 * @param {string} cle - Clé localStorage du réglage.
 * @param {*} valeurParDefaut - Valeur par défaut (donnée JSON).
 * @param {function(*): void} valider - Lève une erreur si la valeur est refusée.
 * @param {object|undefined} stockage - localStorage, ou rien (mémoire seule).
 * @returns {*} Valeur initiale validée (copie).
 */
function lireValeurInitiale(cle, valeurParDefaut, valider, stockage) {
  const parDefaut = () => structuredClone(valeurParDefaut);
  let enregistre;
  try {
    enregistre = stockage?.getItem(cle);
  } catch (erreur) {
    console.warn(`stockage-local : ${cle} inaccessible ; valeur par défaut utilisée.`, erreur);
    return parDefaut();
  }
  if (enregistre === null || enregistre === undefined) {
    return parDefaut();
  }
  try {
    const lue = JSON.parse(enregistre);
    valider(lue);
    return lue;
  } catch (erreur) {
    console.warn(
      `stockage-local : ${cle} illisible ou non conforme ; valeur par défaut utilisée ` +
        '(clé conservée jusqu’au prochain enregistrement).',
      erreur,
    );
    return parDefaut();
  }
}
