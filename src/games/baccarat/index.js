// ---------------------------------------------------------------------------
// Games - Baccarat draw (Groupe 2 - ticket #220)
// ---------------------------------------------------------------------------
// Raw draw of the baccarat, injected into createGame (option 1, #141):
//   createGame({ id: 'baccarat', rules, config, draw })
//
// This is the ONLY baccarat file that reaches the Core, and only through the
// `core` handed by the orchestrator (coreService by default). rules.js stays
// pure.
//
//  * start of a round: a new shoe shuffled by the Core, the shoe size
//    (real baccarat: 6 to 8 decks) is an admin value read from
//    config.deckCount, default 1 deck (AGENTS.md rule 4: no tuning value
//    hard-coded). core.melanger(buildDeck(deckCount)), cards contract
//    section 2;
//  * the raw handed to the rules is the TOP of that deck, in dealing order. A
//    baccarat hand holds at most three cards per side, so six cards cover the
//    whole round: the rules never need the rest of the shoe, and G3 receives
//    only the cards actually dealt (renderPayload.view, contract G2 section
//    5.2), never the whole deck;
//  * during the actions: null. Baccarat is an instant game, action() is never
//    called.
// ---------------------------------------------------------------------------

import { buildDeck } from '../deck.js';

// A round uses at most six cards (three per side).
const CARDS_PER_ROUND = 6;
// Fallback shoe size when no config is handed to the draw; the admin decides
// the real shoe size through config.deckCount (rule 4).
const DEFAULT_DECK_COUNT = 1;

/**
 * Number of decks of the shoe, from the game config (rule 4).
 *
 * @param {{ deckCount?: unknown }} [config] - game config (undefined when the
 *   draw is called without one).
 * @returns {number} the number of decks, at least 1.
 * @throws {TypeError} when config.deckCount is provided but not a positive
 *   integer (e.g. 0, 1.5 or "6").
 */
function readDeckCount(config) {
  const value = config?.deckCount ?? DEFAULT_DECK_COUNT;
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError(
      'baccarat: config.deckCount must be a positive integer (number of decks of the shoe)'
    );
  }
  return value;
}

/**
 * Raw draw of the baccarat for createGame.
 *
 * @param {{ melanger: (list: object[]) => object[] }} core - Core facade
 *   handed by the orchestrator (coreService by default).
 * @param {{ session?: object, config?: object }} [context] - draw context;
 *   only kept to match the orchestrator signature (baccarat is instant: there
 *   is never a running session, so this is always the start of a round).
 * @returns {object[] | null} the cards of the round, in dealing order, or null
 *   when a running session is passed (never happens for an instant game).
 * @example
 * createGame({ id: 'baccarat', rules, config, draw });
 */
export function draw(core, context = {}) {
  if (context.session !== undefined) {
    return null;
  }
  const deckCount = readDeckCount(context.config);
  return core.melanger(buildDeck(deckCount)).slice(0, CARDS_PER_ROUND);
}
