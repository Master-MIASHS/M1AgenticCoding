// ---------------------------------------------------------------------------
// Game registry (application level)
// ---------------------------------------------------------------------------
// Application-facing registry mapping a game id to its display metadata.
//
// It mirrors the Core /src/core/config/games.config.js (unlock levels) and
// stays self-contained (no direct Core import) to keep the
// UI -> coreService -> Core rule intact.
// ---------------------------------------------------------------------------

export const GAME_REGISTRY = [
  { id: 'slots', name: 'Slots', unlockLevel: 1, category: 'table' },
  { id: 'dice', name: 'Dice', unlockLevel: 1, category: 'dice' },
  { id: 'scratch', name: 'Scratch', unlockLevel: 2, category: 'instant' },
  { id: 'blackjack', name: 'Blackjack', unlockLevel: 3, category: 'table' },
  { id: 'wheel', name: 'Wheel', unlockLevel: 4, category: 'wheel' },
  { id: 'roulette', name: 'Roulette', unlockLevel: 5, category: 'table' },
  { id: 'baccarat', name: 'Baccarat', unlockLevel: 6, category: 'table' },
  { id: 'plinko', name: 'Plinko', unlockLevel: 7, category: 'arcade' },
  { id: 'video-poker', name: 'Video Poker', unlockLevel: 8, category: 'poker' },
  { id: 'poker', name: 'Poker', unlockLevel: 12, category: 'poker' },
];

/**
 * @param {string} gameId
 * @returns {object|undefined} the registry entry for a game id.
 */
export function getGameMeta(gameId) {
  return GAME_REGISTRY.find((g) => g.id === gameId);
}