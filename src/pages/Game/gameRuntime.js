// ---------------------------------------------------------------------------
// Game runtime: plugs the real games into the game page (Groupe 5, integration)
// ---------------------------------------------------------------------------
// For each game of the G2 catalogue, builds ONE createGame instance that
// provides the `start` (and, for multi-step games, `action`) functions the G3
// UI expects: Core draw -> G2 rules -> coreService.play(). The session of a
// multi-step round lives in the instance, so start() and action() must come
// from the same one (contrat G2 § 5.4).
//
// Nothing here decides a result: the outcome comes from the G2 rules, the
// randomness from the Core. The game config is provisional (see
// gamesProvisional.config.js) until the Core serves it through getGameConfig.
// ---------------------------------------------------------------------------

import { CATALOG_GAME_IDS, MULTI_STEP, createGameFromCatalog, getGameDefinition } from '../../games/catalog.js';
import { PROVISIONAL_GAME_CONFIGS } from '../../config/gamesProvisional.config.js';

/**
 * Provisional configuration of a game, or undefined when none is provided.
 *
 * @param {string} gameId
 * @returns {object | undefined}
 */
export function getRuntimeConfig(gameId) {
  return Object.hasOwn(PROVISIONAL_GAME_CONFIGS, gameId) ? PROVISIONAL_GAME_CONFIGS[gameId] : undefined;
}

/**
 * Builds the runtime of a game: one instance, `start` and (multi-step games
 * only) `action`, both asynchronous as the UIs expect.
 *
 * @param {string} gameId
 * @param {object} [core] - injectable for tests; defaults to coreService.
 * @param {() => void} [onRoundSettled] - called after each start/action, even
 *   on error, so the page can refresh balance and navigation.
 * @returns {{ start: Function, action?: Function, config: object } | undefined}
 *   undefined when the game has no rules or no config (shown as unavailable).
 */
export function createGameRuntime(gameId, core, onRoundSettled) {
  const definition = getGameDefinition(gameId);
  const config = getRuntimeConfig(gameId);
  if (definition === undefined || config === undefined) return undefined;

  const game = createGameFromCatalog(gameId, { config, ...(core ? { core } : {}) });
  const notify = () => {
    if (typeof onRoundSettled === 'function') onRoundSettled();
  };
  const start = async (bets) => {
    try {
      return game.start(bets);
    } finally {
      notify();
    }
  };
  if (definition.kind !== MULTI_STEP) return { start, config };
  const action = async (sessionId, playerAction) => {
    try {
      return game.action(sessionId, playerAction);
    } finally {
      notify();
    }
  };
  return { start, action, config };
}

/**
 * Returns the `start(bets)` function of a game, or undefined when the game
 * is not playable (kept for single-step callers; multi-step games should use
 * createGameRuntime so that start and action share their instance).
 *
 * @param {string} gameId
 * @param {object} [core]
 * @returns {Function | undefined}
 */
export function createGameStart(gameId, core) {
  return createGameRuntime(gameId, core)?.start;
}

/** Ids of the games actually plugged into the Core. */
export const PLAYABLE_GAMES = Object.freeze(
  CATALOG_GAME_IDS.filter((id) => getRuntimeConfig(id) !== undefined)
);
