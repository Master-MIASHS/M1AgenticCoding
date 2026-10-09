// ---------------------------------------------------------------------------
// Core Service - the application's official facade for the Core
// ---------------------------------------------------------------------------
// This is the ONLY access point to the Core for:
//   /src/app/   /src/pages/   /src/components/   /src/game-ui/
//
// Those folders MUST NOT import /src/core/* directly.
//
// This file adds NO business logic: it only re-exposes the Core public API
// (defined in /src/core/core.js) as a stable contract.
// ---------------------------------------------------------------------------

import {
  getState,
  roll,
  tirageEntier,
  tirageAvecPoids,
  melanger,
  play,
  getBalance,
  claimDailyBonus,
  requestLoan,
  getShopCatalog,
  getShopInventory,
  purchaseShopItem,
  addXP,
  getLevel,
  getUnlockedGames,
  getLeaderboard,
  getHistory,
  setGameConfig,
  getGlobalStats,
  exportSave,
  importSave,
  creerProfil,
} from '../core/core.js';

export {
  getState,
  roll,
  tirageEntier,
  tirageAvecPoids,
  melanger,
  play,
  getBalance,
  claimDailyBonus,
  requestLoan,
  getShopCatalog,
  getShopInventory,
  purchaseShopItem,
  addXP,
  getLevel,
  getUnlockedGames,
  getLeaderboard,
  getHistory,
  setGameConfig,
  getGlobalStats,
  exportSave,
  importSave,
  creerProfil,
};
