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
import { tirageAvecPoids } from '../rng.js';

// Actions du contrat G2 (discussion #9). Toute autre valeur est un écart de
// contrat, signalé par une erreur plutôt qu'ignorée.
const ACTIONS_CONNUES = ['fold', 'check', 'call', 'raise'];

const NIVEAUX = ['faible', 'moyenne', 'forte'];

/**
 * Indique si une valeur est un poids utilisable par tirageAvecPoids.
 * @param {*} valeur - Valeur à tester.
 * @returns {boolean} Vrai pour un nombre fini positif ou nul.
 */
function estUnPoids(valeur) {
  return typeof valeur === 'number' && Number.isFinite(valeur) && valeur >= 0;
}

/**
 * Indique si une valeur est un objet simple (ni null, ni tableau).
 * @param {*} valeur - Valeur à tester.
 * @returns {boolean} Vrai pour un objet simple.
 */
function estUnObjet(valeur) {
  return valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur);
}

/**
 * Vérifie qu'une configuration de l'IA est complète et cohérente.
 *
 * Une config injectée invalide donnerait sinon une erreur JavaScript peu
 * claire, ou un bot qui enfreint ses garanties (ex. multiplicateur < 1 :
 * relance sous minRaise).
 *
 * @param {object} config - Configuration de l'IA (forme d'AI_POKER_CONFIG).
 * @returns {void}
 * @throws {Error} Si les seuils, les poids des actions, les relances ou
 *   l'ordre de repli sont invalides.
 */
export function validerConfig(config) {
  const seuils = config?.seuils;
  if (
    !estUnObjet(seuils) ||
    typeof seuils.moyenne !== 'number' ||
    typeof seuils.forte !== 'number' ||
    !(seuils.moyenne >= 0 && seuils.moyenne <= seuils.forte && seuils.forte <= 1)
  ) {
    throw new Error('validerConfig : seuils doit contenir 0 ≤ moyenne ≤ forte ≤ 1');
  }

  const poidsActions = config.poidsActions;
  const poidsActionsValides =
    estUnObjet(poidsActions) &&
    NIVEAUX.every(
      (niveau) =>
        estUnObjet(poidsActions[niveau]) &&
        ACTIONS_CONNUES.every((action) => estUnPoids(poidsActions[niveau][action])),
    );
  if (!poidsActionsValides) {
    throw new Error(
      'validerConfig : poidsActions doit donner un poids fini ≥ 0 à chaque action pour chaque niveau',
    );
  }

  const relance = config.relance;
  const multiplicateurs = relance?.multiplicateurs;
  const relanceValide =
    estUnObjet(relance) &&
    Array.isArray(multiplicateurs) &&
    multiplicateurs.length > 0 &&
    multiplicateurs.every((m) => typeof m === 'number' && Number.isFinite(m) && m >= 1) &&
    estUnObjet(relance.poids) &&
    NIVEAUX.every((niveau) => {
      const poids = relance.poids[niveau];
      return (
        Array.isArray(poids) &&
        poids.length === multiplicateurs.length &&
        poids.every(estUnPoids) &&
        poids.some((p) => p > 0)
      );
    });
  if (!relanceValide) {
    throw new Error(
      'validerConfig : relance doit avoir des multiplicateurs finis ≥ 1 et, pour chaque niveau, ' +
        'autant de poids finis ≥ 0 dont au moins un strictement positif',
    );
  }

  const ordre = config.ordreDeRepli;
  if (
    !Array.isArray(ordre) ||
    ordre.length !== ACTIONS_CONNUES.length ||
    !ACTIONS_CONNUES.every((action) => ordre.includes(action))
  ) {
    throw new Error('validerConfig : ordreDeRepli doit contenir les quatre actions une seule fois');
  }
}

