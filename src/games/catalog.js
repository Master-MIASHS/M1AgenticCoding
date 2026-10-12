// ---------------------------------------------------------------------------
// Games - Catalogue of the playable G2 games (Groupe 2)
// ---------------------------------------------------------------------------
// One entry per game that has its rules (and, when needed, its own draw) on
// `main`: { kind, rules, draw }. It is the single place where the app (G4/G5,
// e.g. src/pages/Game/gameRuntime.js) finds what to hand to createGame():
//
//   const game = createGameFromCatalog('dice', { config });
//   game.start(bets);                      // instant games: terminal at once
//   game.action(sessionId, playerAction);  // multi-step games
//
// - `kind` tells the app whether the UI needs `action` too ('multi-step'). A
//   multi-step game must keep ONE createGame instance for start() and
//   action(): the session lives in that instance (contrat G2 § 5.4).
// - `draw` is omitted when the default core.roll() is the expected raw draw.
// - No configuration here: payouts and weights are admin data (règle 4). The
//   app passes the game's `config` (contrat G2 § 6); the rules throw when it
//   is missing.
// ---------------------------------------------------------------------------

import { createGame } from './_template/createGame.js';

import * as slotsRules from './slots/rules.js';
import { drawSlots } from './slots/draw.js';
import * as scratchRules from './scratch/rules.js';
import { diceRules } from './dice/rules.js';
import { draw as drawDice } from './dice/draw.js';
import * as rouletteRules from './roulette/rules.js';
import { draw as drawRoulette } from './roulette/index.js';
import * as wheelRules from './wheel/rules.js';
import { drawWheel } from './wheel/draw.js';
import * as plinkoRules from './plinko/rules.js';
import { drawPlinko } from './plinko/draw.js';
import * as blackjackRules from './blackjack/rules.js';
import { draw as drawBlackjack } from './blackjack/index.js';
import { videoPokerRules } from './video-poker/rules.js';
import { drawVideoPoker } from './video-poker/draw.js';
import { rules as pokerRules } from './poker/rules.js';
import { draw as drawPoker } from './poker/draw.js';
import { memoryRules } from './memory/rules.js';
import { drawMemory } from './memory/draw.js';
import * as quizRules from './quiz/rules.js';
import { draw as drawQuiz } from './quiz/draw.js';
import * as bingoRules from './bingo/rules.js';
import { draw as drawBingo } from './bingo/draw.js';

/** A game settled in a single start() call. */
export const INSTANT = 'instant';
/** A game played with start() then action() until terminal. */
export const MULTI_STEP = 'multi-step';

/**
 * @typedef {object} CatalogEntry
 * @property {'instant' | 'multi-step'} kind
 * @property {object} rules - resolve() or start()/step() (+ view()), see createGame.
 * @property {Function} [draw] - the game's own draw; absent = core.roll().
 */

/** @type {Readonly<Record<string, Readonly<CatalogEntry>>>} */
export const GAME_CATALOG = Object.freeze({
  slots: Object.freeze({ kind: INSTANT, rules: slotsRules, draw: drawSlots }),
  dice: Object.freeze({ kind: INSTANT, rules: diceRules, draw: drawDice }),
  scratch: Object.freeze({ kind: INSTANT, rules: scratchRules }),
  wheel: Object.freeze({ kind: INSTANT, rules: wheelRules, draw: drawWheel }),
  roulette: Object.freeze({ kind: INSTANT, rules: rouletteRules, draw: drawRoulette }),
  plinko: Object.freeze({ kind: INSTANT, rules: plinkoRules, draw: drawPlinko }),
  blackjack: Object.freeze({ kind: MULTI_STEP, rules: blackjackRules, draw: drawBlackjack }),
  'video-poker': Object.freeze({ kind: MULTI_STEP, rules: videoPokerRules, draw: drawVideoPoker }),
  poker: Object.freeze({ kind: MULTI_STEP, rules: pokerRules, draw: drawPoker }),
  memory: Object.freeze({ kind: MULTI_STEP, rules: memoryRules, draw: drawMemory }),
  quiz: Object.freeze({ kind: MULTI_STEP, rules: quizRules, draw: drawQuiz }),
  bingo: Object.freeze({ kind: MULTI_STEP, rules: bingoRules, draw: drawBingo }),
});

/**
 * Ids of the games whose rules are available in the catalogue.
 *
 * @type {readonly string[]}
 */
export const CATALOG_GAME_IDS = Object.freeze(Object.keys(GAME_CATALOG));

/**
 * Returns the catalogue entry of a game, or undefined when its rules are not
 * on `main` yet (the app then keeps the G3 demo mode).
 *
 * @param {string} gameId
 * @returns {Readonly<CatalogEntry> | undefined}
 */
export function getGameDefinition(gameId) {
  return Object.hasOwn(GAME_CATALOG, gameId) ? GAME_CATALOG[gameId] : undefined;
}

/**
 * Builds a playable game from the catalogue: createGame() with the game's
 * rules and draw. Keep the returned object for the whole round (and for the
 * next rounds): start() and action() must be called on the SAME instance.
 *
 * @param {string} gameId
 * @param {{ config?: object, core?: object }} [options] - `config` is the
 *   game's admin configuration (contrat G2 § 6); `core` is injectable for tests.
 * @returns {{ id: string, start: Function, action: Function, playRound: Function }}
 * @throws {RangeError} when the game is not in the catalogue.
 */
export function createGameFromCatalog(gameId, { config, core } = {}) {
  const definition = getGameDefinition(gameId);
  if (definition === undefined) {
    throw new RangeError(`catalog: unknown game '${String(gameId)}'`);
  }
  const { rules, draw } = definition;
  return createGame({
    id: gameId,
    rules,
    config,
    ...(draw ? { draw } : {}),
    ...(core ? { core } : {}),
  });
}
