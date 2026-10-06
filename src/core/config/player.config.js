// ---------------------------------------------------------------------------
// Core - Configuration du joueur
// ---------------------------------------------------------------------------
// Règle 4 d'AGENTS.md : le capital de départ n'est jamais écrit en dur dans
// le code, il se lit ici. Le défaut de 1000 jetons vient du glossaire
// d'AGENTS.md ; l'admin pourra le régler plus tard (tâches n°21 et n°24).
// ---------------------------------------------------------------------------

/**
 * Configuration par défaut d'un nouveau joueur.
 * Figée pour qu'aucun module ne la modifie par erreur : une autre
 * configuration se passe en paramètre à creerJoueur().
 *
 * @type {Readonly<{ capitalDeDepart: number }>}
 */
export const PLAYER_CONFIG = Object.freeze({
  capitalDeDepart: 1000,
});

/**
 * Crée un stockage en mémoire de la configuration réglée par l'admin, en
 * attendant le branchement sur casino_state (n°8).
 *
 * @param {{ capitalDeDepart?: number }} [initial] - Valeurs déjà réglées.
 * @returns {{ read: function(): object, write: function(object): void }}
 *   Stockage synchrone ; read() renvoie une copie.
 */
export function createPlayerConfigMemoryStore(initial = {}) {
  let reglages = { ...initial };
  return {
    read: () => ({ ...reglages }),
    write: (suivants) => {
      reglages = { ...suivants };
    },
  };
}
