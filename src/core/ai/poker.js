// ---------------------------------------------------------------------------
// Core - IA des bots du poker (Groupe 1, tâche n°32)
// ---------------------------------------------------------------------------
// Choisit l'action du bot à son tour de jeu, parmi celles que le G2 déclare
// possibles.
//
//  * Fonctions PURES : rien n'est écrit dans l'état. Les jetons du bot restent
//    dans la session du G2 (contrat validé dans la discussion #9).
//  * Aucune règle du poker ici : elles appartiennent au G2. L'IA reçoit une
//    force de main déjà calculée et n'importe jamais src/games/.
//  * Hasard uniquement via rng.js (règle 2) ; réglages lus dans
//    config/ai.config.js (règle 4).
//  * Conception détaillée : docs/design/ia-poker.md
// ---------------------------------------------------------------------------

import { AI_POKER_CONFIG } from '../config/ai.config.js';

/**
 * Classe la force d'une main en niveau, selon les seuils de la config.
 *
 * @param {number} force - Force de la main, de 0 (la plus faible) à 1 (la
 *   plus forte).
 * @param {{ seuils: { moyenne: number, forte: number } }} [config] -
 *   Configuration de l'IA (AI_POKER_CONFIG par défaut).
 * @returns {'faible'|'moyenne'|'forte'} Le niveau de force.
 * @throws {Error} Si la force n'est pas un nombre compris entre 0 et 1.
 */
export function niveauDeForce(force, config = AI_POKER_CONFIG) {
  if (typeof force !== 'number' || !(force >= 0 && force <= 1)) {
    throw new Error('niveauDeForce : la force doit être un nombre entre 0 et 1');
  }
  if (force >= config.seuils.forte) {
    return 'forte';
  }
  if (force >= config.seuils.moyenne) {
    return 'moyenne';
  }
  return 'faible';
}
