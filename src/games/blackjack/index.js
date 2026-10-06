// ---------------------------------------------------------------------------
// Games - Blackjack draw (Vague 2 - Groupe 2, #189)
// ---------------------------------------------------------------------------
// Raw draw of the blackjack, injected into createGame (option 1, #141):
//   createGame({ id: 'blackjack', rules, config, draw })
//
// This is the ONLY blackjack file that reaches the Core, and only through the
// `core` handed by the orchestrator (coreService by default). rules.js stays
// pure.
//
//  * start of a round: a new 1-deck shoe shuffled by the Core,
//    core.melanger(buildDeck(1)) (cards contract section 2; G2 contract
//    section 4.2; one new deck per round, #189);
//  * during the actions: null. No new randomness is needed, the cards come
//    from the shoe kept in the session (deck.js).
// ---------------------------------------------------------------------------

import { buildDeck } from '../deck.js';

// Rules v1 (#189): a new single deck is shuffled for every round. A round
// uses far fewer than 52 cards, so the shoe is never exhausted.
const DECKS_PER_ROUND = 1;

/**
 * Raw draw of the blackjack for createGame.
 *
 * @param {{ melanger: (list: object[]) => object[] }} core - Core facade
 *   handed by the orchestrator (coreService by default).
 * @param {{ session?: object }} context - draw context: no `session` at the
 *   start of a round, the running session during the actions.
 * @returns {object[] | null} the shuffled deck at the start of a round, null
 *   during the actions.
 * @example
 * createGame({ id: 'blackjack', rules, config, draw });
 */
export function draw(core, context = {}) {
  if (context.session !== undefined) {
    return null;
  }
  return core.melanger(buildDeck(DECKS_PER_ROUND));
}
