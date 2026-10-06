// ---------------------------------------------------------------------------
// Core - Progression
// ---------------------------------------------------------------------------
// XP / niveaux avec adaptateur temporaire ; autres fonctions encore mockées.
// ---------------------------------------------------------------------------

import { getState } from './state.js';
import { TEMPORARY_LEVEL_THRESHOLDS } from './config/progression.config.js';
import { createProgressionMock } from './progression.mock.js';

/**
 * Vérifie qu'une quantité d'XP est finie et positive ou nulle.
 * @param {number} xp - Quantité à vérifier.
 * @returns {void}
 */
function validateXP(xp) {
  if (!Number.isFinite(xp) || xp < 0) {
    throw new RangeError('XP : nombre fini positif ou nul attendu.');
  }
}

/**
 * Calcule le niveau depuis les seuils d'XP cumulée, borné au dernier niveau.
 * @param {number} xp - XP cumulée.
 * @param {number[]} thresholds - Seuils strictement croissants depuis zéro.
 * @returns {number} Niveau atteint (à partir de 1).
 */
export function calculateLevel(xp, thresholds = TEMPORARY_LEVEL_THRESHOLDS) {
  validateXP(xp);
  if (!Array.isArray(thresholds) || thresholds.length === 0 || thresholds[0] !== 0) {
    throw new RangeError('Les seuils doivent commencer à zéro.');
  }
  let level = 1;
  for (let index = 0; index < thresholds.length; index += 1) {
    const threshold = thresholds[index];
    validateXP(threshold);
    if (index > 0 && threshold <= thresholds[index - 1]) {
      throw new RangeError('Les seuils doivent être strictement croissants.');
    }
    if (xp >= threshold) level = index + 1;
  }
  return level;
}

/**
 * Crée la logique de progression sur un adaptateur synchrone read/write.
 * Chaque opération relit la progression ; aucune donnée économique n'est écrite.
 * @param {{ read: function(): {xp: number, level: number}, write: function(object): void }} store
 * @param {number[]} thresholds - Seuils cumulés, copiés à la création.
 * @returns {{ addXP: function(number): object, getLevel: function(): number }}
 */
export function createProgression(store, thresholds = TEMPORARY_LEVEL_THRESHOLDS) {
  calculateLevel(0, thresholds);
  const configuredThresholds = [...thresholds];

  /**
   * Lit et valide la progression sans perdre un niveau déjà acquis.
   * @returns {{ xp: number, level: number }} Progression courante.
   */
  function readProgression() {
    const { xp, level } = store.read();
    validateXP(xp);
    if (!Number.isSafeInteger(level) || level < 1) {
      throw new RangeError('Niveau : entier positif attendu.');
    }
    return { xp, level: Math.max(level, calculateLevel(xp, configuredThresholds)) };
  }

  return {
    /**
     * Cumule un gain d'XP et écrit les deux champs ensemble.
     * @param {number} amount - Gain positif ou nul.
     * @returns {{ xp: number, level: number }} Progression après écriture.
     */
    addXP(amount) {
      validateXP(amount);
      const current = readProgression();
      const xp = current.xp + amount;
      const level = Math.max(current.level, calculateLevel(xp, configuredThresholds));
      store.write({ xp, level });
      return { xp, level };
    },
    /**
     * Retourne le niveau calculé sans diminuer un niveau déjà acquis.
     * @returns {number} Niveau courant.
     */
    getLevel() { return readProgression().level; },
  };
}

// Initialisation différée : capture du state à la première utilisation seulement.
let defaultProgression;

/**
 * Fournit l'instance temporaire en attendant l'adaptateur du groupe Core.
 * @returns {ReturnType<typeof createProgression>} Service local de progression.
 */
function getProgression() {
  defaultProgression ??= createProgression(createProgressionMock(getState()));
  return defaultProgression;
}

/**
 * Ajoute de l'XP dans le mock de progression, sans écrire dans le state Core.
 * @param {number} amount - Gain positif ou nul.
 * @returns {{ xp: number, level: number }}
 */
export function addXP(amount) {
  return getProgression().addXP(amount);
}

/** @returns {number} Niveau courant du mock de progression. */
export function getLevel() {
  return getProgression().getLevel();
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
