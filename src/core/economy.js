// ---------------------------------------------------------------------------
// Core - Economy (mock)
// ---------------------------------------------------------------------------
// Minimal, deterministic mocks. These do NOT implement a real economy; they
// return coherent fictitious values so the architecture contracts can be
// exercised.
// ---------------------------------------------------------------------------

import { getState } from './state.js';

/**
 * Processes a (mock) play and returns the resulting economy delta.
 *
 * @param {string} gameId
 * @param {number} bet
 * @param {object} gameResult - raw result as interpreted by the game.
 * @returns {{ newBalance: number, xpGained: number, leveledUp: boolean }}
 */
export function play(gameId, bet, gameResult) {
  const { balance } = getState();
  // Deterministic mock: balance unchanged, fixed XP granted.
  return {
    newBalance: balance,
    xpGained: 10,
    leveledUp: false,
  };
}

/** @returns {number} current (mock) balance. */
export function getBalance() {
  return getState().balance;
}

/** @returns {number} a fictitious daily bonus amount. */
export function claimDailyBonus() {
  return 100;
}

/**
 * @param {number} amount
 * @returns {{ approved: boolean, amount: number }} fictitious loan result.
 */
export function requestLoan(amount) {
  return { approved: true, amount };
}