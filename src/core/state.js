// ---------------------------------------------------------------------------
// Core - State
// ---------------------------------------------------------------------------
// Shared game state with local persistence.
//
// ---------------------------------------------------------------------------
// LOCAL STORAGE SCHEMA (documented contract)
// ---------------------------------------------------------------------------
// Main key : "casino_state"
//
// {
//   balance: number,
//   bestBalance: number,
//   xp: number,
//   level: number,
//   unlockedGames: string[],
//   history: [],
//   role: "player" | "admin"
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

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateState(state) {
  const valid =
    isRecord(state) &&
    Number.isFinite(state.balance) &&
    Number.isFinite(state.bestBalance) &&
    Number.isFinite(state.xp) &&
    state.xp >= 0 &&
    Number.isInteger(state.level) &&
    state.level >= 1 &&
    Array.isArray(state.unlockedGames) &&
    state.unlockedGames.every((gameId) => typeof gameId === 'string') &&
    Array.isArray(state.history) &&
    (state.role === 'player' || state.role === 'admin');

  if (!valid) {
    throw new Error('state: invalid state shape.');
  }
}

function cloneState(state) {
  return structuredClone(state);
}

function readInitialState() {
  const storedState = globalThis.localStorage?.getItem(STORAGE_KEY);
  if (storedState === null || storedState === undefined) {
    return cloneState(DEFAULT_STATE);
  }

  let parsedState;
  try {
    parsedState = JSON.parse(storedState);
  } catch {
    throw new Error('state: stored state is not valid JSON.');
  }

  validateState(parsedState);
  return cloneState(parsedState);
}

let currentState = readInitialState();

/**
 * Returns an independent copy of the current game state.
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
  return cloneState(currentState);
}

/**
 * Replaces the current state after full validation.
 * This internal operation is used by save restoration, not exposed to the UI.
 *
 * @param {object} savedState
 * @returns {object} independent copy of the restored state.
 */
export function restoreState(savedState) {
  validateState(savedState);
  const nextState = cloneState(savedState);
  const serializedState = JSON.stringify(nextState);

  globalThis.localStorage?.setItem(STORAGE_KEY, serializedState);
  currentState = nextState;
  return getState();
}
