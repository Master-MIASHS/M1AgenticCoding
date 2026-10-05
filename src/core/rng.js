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
export function roll(gameId, _params = {}) {
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

/**
 * Tirage aléatoire pondéré parmi une liste d'éléments.
 *
 * IMPORTANT : ceci tire seulement un élément selon les poids donnés. Aucune
 * signification de gain/perte ; c'est le jeu qui décide ce que représente
 * l'élément tiré.
 *
 * @param {Array<*>} elements - éléments candidats.
 * @param {number[]} poids - tableau parallèle de poids positifs (même
 *   longueur que elements). Les poids n'ont pas besoin de sommer à 1.
 * @returns {*} un élément de `elements`.
 */
export function tirageAvecPoids(elements, poids) {
  if (!Array.isArray(elements) || !Array.isArray(poids) || elements.length === 0) {
    throw new Error('tirageAvecPoids : elements et poids doivent être des tableaux non vides');
  }
  if (elements.length !== poids.length) {
    throw new Error('tirageAvecPoids : elements et poids doivent avoir la même longueur');
  }
  const total = poids.reduce((somme, p) => somme + p, 0);
  if (!(total > 0) || poids.some((p) => p < 0)) {
    throw new Error('tirageAvecPoids : les poids doivent être positifs ou nuls et leur somme > 0');
  }

  // r est dans [0, total) : la comparaison stricte r < poids[i] et le saut des
  // poids nuls garantissent qu'un élément de poids 0 n'est jamais tiré, même
  // si le hasard renvoie exactement 0.
  let r = hasardActuel() * total;
  let dernierTirable = -1;
  for (let i = 0; i < elements.length; i += 1) {
    if (poids[i] > 0) {
      dernierTirable = i;
      if (r < poids[i]) {
        return elements[i];
      }
      r -= poids[i];
    }
  }
  // Filet de sécurité pour les erreurs d'arrondi flottant : dernier élément
  // de poids strictement positif (jamais un élément de poids nul).
  return elements[dernierTirable];
}

/**
 * Mélange générique et non biaisé d'une liste (algorithme de Fisher-Yates).
 *
 * Sert pour tout besoin de "paquet mélangé" (ex. un paquet de cartes 0-51) :
 * l'appelant est propriétaire du sens de chaque élément, cette fonction ne
 * fait que renvoyer une permutation aléatoire. Ne modifie pas la liste
 * d'origine ; chaque élément est conservé exactement une fois (aucune perte,
 * aucun doublon).
 *
 * @param {Array<*>} liste - la liste à mélanger.
 * @returns {Array<*>} un nouveau tableau contenant les mêmes éléments,
 *   dans un ordre aléatoire.
 */
export function melanger(liste) {
  if (!Array.isArray(liste)) {
    throw new Error('melanger : liste doit être un tableau');
  }
  const resultat = liste.slice();
  for (let i = resultat.length - 1; i > 0; i -= 1) {
    const j = Math.floor(hasardActuel() * (i + 1));
    [resultat[i], resultat[j]] = [resultat[j], resultat[i]];
  }
  return resultat;
}