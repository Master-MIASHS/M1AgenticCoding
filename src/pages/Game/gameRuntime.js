// ---------------------------------------------------------------------------
// Game runtime: plugs the real games into the game page (Groupe 5, integration)
// ---------------------------------------------------------------------------
// For each game that has rules + draw (G2) AND a UI (G3), builds the `start`
// function the G3 UI expects: createGame(...).start, i.e. Core draw -> G2
// rules -> coreService.play(). The page passes it to the UI instead of the
// UI's mock. A game absent from GAME_RUNTIMES keeps its demo mode.
//
// Nothing here decides a result: the outcome comes from the G2 rules, the
// randomness from the Core. `adapt` only reshapes the answer for the UI.
// ---------------------------------------------------------------------------

import { createGame } from '../../games/_template/createGame.js';
import * as slotsRules from '../../games/slots/rules.js';
import { draw as drawSlots } from '../../games/slots/draw.js';
import * as rouletteRules from '../../games/roulette/rules.js';
import { draw as drawRoulette } from '../../games/roulette/index.js';
import { PROVISIONAL_GAME_CONFIGS } from '../../config/gamesProvisional.config.js';

/**
 * Display color of a roulette number, read from the configured layout.
 *
 * @param {number} number
 * @param {{ red: number[], black: number[] }} layout
 * @returns {'red' | 'black' | 'green'}
 */
function rouletteColor(number, layout) {
  if (layout.red.includes(number)) return 'red';
  if (layout.black.includes(number)) return 'black';
  return 'green';
}

const GAME_RUNTIMES = {
  slots: {
    rules: slotsRules,
    draw: drawSlots,
    config: PROVISIONAL_GAME_CONFIGS.slots,
  },
  roulette: {
    rules: rouletteRules,
    draw: drawRoulette,
    config: PROVISIONAL_GAME_CONFIGS.roulette,
    // The G3 roulette UI reads renderPayload.number / .color (#8).
    adapt: (response, config) => ({
      ...response,
      renderPayload: {
        ...response.renderPayload,
        number: response.renderPayload.raw,
        color: rouletteColor(response.renderPayload.raw, config.layout),
      },
    }),
  },
};

/**
 * Returns the `start(bets)` function to hand to a game's UI, or undefined
 * when the game is not playable yet (the page then keeps the demo mode).
 *
 * @param {string} gameId
 * @param {object} [core] - injectable for tests; defaults to coreService.
 * @returns {((bets: Array<{ type: string, amount: number }>) => Promise<object>) | undefined}
 */
export function createGameStart(gameId, core) {
  if (!Object.hasOwn(GAME_RUNTIMES, gameId)) return undefined;
  const { rules, draw, config, adapt } = GAME_RUNTIMES[gameId];
  const game = createGame({ id: gameId, rules, draw, config, ...(core ? { core } : {}) });
  return async (bets) => {
    const response = game.start(bets);
    return adapt ? adapt(response, config) : response;
  };
}

/** Ids of the games actually plugged into the Core. */
export const PLAYABLE_GAMES = Object.freeze(Object.keys(GAME_RUNTIMES));
