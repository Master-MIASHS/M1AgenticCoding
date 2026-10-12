// ---------------------------------------------------------------------------
// Game registry (application level)
// ---------------------------------------------------------------------------
// Application-facing registry mapping a game id to its display metadata.
// Names, types (hasard / cartes / adresse) and levels follow the games table of AGENTS.md.
//
// It mirrors the Core /src/core/config/games.config.js (unlock levels) and
// stays self-contained (no direct Core import) to keep the
// UI -> coreService -> Core rule intact.
// ---------------------------------------------------------------------------

export const GAME_REGISTRY = [
  { id: 'slots', name: 'Machine à sous', unlockLevel: 1, category: 'hasard' },
  { id: 'dice', name: 'Dés', unlockLevel: 1, category: 'hasard' },
  { id: 'scratch', name: 'Cartes à gratter', unlockLevel: 2, category: 'hasard' },
  { id: 'blackjack', name: 'Blackjack', unlockLevel: 3, category: 'cartes' },
  { id: 'wheel', name: 'Roue de la fortune', unlockLevel: 4, category: 'hasard' },
  { id: 'roulette', name: 'Roulette', unlockLevel: 5, category: 'hasard' },
  { id: 'baccarat', name: 'Baccarat', unlockLevel: 6, category: 'hasard' },
  { id: 'plinko', name: 'Plinko', unlockLevel: 7, category: 'hasard' },
  { id: 'video-poker', name: 'Vidéo poker', unlockLevel: 8, category: 'cartes' },
  { id: 'memory', name: 'Memory casino', unlockLevel: 8, category: 'adresse' },
  { id: 'quiz', name: 'Quiz « risque ton argent »', unlockLevel: 9, category: 'adresse' },
  { id: 'bingo', name: 'Bingo', unlockLevel: 10, category: 'hasard' },
  { id: 'poker', name: "Poker contre l'IA", unlockLevel: 12, category: 'cartes' },
];

/**
 * @param {string} gameId
 * @returns {object|undefined} the registry entry for a game id.
 */
export function getGameMeta(gameId) {
  return GAME_REGISTRY.find((g) => g.id === gameId);
}