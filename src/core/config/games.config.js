// ---------------------------------------------------------------------------
// Core - Games configuration
// ---------------------------------------------------------------------------
// Defines the 10 games and their unlock level, plus (mock) runtime config
// management and global stats.
// ---------------------------------------------------------------------------

/**
 * Canonical list of the 10 games and the player level required to unlock
 * each one.
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
  poker: { id: 'poker', name: 'Poker', unlockLevel: 12 },
};

// In-memory (mock) store of per-game runtime config.
const gameConfigs = new Map();

/**
 * (Mock) Sets the runtime configuration (probabilities / multipliers) for a
 * game.
 *
 * @param {string} gameId
 * @param {{ probabilities?: object, multipliers?: object }} config
 * @returns {{ ok: boolean, gameId: string }}
 */
export function setGameConfig(gameId, config = {}) {
  gameConfigs.set(gameId, {
    probabilities: config.probabilities ?? {},
    multipliers: config.multipliers ?? {},
  });
  return { ok: true, gameId };
}

/**
 * @param {string} gameId
 * @returns {{ probabilities: object, multipliers: object }} stored config.
 */
export function getGameConfig(gameId) {
  return gameConfigs.get(gameId) ?? { probabilities: {}, multipliers: {} };
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