// ---------------------------------------------------------------------------
// Core - Classement (Groupe 1, #327)
// ---------------------------------------------------------------------------
// Calcule le classement à partir des états des joueurs, avec la forme cible
// d'AGENTS.md : pseudo, meilleur solde (le score), niveau ; badges après #273.
//
//  * Un seul profil aujourd'hui : le classement contient le joueur courant.
//    calculerClassement(profils) servira tel quel aux profils multiples (n°5).
//  * Rien n'est écrit ; progression.js ne change pas.
//  * Conception détaillée : docs/design/classement.md
// ---------------------------------------------------------------------------

import { getState } from './state.js';

/**
 * Vérifie qu'une valeur est un nombre fini.
 * @param {unknown} valeur - Valeur à vérifier.
 * @returns {boolean} Vrai pour un nombre fini.
 */
const estNombre = (valeur) => typeof valeur === 'number' && Number.isFinite(valeur);

/**
 * Crée l'entrée de classement d'un joueur à partir de son état.
 *
 * @param {{ pseudo?: string, bestBalance: number, balance: number, level: number }} etat -
 *   État du joueur (les autres champs sont ignorés).
 * @returns {{ pseudo: string|null, bestBalance: number, balance: number, level: number }}
 *   Nouvel objet ; `pseudo` vaut null pour une sauvegarde sans profil.
 * @throws {Error} Si l'état n'est pas un objet ou si un montant ou le niveau
 *   n'est pas un nombre fini.
 */
export function entreeDeClassement(etat) {
  if (etat === null || typeof etat !== 'object' || Array.isArray(etat)) {
    throw new Error('classement : un état de joueur doit être un objet');
  }
  const { pseudo, bestBalance, balance, level } = etat;
  if (!estNombre(bestBalance) || !estNombre(balance) || !estNombre(level)) {
    throw new Error('classement : bestBalance, balance et level doivent être des nombres finis');
  }
  return {
    pseudo: typeof pseudo === 'string' && pseudo !== '' ? pseudo : null,
    bestBalance,
    balance,
    level,
  };
}

/**
 * Calcule le classement de plusieurs joueurs : meilleur solde décroissant,
 * puis niveau décroissant, puis pseudo (ordre stable d'un appel à l'autre).
 *
 * @param {Array<object>} profils - États des joueurs (non modifiés).
 * @returns {Array<{ pseudo: string|null, bestBalance: number, balance: number,
 *   level: number }>} Nouvelles entrées, de la première à la dernière place.
 * @throws {Error} Si la liste ou l'un des états est invalide.
 */
export function calculerClassement(profils) {
  if (!Array.isArray(profils)) {
    throw new Error('classement : les profils doivent être un tableau');
  }
  return profils
    .map(entreeDeClassement)
    .sort((a, b) =>
      b.bestBalance - a.bestBalance ||
      b.level - a.level ||
      (a.pseudo ?? '').localeCompare(b.pseudo ?? ''));
}

/**
 * Renvoie le classement calculé sur l'état réel du Core. Exposée par
 * core.js → coreService (remplace les joueurs fictifs de progression.js).
 * Un seul profil aujourd'hui : le joueur courant.
 *
 * @returns {Array<{ pseudo: string|null, bestBalance: number, balance: number,
 *   level: number }>} Nouvelles entrées, classées par meilleur solde.
 */
export function getLeaderboard() {
  return calculerClassement([getState()]);
}
