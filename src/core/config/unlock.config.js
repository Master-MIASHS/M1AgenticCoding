// ---------------------------------------------------------------------------
// Core - Niveaux de déblocage réglables (Groupe 1, tâche n°21, #137)
// ---------------------------------------------------------------------------
// Règle 4 d'AGENTS.md : le niveau requis pour débloquer un jeu n'est jamais
// écrit en dur dans le code, il se lit ici. Par défaut, c'est le unlockLevel
// de GAMES ; l'admin peut le régler jeu par jeu.
//
//  * Stockage injecté (comme createProgression(store)) : seuls les niveaux
//    réglés par l'admin sont stockés. L'enregistrement dans casino_state
//    relève du branchement (n°8).
//  * Hors périmètre : vérification du rôle admin (n°24), calcul des jeux
//    débloqués d'un joueur (n°15), exposition dans core.js / coreService.js.
//  * Aucun niveau maximum n'est imposé : question ouverte dans #137.
// ---------------------------------------------------------------------------

import { GAMES } from './games.config.js';

/**
 * Vérifie qu'un identifiant correspond à un jeu de GAMES.
 *
 * @param {unknown} gameId - Identifiant à vérifier.
 * @returns {void}
 * @throws {Error} Si le jeu est inconnu.
 */
function validateGameId(gameId) {
  if (typeof gameId !== 'string' || !Object.hasOwn(GAMES, gameId)) {
    throw new Error(`unlock.config : jeu inconnu : ${String(gameId)}`);
  }
}

/**
 * Vérifie qu'un niveau de déblocage est un entier supérieur ou égal à 1.
 *
 * @param {unknown} level - Niveau à vérifier.
 * @returns {void}
 * @throws {RangeError} Si le niveau est invalide.
 */
function validateLevel(level) {
  if (!Number.isSafeInteger(level) || level < 1) {
    throw new RangeError('unlock.config : le niveau doit être un entier supérieur ou égal à 1');
  }
}

/**
 * Lit et valide les niveaux réglés par l'admin.
 *
 * @param {{ read: function(): object }} store - Stockage injecté.
 * @returns {Object<string, number>} Copie indépendante des niveaux réglés.
 * @throws {TypeError|Error|RangeError} Si le contenu du stockage est invalide.
 */
function readOverrides(store) {
  const overrides = store.read();
  if (overrides === null || typeof overrides !== 'object' || Array.isArray(overrides)) {
    throw new TypeError('unlock.config : le stockage doit contenir un objet { gameId: niveau }');
  }
  for (const [gameId, level] of Object.entries(overrides)) {
    validateGameId(gameId);
    validateLevel(level);
  }
  return { ...overrides };
}

/**
 * Crée un stockage en mémoire, en attendant le branchement sur casino_state.
 *
 * @param {Object<string, number>} [initial] - Niveaux déjà réglés.
 * @returns {{ read: function(): object, write: function(object): void }}
 */
export function createUnlockMemoryStore(initial = {}) {
  let overrides = { ...initial };
  return {
    read: () => ({ ...overrides }),
    write: (next) => {
      overrides = { ...next };
    },
  };
}

/**
 * Crée la configuration des niveaux de déblocage sur un stockage injecté.
 *
 * @param {{ read: function(): object, write: function(object): void }} store
 *   Stockage synchrone des niveaux réglés par l'admin ({ gameId: niveau }).
 * @returns {{
 *   getUnlockLevel: function(string): number,
 *   getUnlockLevels: function(): Object<string, number>,
 *   setUnlockLevel: function(string, number): number
 * }}
 * @throws {TypeError} Si le stockage n'a pas de fonctions read() et write().
 */
export function createUnlockConfig(store) {
  if (!store || typeof store.read !== 'function' || typeof store.write !== 'function') {
    throw new TypeError('unlock.config : le stockage doit fournir read() et write()');
  }
  readOverrides(store);

  return {
    /**
     * Retourne le niveau requis pour un jeu : celui réglé par l'admin,
     * sinon la valeur par défaut de GAMES.
     *
     * @param {string} gameId - Identifiant du jeu.
     * @returns {number} Niveau requis.
     * @throws {Error} Si le jeu est inconnu.
     */
    getUnlockLevel(gameId) {
      validateGameId(gameId);
      return readOverrides(store)[gameId] ?? GAMES[gameId].unlockLevel;
    },

    /**
     * Retourne le niveau requis de chaque jeu de GAMES.
     *
     * @returns {Object<string, number>} Copie indépendante { gameId: niveau }.
     */
    getUnlockLevels() {
      const overrides = readOverrides(store);
      const levels = {};
      for (const gameId of Object.keys(GAMES)) {
        levels[gameId] = overrides[gameId] ?? GAMES[gameId].unlockLevel;
      }
      return levels;
    },

    /**
     * Règle le niveau requis pour un jeu. Tout est validé avant l'écriture :
     * en cas d'erreur, rien n'est modifié.
     *
     * @param {string} gameId - Identifiant du jeu.
     * @param {number} level - Niveau requis, entier supérieur ou égal à 1.
     * @returns {number} Le niveau enregistré.
     * @throws {Error|RangeError} Si le jeu est inconnu ou le niveau invalide.
     */
    setUnlockLevel(gameId, level) {
      validateGameId(gameId);
      validateLevel(level);
      const overrides = readOverrides(store);
      overrides[gameId] = level;
      store.write(overrides);
      return level;
    },
  };
}
