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
