// ---------------------------------------------------------------------------
// Core - Public API
// ---------------------------------------------------------------------------
// This is the ONLY public entry point of the Core. Internal modules (state,
// rng, economy, progression, storage, config) are re-exported here as a
// stable, documented contract.
//
// The rest of the application MUST NOT import the internal Core modules
// directly. It goes through /src/services/coreService.js (the official
// facade), which itself only depends on this file.
// ---------------------------------------------------------------------------

export { getState } from './state.js';
export { roll, tirageEntier, tirageAvecPoids, melanger } from './rng.js';
export { play, getBalance, claimDailyBonus, requestLoan } from './economy.js';
export {
  addXP,
  getLevel,
  getUnlockedGames,
  getLeaderboard,
  getHistory,
} from './progression.js';
export { setGameConfig, getGlobalStats } from './config/games.config.js';
export { exportSave, importSave } from './storage.js';
