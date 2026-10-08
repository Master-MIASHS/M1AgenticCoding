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

import { getState } from './state.js';
import {
  getGlobalStats,
  setGameConfig as setGameConfigUnchecked,
} from './config/games.config.js';
import { assertCanModifyConfig } from './permissions.js';
import { creerProfil as creerProfilInterne } from './player.js';

export { getState };
export { roll, tirageEntier, tirageAvecPoids, melanger } from './rng.js';
import { choisirAction as choisirActionInterne } from './ai/poker.js';

/**
 * Choisit l'action du bot de poker (#196) à partir du payload du G2.
 * Seul le payload est transmis : l'appelant ne peut pas imposer la
 * configuration de l'IA (leçon de #227).
 *
 * @param {object} payload - Situation du tour, avec `aiHandStrength` (0 à 1)
 *   évaluée par le G2.
 * @returns {{ type: string, amount?: number }} Décision du bot.
 * @throws {Error} Si le payload est invalide.
 */
export function choisirAction(payload) {
  return choisirActionInterne(payload);
}
export { play, getBalance, claimDailyBonus, requestLoan } from './economy.js';
export { getShopCatalog, getShopInventory, purchaseShopItem } from './shop.js';
export {
  addXP,
  getLevel,
  getUnlockedGames,
  getLeaderboard,
  getHistory,
} from './progression.js';
export { getGlobalStats };
export { exportSave, importSave } from './storage.js';
/**
 * Crée un profil avec les dépendances choisies par le Core uniquement.
 * Les options d'injection du module interne ne sont pas accessibles à l'UI.
 * @param {{ pseudo: string, dateNaissance?: string|null }} infos - Identité du joueur.
 * @returns {object} Copie du nouvel état enregistré.
 * @throws {Error} Identité invalide, état déjà utilisé ou échec de stockage.
 */
export function creerProfil(infos) {
  return creerProfilInterne(infos);
}

/**
 * Modifie la configuration d'un jeu après vérification du rôle côté Core.
 * Le rôle est lu dans l'état partagé et ne provient jamais des arguments UI.
 *
 * @param {string} gameId - Identifiant du jeu à configurer.
 * @param {object} config - Configuration à enregistrer.
 * @returns {{ ok: boolean, gameId: string }} Résultat du setter de configuration.
 * @throws {TypeError} Si le rôle stocké est inconnu.
 * @throws {Error} Si le rôle stocké n'est pas administrateur.
 */
export function setGameConfig(gameId, config = {}) {
  assertCanModifyConfig(getState().role);
  return setGameConfigUnchecked(gameId, config);
}
