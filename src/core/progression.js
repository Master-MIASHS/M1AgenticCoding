// ---------------------------------------------------------------------------
// Core - Progression (mock)
// ---------------------------------------------------------------------------
// Minimal, coherent mock data. Not a real XP / level system.
// ---------------------------------------------------------------------------

import { getState } from './state.js';

/**
 * @param {number} amount
 * @returns {{ xp: number, level: number }}
 */
export function addXP(amount) {
  const { xp, level } = getState();
  return { xp: xp + amount, level };
}

/** @returns {number} current (mock) level. */
export function getLevel() {
  return getState().level;
}

/** @returns {string[]} (mock) list of unlocked game ids. */
export function getUnlockedGames() {
  return [...getState().unlockedGames];
}

/** @returns {Array} (mock) leaderboard entries. */
export function getLeaderboard() {
  return [
    { pseudo: 'alice', balance: 5000, level: 12 },
    { pseudo: 'bob', balance: 3200, level: 8 },
  ];
}

/** @returns {Array} (mock) game history. */
export function getHistory() {
  return [];
}