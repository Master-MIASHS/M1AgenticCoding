// ---------------------------------------------------------------------------
// Core - Games configuration
// ---------------------------------------------------------------------------
// Defines the 13 games and their unlock level, plus (mock) runtime config
// management and global stats.
// ---------------------------------------------------------------------------

/**
 * Canonical list of the 13 games of AGENTS.md and the player level required
 * to unlock each one (memory, quiz and bingo added in #318).
 */
export const GAMES = {
  slots: { id: 'slots', name: 'Slots', unlockLevel: 1 },
  dice: { id: 'dice', name: 'Dice', unlockLevel: 1 },
  scratch: { id: 'scratch', name: 'Scratch', unlockLevel: 2 },
  blackjack: { id: 'blackjack', name: 'Blackjack', unlockLevel: 3 },
  wheel: { id: 'wheel', name: 'Wheel', unlockLevel: 4 },
  roulette: { id: 'roulette', name: 'Roulette', unlockLevel: 5 },
  baccarat: { id: 'baccarat', name: 'Baccarat', unlockLevel: 6 },
  plinko: { id: 'plinko', name: 'Plinko', unlockLevel: 7 },
  'video-poker': { id: 'video-poker', name: 'Video Poker', unlockLevel: 8 },
  memory: { id: 'memory', name: 'Memory', unlockLevel: 8 },
  quiz: { id: 'quiz', name: 'Quiz', unlockLevel: 9 },
  bingo: { id: 'bingo', name: 'Bingo', unlockLevel: 10 },
  poker: { id: 'poker', name: 'Poker', unlockLevel: 12 },
};

for (const game of Object.values(GAMES)) Object.freeze(game);
Object.freeze(GAMES);

// In-memory (mock) store of per-game runtime config.
const gameConfigs = new Map();

/**
 * Vérifie que le jeu appartient au catalogue, sans accepter ses propriétés héritées.
 * @param {unknown} gameId - Identifiant à vérifier.
 * @returns {void}
 * @throws {Error} Si le jeu est inconnu.
 */
function validateGameId(gameId) {
  if (typeof gameId !== 'string' || !Object.hasOwn(GAMES, gameId)) {
    throw new Error(`games.config : jeu inconnu : ${String(gameId)}`);
  }
}

/**
 * Lit les propriétés de données d'un objet simple sans exécuter d'accesseur.
 * @param {unknown} value - Objet de configuration attendu.
 * @returns {Array<[string, unknown]>} Entrées propres énumérables.
 * @throws {TypeError} Si l'objet ne représente pas une table de données JSON.
 */
function readEntries(value) {
  if (
    value === null || typeof value !== 'object' ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
  ) {
    throw new TypeError('games.config : un objet simple est requis');
  }
  const entries = [];
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError('games.config : seules les propriétés de données JSON sont acceptées');
    }
    entries.push([key, descriptor.value]);
  }
  return entries;
}

/**
 * Valide et copie une section plate sans normaliser ses valeurs.
 * @param {unknown} table - Table de nombres finis positifs ou nuls.
 * @returns {Object<string, number>} Copie indépendante.
 * @throws {TypeError|RangeError} Si une valeur est invalide.
 */
function copyNumericTable(table) {
  const entries = readEntries(table);
  for (const [, value] of entries) {
    if (typeof value !== 'number') {
      throw new TypeError('games.config : chaque valeur doit être un nombre');
    }
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError('games.config : chaque valeur doit être finie et supérieure ou égale à 0');
    }
  }
  return Object.fromEntries(entries);
}

/**
 * Met à jour la configuration en mémoire après validation complète.
 * Une section fournie remplace la précédente ; une section omise est conservée.
 *
 * @param {string} gameId - Identifiant connu du catalogue.
 * @param {{ probabilities?: Object<string, number>, multipliers?: Object<string, number> }} [config={}]
 * @returns {{ ok: boolean, gameId: string }}
 * @throws {Error|TypeError|RangeError} Si le jeu ou les données sont invalides, sans écriture.
 */
export function setGameConfig(gameId, config = {}) {
  validateGameId(gameId);
  const entries = readEntries(config);
  const candidate = getGameConfig(gameId);
  for (const [section, table] of entries) {
    if (section !== 'probabilities' && section !== 'multipliers') {
      throw new TypeError(`games.config : champ non autorisé : ${section}`);
    }
    candidate[section] = copyNumericTable(table);
  }
  gameConfigs.set(gameId, candidate);
  return { ok: true, gameId };
}

/**
 * Retourne une copie indépendante de la configuration ou deux sections vides.
 * @param {string} gameId - Identifiant connu du catalogue.
 * @returns {{ probabilities: Object<string, number>, multipliers: Object<string, number> }}
 * @throws {Error} Si le jeu est inconnu.
 */
export function getGameConfig(gameId) {
  validateGameId(gameId);
  const config = gameConfigs.get(gameId);
  return {
    probabilities: { ...config?.probabilities },
    multipliers: { ...config?.multipliers },
  };
}

/**
 * (Mock) Returns global statistics.
 * @returns {{ totalPlays: number, totalWagered: number, totalWon: number, activePlayers: number }}
 */
export function getGlobalStats() {
  return {
    totalPlays: 0,
    totalWagered: 0,
    totalWon: 0,
    activePlayers: 0,
  };
}
