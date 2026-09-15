// ---------------------------------------------------------------------------
// Core - State
// ---------------------------------------------------------------------------
// Minimal, deterministic mock of the global game state.
//
// This module only documents the state shape and returns a coherent default.
// Real persistence / business logic is out of scope for the skeleton.
//
// ---------------------------------------------------------------------------
// LOCAL STORAGE SCHEMA (documented contract)
// ---------------------------------------------------------------------------
// Main key : "casino_state"
//
// {
//   player: {
//     pseudo:        string,
//     birthDate:     string (ISO date) | null,
//     balance:       number,
//     bestBalance:   number,
//     xp:            number,
//     level:         number,
//     unlockedGames: string[],
//     role:          "player" | "admin"
//   },
//   history:      [],  // game history entries
//   leaderboard:  [],  // leaderboard entries
//   achievements: [],  // unlocked achievements
//   shop:         {},  // shop / inventory state
//   gameConfig:   {}   // per-game runtime config overrides
// }
// ---------------------------------------------------------------------------

export const STORAGE_KEY = 'casino_state';

const DEFAULT_STATE = {
  balance: 1000,
  bestBalance: 1000,
  xp: 0,
  level: 1,
  unlockedGames: ['slots', 'dice'],
  history: [],
  role: 'player',
};

/**
 * Returns the current (mock) game state.
 *
 * @returns {{
 *   balance: number,
 *   bestBalance: number,
 *   xp: number,
 *   level: number,
 *   unlockedGames: string[],
 *   history: Array,
 *   role: string
 * }}
 */
export function getState() {
  return {
    ...DEFAULT_STATE,
    unlockedGames: [...DEFAULT_STATE.unlockedGames],
    history: [],
  };
}