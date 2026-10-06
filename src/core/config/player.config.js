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

/**
 * Vérifie qu'un capital de départ est un nombre fini strictement positif.
 * Même règle que creerJoueur : un capital nul bloquerait le nouveau joueur.
 *
 * @param {unknown} montant - Capital à vérifier.
 * @returns {void}
 * @throws {RangeError} Si le capital est invalide.
 */
function validerCapital(montant) {
  if (typeof montant !== 'number' || !Number.isFinite(montant) || montant <= 0) {
    throw new RangeError(
      'player.config : le capital de départ doit être un nombre fini strictement positif',
    );
  }
}

/**
 * Lit et valide les réglages de l'admin.
 *
 * @param {{ read: function(): object }} store - Stockage injecté.
 * @returns {{ capitalDeDepart?: number }} Copie indépendante des réglages.
 * @throws {TypeError|RangeError} Si le contenu du stockage est invalide.
 */
function lireReglages(store) {
  const reglages = store.read();
  if (reglages === null || typeof reglages !== 'object' || Array.isArray(reglages)) {
    throw new TypeError('player.config : le stockage doit contenir un objet { capitalDeDepart }');
  }
  if (reglages.capitalDeDepart !== undefined) {
    validerCapital(reglages.capitalDeDepart);
  }
  return { ...reglages };
}

/**
 * Crée la configuration du joueur sur un stockage injecté (même modèle que
 * les niveaux de déblocage réglables, n°21).
 *
 * Hors périmètre : vérification du rôle admin (n°24), enregistrement dans
 * casino_state (n°8), exposition dans core.js / coreService.js.
 *
 * @param {{ read: function(): object, write: function(object): void }} store
 *   Stockage synchrone des réglages de l'admin ({ capitalDeDepart }).
 * @returns {{ getCapitalDeDepart: function(): number }} Configuration du
 *   joueur.
 * @throws {TypeError|RangeError} Si le stockage est invalide.
 */
export function createPlayerConfig(store) {
  if (!store || typeof store.read !== 'function' || typeof store.write !== 'function') {
    throw new TypeError('player.config : le stockage doit fournir read() et write()');
  }
  lireReglages(store);

  return {
    /**
     * Renvoie le capital de départ : celui réglé par l'admin, sinon le
     * défaut de PLAYER_CONFIG.
     *
     * @returns {number} Capital de départ d'un nouveau joueur.
     */
    getCapitalDeDepart() {
      return lireReglages(store).capitalDeDepart ?? PLAYER_CONFIG.capitalDeDepart;
    },
  };
}
