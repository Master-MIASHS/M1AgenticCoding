import { TEMPORARY_LEVEL_THRESHOLDS } from './config/progression.config.js';

/**
 * Retourne le seuil total d'XP du niveau suivant, ou null sans niveau suivant.
 * L'appelant fournit le niveau effectif de la progression, conservant les niveaux
 * acquis. Ce helper ne recalcule pas le niveau depuis l'XP et ne lit pas l'état.
 * Ahmed conserve l'exposition de ce résultat via getState/coreService (#249).
 *
 * @param {number} currentLevel - Niveau courant effectif, entier sûr positif.
 * @param {number[]} [thresholds=TEMPORARY_LEVEL_THRESHOLDS] - Seuils cumulés
 * strictement croissants depuis zéro ; l'indice zéro correspond au niveau 1.
 * @returns {number|null} Seuil total suivant, jamais l'XP restante.
 * @throws {RangeError} Si le niveau ou la configuration est invalide.
 */
export function calculateXPForNextLevel(currentLevel, thresholds = TEMPORARY_LEVEL_THRESHOLDS) {
  if (!Number.isSafeInteger(currentLevel) || currentLevel < 1) {
    throw new RangeError('Niveau : entier sûr positif attendu.');
  }
  if (!Array.isArray(thresholds) || thresholds.length === 0 || thresholds[0] !== 0) {
    throw new RangeError('Les seuils doivent commencer à zéro.');
  }
  for (let index = 0; index < thresholds.length; index += 1) {
    const threshold = thresholds[index];
    if (!Number.isFinite(threshold) || threshold < 0
      || (index > 0 && threshold <= thresholds[index - 1])) {
      throw new RangeError('Les seuils doivent être finis, non négatifs et strictement croissants.');
    }
  }
  return currentLevel >= thresholds.length ? null : thresholds[currentLevel];
}
