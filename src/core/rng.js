// ---------------------------------------------------------------------------
// Core - RNG (Random Number Generator)
// ---------------------------------------------------------------------------
// ABSOLUTE RULE: this file is the SINGLE source of randomness in the project.
//
//  * No other file may call Math.random() directly.
//  * roll() only produces RAW random values. It NEVER decides whether the
//    player won or lost. Interpreting a raw result into a win/loss is the
//    responsibility of each game, inside /src/games/.
//  * math.js is the only randomness helper used and stays encapsulated here.
// ---------------------------------------------------------------------------

import { random as hasardParDefaut, create, randomDependencies } from 'mathjs';

// Source de hasard interne, utilisée par toutes les fonctions du fichier.
// Remplaçable via semer() pour obtenir des séquences reproductibles dans les
// tests, sans jamais passer par Math.random().
let hasardActuel = hasardParDefaut;

/**
 * Rend le générateur déterministe (ou lui redonne un vrai hasard).
 *
 * Réservé aux tests / vérifications de reproductibilité : le code de
 * production ne doit jamais s'appuyer sur une graine fixe.
 *
 * @param {string|number|null} valeur - la graine, ou null/undefined pour
 *   revenir au hasard non déterministe par défaut.
 */
export function semer(valeur) {
  if (valeur === null || valeur === undefined) {
    hasardActuel = hasardParDefaut;
    return;
  }
  hasardActuel = create(randomDependencies, { randomSeed: String(valeur) }).random;
}

/**
 * Produces a raw random result for a given game.
 *
 * IMPORTANT: the returned value is raw and game-agnostic. It carries NO
 * win/loss meaning. Games map it to their own mechanics in /src/games/.
 *
 * @param {string} gameId - identifier of the requesting game.
 * @param {object} [params] - optional game-specific parameters (ignored here).
 * @returns {{ gameId: string, value: number, nonce: number }}
 *   value : a raw float in [0, 1).
 *   nonce : a raw integer, useful for tie-breaking / auditing.
 */
export function roll(gameId, params = {}) {
  return {
    gameId,
    value: hasardActuel(),
    nonce: Math.floor(hasardActuel() * 1000000),
  };
}

/**
 * Tirage entier aléatoire uniforme, bornes incluses.
 *
 * IMPORTANT : tirage brut uniquement, aucune signification de gain/perte.
 * Ce sont les jeux qui interprètent la valeur retournée.
 *
 * @param {number} min - borne inférieure incluse (entier).
 * @param {number} max - borne supérieure incluse (entier), doit être >= min.
 * @returns {number} un entier compris entre min et max (inclus).
 */
export function tirageEntier(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new Error(`tirageEntier : bornes invalides [${min}, ${max}]`);
  }
  return min + Math.floor(hasardActuel() * (max - min + 1));
}