/**
 * Classe la force d'une main en niveau, selon les seuils de la config.
 *
 * @param {number} force - Force de la main, de 0 (la plus faible) à 1 (la
 *   plus forte).
 * @param {{ seuils: { moyenne: number, forte: number } }} [config] -
 *   Configuration de l'IA (AI_POKER_CONFIG par défaut).
 * @returns {'faible'|'moyenne'|'forte'} Le niveau de force.
 * @throws {Error} Si la force n'est pas un nombre compris entre 0 et 1, ou si
 *   la configuration est invalide.
 */
export function niveauDeForce(force, config = AI_POKER_CONFIG) {
  validerConfig(config);
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

/**
 * Calcule le montant d'une relance du bot.
 *
 * Le montant vaut `minRaise × multiplicateur`, le multiplicateur étant tiré
 * (via rng.js) avec les poids du niveau dans la config, puis plafonné aux
 * jetons du bot. Il reste donc toujours entre `minRaise` et `aiState.chips`.
 *
 * @param {{ minRaise: number, aiState: { chips: number } }} situation -
 *   Situation transmise par le G2 (relance possible pour le bot).
 * @param {'faible'|'moyenne'|'forte'} niveau - Niveau de force de la main.
 * @param {{ relance: { multiplicateurs: number[],
 *   poids: Object<string, number[]> } }} [config] - Configuration de l'IA
 *   (AI_POKER_CONFIG par défaut).
 * @returns {number} Montant de la relance.
 * @throws {Error} Si le niveau est inconnu, si `minRaise` est invalide, si
 *   les jetons du bot sont sous `minRaise` ou si la configuration est invalide.
 */
export function montantDeRelance(situation, niveau, config = AI_POKER_CONFIG) {
  validerConfig(config);
  const { multiplicateurs, poids } = config.relance;
  if (!Object.hasOwn(poids, niveau)) {
    throw new Error(`montantDeRelance : niveau de force inconnu ${String(niveau)}`);
  }
  const { minRaise, aiState } = situation;
  if (typeof minRaise !== 'number' || !Number.isFinite(minRaise) || minRaise <= 0) {
    throw new Error('montantDeRelance : minRaise doit être un nombre fini strictement positif');
  }
  if (!(aiState?.chips >= minRaise)) {
    throw new Error('montantDeRelance : les jetons du bot sont sous minRaise');
  }
  const multiplicateur = tirageAvecPoids(multiplicateurs, poids[niveau]);
  return Math.min(minRaise * multiplicateur, aiState.chips);
}

/**
 * Décide l'action du bot à partir de la force de sa main.
 *
 * L'action est tirée (via rng.js) parmi les actions jouables, avec les poids
 * du niveau de force dans la config. Si toutes ces actions ont un poids nul,
 * le bot joue la première action jouable de `ordreDeRepli`. Une relance
 * reçoit un montant compris entre `minRaise` et les jetons du bot.
 *
 * @param {number} force - Force de la main du bot, de 0 à 1.
 * @param {{ availableActions: string[], minRaise?: number,
 *   aiState: { chips: number } }} situation - Situation transmise par le G2.
 * @param {object} [options] - Dépendances injectables (tests, réglages).
 * @param {object} [options.config] - Configuration de l'IA (AI_POKER_CONFIG
 *   par défaut).
 * @returns {{ type: 'fold'|'check'|'call' } | { type: 'raise', amount: number }}
 *   La décision : `type` est toujours dans `availableActions`.
 * @throws {Error} Si la force, la situation ou la configuration est invalide.
 */
export function deciderAction(force, situation, { config = AI_POKER_CONFIG } = {}) {
  const niveau = niveauDeForce(force, config);
  const candidates = actionsCandidates(situation);
  const poids = candidates.map((action) => config.poidsActions[niveau][action]);

  // validerConfig (appelée par niveauDeForce) garantit que ordreDeRepli
  // contient les quatre actions : une action jouable y est toujours trouvée.
  const type = poids.every((p) => p === 0)
    ? config.ordreDeRepli.find((action) => candidates.includes(action))
    : tirageAvecPoids(candidates, poids);

  if (type === 'raise') {
    return { type, amount: montantDeRelance(situation, niveau, config) };
  }
  return { type };
}
