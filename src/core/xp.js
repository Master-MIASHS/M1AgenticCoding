import { XP_GAIN_CONFIG } from './config/progression.config.js';

/**
 * Calcule le gain XP d'une partie sans lire ni modifier l'état du joueur.
 * L'appelant confirme l'éligibilité et fournit le bonus XP actif au règlement.
 * Amina applique ensuite le gain avec toutes les conséquences dans play(),
 * sans second appel à addXP. Le résultat et la mise n'influencent pas ce calcul.
 *
 * @param {object} input - Paramètres internes du règlement G1.
 * @param {boolean} input.completed - True uniquement si la partie est terminée
 * et validée ; false notamment pour un abandon ou une annulation.
 * @param {number} [input.baseXP=XP_GAIN_CONFIG.baseXP] - Base finie non négative.
 * @param {number} [input.xpMultiplier=1] - Bonus XP fini strictement positif,
 * injecté depuis le gestionnaire partagé (1 en l'absence de bonus).
 * @returns {number} Gain fini non négatif, sans arrondi, ou zéro si non éligible.
 * @throws {TypeError} Si l'entrée, l'éligibilité ou les nombres sont invalides.
 * @throws {RangeError} Si les domaines ou le résultat numérique sont invalides.
 */
export function calculateXPGained(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('XP: input must be an object.');
  }
  const { completed, baseXP = XP_GAIN_CONFIG.baseXP, xpMultiplier = 1 } = input;
  if (typeof completed !== 'boolean') {
    throw new TypeError('XP: completed must be a boolean.');
  }
  if (!Number.isFinite(baseXP) || !Number.isFinite(xpMultiplier)) {
    throw new TypeError('XP: baseXP and xpMultiplier must be finite numbers.');
  }
  if (baseXP < 0 || xpMultiplier <= 0) {
    throw new RangeError('XP: baseXP must be non-negative and xpMultiplier positive.');
  }
  if (!completed) return 0;

  const gained = baseXP * xpMultiplier;
  if (!Number.isFinite(gained)) {
    throw new RangeError('XP: calculated gain must be finite.');
  }
  return gained;
}
