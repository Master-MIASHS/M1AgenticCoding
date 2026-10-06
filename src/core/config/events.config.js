// ---------------------------------------------------------------------------
// Core - Événements bonus (Groupe 1, tâche n°35, #223)
// ---------------------------------------------------------------------------
// L'admin lance des événements bonus : pendant une période, les gains ou
// l'XP sont multipliés. Ce module indique le multiplicateur en cours ; il ne
// l'applique pas (gains : play(), n°10 ; XP : progression, n°13).
//
//  * Aucun événement par défaut : leur contenu est décidé par l'admin
//    (décision ouverte d'AGENTS.md, mécanisme simple demandé par le G5).
//  * Stockage injecté (même modèle que unlock.config.js et player.config.js) :
//    l'enregistrement dans casino_state relève du branchement (n°8).
//  * Hors périmètre : vérification du rôle admin (n°24), exposition dans
//    core.js / coreService.js.
//  * Conception détaillée : docs/design/evenements-bonus.md
// ---------------------------------------------------------------------------

/** Cibles possibles d'un événement bonus. */
export const CIBLES = Object.freeze(['gains', 'xp']);

/**
 * Vérifie la forme d'un événement bonus.
 *
 * Un événement couvre la période [debut, fin) : début inclus, fin exclue.
 *
 * @param {{ id: string, cible: 'gains'|'xp', multiplicateur: number,
 *   debut: number, fin: number }} evenement - Événement à vérifier ; dates
 *   en millisecondes.
 * @returns {void}
 * @throws {Error} Si l'identifiant, la cible, le multiplicateur ou les dates
 *   sont invalides.
 */
export function validerEvenement(evenement) {
  if (evenement === null || typeof evenement !== 'object' || Array.isArray(evenement)) {
    throw new Error('events.config : un événement doit être un objet');
  }
  const { id, cible, multiplicateur, debut, fin } = evenement;
  if (typeof id !== 'string' || id === '') {
    throw new Error("events.config : l'identifiant doit être une chaîne non vide");
  }
  if (!CIBLES.includes(cible)) {
    throw new Error(`events.config : cible inconnue ${String(cible)} (gains ou xp)`);
  }
  // Un bonus augmente toujours : 1 ne changerait rien, < 1 serait un malus.
  if (typeof multiplicateur !== 'number' || !Number.isFinite(multiplicateur) || multiplicateur <= 1) {
    throw new Error('events.config : le multiplicateur doit être un nombre fini strictement supérieur à 1');
  }
  if (!Number.isSafeInteger(debut) || debut < 0 || !Number.isSafeInteger(fin) || fin <= debut) {
    throw new Error('events.config : debut et fin doivent être des dates en ms, avec fin > debut');
  }
}

/**
 * Crée un stockage en mémoire des événements, en attendant le branchement
 * sur casino_state (n°8).
 *
 * @param {Array<object>} [initial] - Événements déjà lancés.
 * @returns {{ read: function(): Array<object>, write: function(Array<object>): void }}
 *   Stockage synchrone ; read() renvoie une copie.
 */
export function createEvenementsMemoryStore(initial = []) {
  let evenements = structuredClone(initial);
  return {
    read: () => structuredClone(evenements),
    write: (suivants) => {
      evenements = structuredClone(suivants);
    },
  };
}
