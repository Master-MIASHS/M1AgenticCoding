// ---------------------------------------------------------------------------
// Core - State
// ---------------------------------------------------------------------------
// Shared game state with local persistence.
//
// ---------------------------------------------------------------------------
// LOCAL STORAGE SCHEMA (documented contract)
// ---------------------------------------------------------------------------
// Main key : "casino_state"
//
// {
//   balance: number,
//   bestBalance: number,
//   xp: number,
//   level: number,
//   unlockedGames: string[],
//   history: [],
//   role: "player" | "admin"
// }
// ---------------------------------------------------------------------------

export const STORAGE_KEY = 'casino_state';

const DEFAULT_STATE = {
  balance: 1000,
  bestBalance: 1000,
  xp: 0,
  level: 1,
  unlockedGames: ['slots', 'dice'],
  history: [],
  role: 'player',
};

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateState(state) {
  const valid =
    isRecord(state) &&
    Number.isFinite(state.balance) &&
    Number.isFinite(state.bestBalance) &&
    Number.isFinite(state.xp) &&
    state.xp >= 0 &&
    Number.isInteger(state.level) &&
    state.level >= 1 &&
    Array.isArray(state.unlockedGames) &&
    state.unlockedGames.every((gameId) => typeof gameId === 'string') &&
    Array.isArray(state.history) &&
    (state.role === 'player' || state.role === 'admin');

  if (!valid) {
    throw new Error('state: invalid state shape.');
  }
}

function cloneState(state) {
  return structuredClone(state);
}

/**
 * Démarre avec l'état par défaut quand l'état enregistré est inutilisable.
 * casino_state n'est pas écrasé ici : il ne sera remplacé qu'au prochain
 * enregistrement réussi (tâche n°27, #239).
 * @param {string} reason - Cause affichée dans l'avertissement.
 * @param {unknown} error - Erreur d'origine, pour le diagnostic.
 * @returns {object} Copie de l'état par défaut.
 */
function startFromDefault(reason, error) {
  console.warn(
    `state: ${reason} ; démarrage avec l'état par défaut (casino_state conservé jusqu'au prochain enregistrement).`,
    error
  );
  return cloneState(DEFAULT_STATE);
}

/**
 * Lit l'état enregistré au démarrage sans jamais faire échouer le chargement
 * du module : un stockage inaccessible, un JSON invalide ou un schéma invalide
 * donnent l'état par défaut avec un avertissement. Le démarrage accepte
 * exactement les états qu'accepte la restauration d'une sauvegarde.
 * @returns {object} État initial validé.
 */
function readInitialState() {
  let storedState;
  try {
    storedState = globalThis.localStorage?.getItem(STORAGE_KEY);
  } catch (error) {
    return startFromDefault('stockage local inaccessible', error);
  }
  if (storedState === null || storedState === undefined) {
    return cloneState(DEFAULT_STATE);
  }

  try {
    const parsedState = JSON.parse(storedState);
    validateState(parsedState);
    return cloneState(parsedState);
  } catch (error) {
    return startFromDefault('état enregistré illisible ou non conforme', error);
  }
}

let currentState = readInitialState();
let writing = false;

/**
 * Refuse une écriture imbriquée qui pourrait écraser une transaction en cours.
 * @returns {void}
 */
function assertIdle() {
  if (writing) throw new Error('state: une écriture est déjà en cours.');
}

/**
 * Vérifie que les données gardent leur forme après sérialisation JSON.
 * @param {*} value - Donnée à enregistrer.
 * @param {Set<object>} ancestors - Objets du chemin courant, pour détecter les cycles.
 * @returns {void}
 */
function validateJSON(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object' || value === null ||
      (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) ||
      ancestors.has(value)) {
    throw new TypeError('state: données JSON finies et sans cycle attendues.');
  }
  if (Array.isArray(value) && Object.keys(value).length !== value.length) {
    throw new TypeError('state: tableau dense sans propriétés supplémentaires attendu.');
  }
  ancestors.add(value);
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    validateJSON(child, ancestors);
  }
  ancestors.delete(value);
}

/**
 * Enregistre avant de publier en mémoire un état déjà validé et isolé.
 * @param {object} nextState - Nouvel état interne.
 * @returns {object} Copie indépendante du nouvel état.
 */
function persistState(nextState) {
  const result = cloneState(nextState);
  const serializedState = JSON.stringify(nextState);
  globalThis.localStorage?.setItem(STORAGE_KEY, serializedState);
  currentState = nextState;
  return result;
}

/**
 * Applique une mise à jour synchrone complète, isolée et atomique.
 * Le callback calcule sur une copie et retourne l'état complet, sans effets externes.
 * Toute erreur de calcul, validation ou stockage conserve l'état précédent.
 * L'XP, le niveau et le meilleur solde ne peuvent pas diminuer pendant une mise à jour.
 * Fonction interne : jamais exposée à l'UI via coreService.
 * @param {function(object): object} updater - Calcul synchrone du nouvel état.
 * @returns {object} Copie de l'état appliqué.
 * @throws {Error} Callback invalide, données invalides ou échec de persistance.
 */
export function updateState(updater) {
  assertIdle();
  if (typeof updater !== 'function') throw new TypeError('state: fonction de mise à jour attendue.');
  writing = true;
  try {
    const candidate = updater(getState());
    if (candidate instanceof Promise) {
      // Le rejet du résultat asynchrone ne doit pas laisser une promesse non gérée.
      candidate.catch(() => {});
      throw new TypeError('state: une mise à jour doit être synchrone.');
    }
    const nextState = cloneState(candidate);
    validateState(nextState);
    validateJSON(nextState);
    if (!Number.isSafeInteger(nextState.level) ||
        nextState.xp < currentState.xp || nextState.level < currentState.level ||
        nextState.bestBalance < currentState.bestBalance ||
        nextState.bestBalance < nextState.balance) {
      throw new RangeError('state: progression ou meilleur solde invalide.');
    }
    return persistState(nextState);
  } finally {
    writing = false;
  }
}

/**
 * Returns an independent copy of the current game state.
 *
 * @returns {{
 *   balance: number,
 *   bestBalance: number,
 *   xp: number,
 *   level: number,
 *   unlockedGames: string[],
 *   history: Array,
 *   role: string
 * }}
 */
export function getState() {
  return cloneState(currentState);
}

/**
 * Replaces the current state after full validation.
 * This internal operation is used by save restoration, not exposed to the UI.
 *
 * @param {object} savedState
 * @returns {object} independent copy of the restored state.
 */
export function restoreState(savedState) {
  assertIdle();
  writing = true;
  try {
    validateState(savedState);
    return persistState(cloneState(savedState));
  } finally {
    writing = false;
  }
}
