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
import { setGameConfig as setGameConfigUnchecked } from './config/games.config.js';
import { assertCanModifyConfig } from './permissions.js';
import {
  getCapitalDeDepartActuel,
  reglerCapitalDeDepart,
} from './config/player.config.js';
import {
  getEvenementsBonus as lireEvenementsBonus,
  getMultiplicateurBonus as lireMultiplicateurBonus,
  lancerEvenementBonus as lancerEvenementBonusSansControle,
  arreterEvenementBonus as arreterEvenementBonusSansControle,
} from './config/events.config.js';
import { creerProfil as creerProfilInterne } from './player.js';
import {
  ajusterSoldeAdmin,
  activerRoleAdminDev as activerRoleAdminDevInterne,
} from './admin.js';

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
export { getGlobalStats } from './stats.js';
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

// ---------------------------------------------------------------------------
// Réglages admin (#260) : lectures publiques ; réglages réservés à l'admin,
// rôle vérifié dans le Core (n°24). Aucune option n'est transmise : l'appelant
// ne choisit ni stockage, ni horloge, ni configuration (leçon de #227).
// ---------------------------------------------------------------------------

/**
 * Renvoie le capital de départ effectif des nouveaux joueurs.
 * @returns {number} Capital réglé par l'admin, sinon le défaut (1000).
 */
export function getStartingCapital() {
  return getCapitalDeDepartActuel();
}

/**
 * Règle le capital de départ des nouveaux joueurs (admin uniquement).
 * Les soldes des joueurs existants ne changent pas.
 *
 * @param {number} amount - Nouveau capital, nombre fini strictement positif.
 * @returns {number} Le capital enregistré.
 * @throws {Error} Si le rôle stocké n'est pas administrateur, ou si le
 *   capital est invalide (rien n'est alors modifié).
 */
export function setStartingCapital(amount) {
  assertCanModifyConfig(getState().role);
  return reglerCapitalDeDepart(amount);
}

/**
 * Renvoie tous les événements bonus enregistrés.
 * @returns {Array<object>} Copie indépendante des événements.
 */
export function getEvenementsBonus() {
  return lireEvenementsBonus();
}

/**
 * Renvoie le multiplicateur bonus en cours pour une cible.
 * @param {'gains'|'xp'} cible - Cible du bonus.
 * @returns {number} Multiplicateur (1 sans événement en cours).
 * @throws {Error} Si la cible est inconnue.
 */
export function getMultiplicateurBonus(cible) {
  return lireMultiplicateurBonus(cible);
}

/**
 * Lance un événement bonus (admin uniquement).
 * @param {{ id: string, cible: 'gains'|'xp', multiplicateur: number,
 *   debut: number, fin: number }} evenement - Événement à lancer.
 * @returns {object} Copie de l'événement enregistré.
 * @throws {Error} Si le rôle n'est pas administrateur, ou si l'événement est
 *   invalide ou en conflit (rien n'est alors modifié).
 */
export function lancerEvenementBonus(evenement) {
  assertCanModifyConfig(getState().role);
  return lancerEvenementBonusSansControle(evenement);
}

/**
 * Arrête un événement bonus (admin uniquement).
 * @param {string} id - Identifiant de l'événement.
 * @returns {object} Copie de l'événement retiré.
 * @throws {Error} Si le rôle n'est pas administrateur, ou si l'événement
 *   n'existe pas.
 */
export function arreterEvenementBonus(id) {
  assertCanModifyConfig(getState().role);
  return arreterEvenementBonusSansControle(id);
}

/**
 * Ajuste le solde du profil courant (admin uniquement, #322) : ajout ou
 * retrait, tracé dans l'historique. Le rôle est relu dans l'état du Core ;
 * seul le montant passe par la façade (profils multiples pas encore faits).
 * @param {number} amount - Positif pour un ajout, négatif pour un retrait.
 * @returns {{ type: 'ADMIN_ADJUSTMENT', amount: number, balanceBefore: number,
 *   balanceAfter: number, adjustedAt: string }} Entrée ajoutée à l'historique.
 * @throws {TypeError} Montant invalide.
 * @throws {Error} Si le rôle n'est pas administrateur (rien n'est modifié).
 * @throws {RangeError} Si le solde deviendrait négatif (rien n'est modifié).
 */
export function updatePlayerBalance(amount) {
  return ajusterSoldeAdmin(amount);
}

/**
 * Passe le profil courant en admin, uniquement dans l'application lancée en
 * développement (bascule validée par le G5, #255). Refusé dans le site compilé.
 * @returns {'admin'} Le rôle enregistré.
 * @throws {Error} Hors du mode dev (rien n'est modifié).
 */
export function activerRoleAdminDev() {
  return activerRoleAdminDevInterne();
}
