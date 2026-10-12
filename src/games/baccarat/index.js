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
//  * start of a round: a new 1-deck shoe shuffled by the Core,
//    core.melanger(buildDeck(1)) (cards contract section 2; one new deck per
//    round, as in the blackjack);
//  * the raw handed to the rules is the TOP of that deck, in dealing order. A
//    baccarat hand holds at most three cards per side, so six cards cover the
//    whole round: the rules never need the rest of the shoe, and G3 receives
//    only the cards actually dealt (renderPayload.raw), never the whole deck;
//  * during the actions: null. Baccarat is an instant game, action() is never
//    called.
// ---------------------------------------------------------------------------

import { buildDeck } from '../deck.js';

// One new deck per round, and a round uses at most six cards (three per side).
const DECKS_PER_ROUND = 1;
const CARDS_PER_ROUND = 6;

/**
 * Raw draw of the baccarat for createGame.
 *
 * @param {{ melanger: (list: object[]) => object[] }} core - Core facade
 *   handed by the orchestrator (coreService by default).
 * @param {{ session?: object }} [context] - draw context; only kept to match
 *   the orchestrator signature (baccarat is instant: there is never a running
 *   session, so this is always the start of a round).
 * @returns {object[] | null} the cards of the round, in dealing order, or null
 *   when a running session is passed (never happens for an instant game).
 * @example
 * createGame({ id: 'baccarat', rules, config, draw });
 */
export function draw(core, context = {}) {
  if (context.session !== undefined) {
    return null;
  }
  return core.melanger(buildDeck(DECKS_PER_ROUND)).slice(0, CARDS_PER_ROUND);
}
