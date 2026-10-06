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

// Actions du contrat G2 (discussion #9). Toute autre valeur est un écart de
// contrat, signalé par une erreur plutôt qu'ignorée.
const ACTIONS_CONNUES = ['fold', 'check', 'call', 'raise'];

/**
 * Détermine les actions que le bot peut réellement jouer.
 *
 * Part des actions déclarées possibles par le G2 (dans leur ordre), puis :
 *  - retire `fold` quand `check` est possible : se coucher alors qu'on peut
 *    parler gratuitement n'est jamais meilleur ;
 *  - retire `raise` si les jetons du bot sont sous `minRaise` : le montant ne
 *    pourrait pas respecter les bornes promises au G2.
 *
 * @param {{ availableActions: string[], minRaise?: number,
 *   aiState: { chips: number } }} situation - Situation transmise par le G2.
 * @returns {string[]} Actions jouables (nouveau tableau, jamais vide).
 * @throws {Error} Si la situation est invalide ou si aucune action ne reste
 *   jouable.
 */
export function actionsCandidates(situation) {
  if (situation === null || typeof situation !== 'object' || Array.isArray(situation)) {
    throw new Error('actionsCandidates : la situation doit être un objet');
  }
  const { availableActions, minRaise, aiState } = situation;
  if (!Array.isArray(availableActions) || availableActions.length === 0) {
    throw new Error('actionsCandidates : availableActions doit être un tableau non vide');
  }
  const inconnue = availableActions.find((action) => !ACTIONS_CONNUES.includes(action));
  if (inconnue !== undefined) {
    throw new Error(`actionsCandidates : action inconnue ${String(inconnue)}`);
  }
  if (
    aiState === null ||
    typeof aiState !== 'object' ||
    typeof aiState.chips !== 'number' ||
    !Number.isFinite(aiState.chips) ||
    aiState.chips < 0
  ) {
    throw new Error('actionsCandidates : aiState.chips doit être un nombre fini positif ou nul');
  }
  const relancePossible = availableActions.includes('raise');
  if (
    relancePossible &&
    (typeof minRaise !== 'number' || !Number.isFinite(minRaise) || minRaise <= 0)
  ) {
    throw new Error('actionsCandidates : minRaise doit être un nombre fini strictement positif');
  }

  const checkPossible = availableActions.includes('check');
  const candidates = availableActions.filter((action) => {
    if (action === 'fold') {
      return !checkPossible;
    }
    if (action === 'raise') {
      return aiState.chips >= minRaise;
    }
    return true;
  });
  if (candidates.length === 0) {
    throw new Error('actionsCandidates : aucune action ne reste jouable pour le bot');
  }
  return candidates;
}
