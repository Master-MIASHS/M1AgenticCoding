// ---------------------------------------------------------------------------
// Games - Blackjack rules (Vague 2 - Groupe 2, #189)
// ---------------------------------------------------------------------------
// Pure rules of one blackjack round, plugged into createGame as a multi-step
// game (G2 contract section 3.2):
//   start(raw, { bets, config, balance }) -> session | gameResult
//   step(session, action, raw)           -> session | gameResult
//   view({ phase, raw, session, gameResult }) -> what G3 may display (#168)
//
// raw (start) is the deck already shuffled by the Core, through the game's
// draw(core, context) (src/games/blackjack/index.js). Cards are dealt in raw
// order: player, dealer (visible), player, dealer (hidden), then the next
// cards. During actions raw is null: cards come from the shoe kept in the
// session (deck.js), no new randomness.
//
// Rules v1 (#189, proposed in #8):
//  * actions: hit, stand, double (double on the first two cards only, one
//    card, then the dealer plays; offered only if a known balance covers the
//    doubled stake); no split, no insurance, no surrender;
//  * the dealer draws until 17 and stands on every 17 (soft 17 included);
//  * naturals are checked at the deal: player only -> win (blackjack
//    payout), dealer only -> loss, both -> push;
//  * a player over 21 loses at once, the dealer does not play.
//
// Result (contract section 2.2, multiplier includes the stake): push -> 1,
// loss -> 0, win -> config.paytable.win, natural -> config.paytable.blackjack.
// The stake really engaged (doubled or not) is details.totalBet (#166).
//
// ABSOLUTE RULES honored by this module:
//  * Only imports: cardUtils.js and deck.js. No Core, no coreService, no
//    React, and no randomness at all.
//  * Every function is pure: inputs are never mutated, sessions are new
//    frozen objects.
//  * No payout in code: the paytable comes from the config (rule 4).
// ---------------------------------------------------------------------------

import { blackjackTotal, isBlackjack } from '../cardUtils.js';
import { createShoe, draw } from '../deck.js';

const DEALER_STANDS_ON = 17;
const BUST_LIMIT = 21;
const ALL_ACTIONS = Object.freeze(['hit', 'stand', 'double']);

/**
 * A single playing card, as defined in cardUtils.js.
 *
 * @typedef {object} Card
 * @property {string} rank
 * @property {string} suit
 */

/**
 * A running blackjack round, kept by the orchestrator between two actions.
 *
 * @typedef {object} BlackjackSession
 * @property {true} needsDraw - the round is still running (contract section 3.2).
 * @property {import('../deck.js').Shoe} shoe - cards left to draw.
 * @property {Card[]} player - player hand.
 * @property {Card[]} dealer - dealer hand (index 1 is the hidden card).
 * @property {number} openingBet - sum of the opening bets.
 * @property {number} totalBet - stake engaged so far (doubled after double).
 * @property {{ blackjack: number, win: number }} paytable - from the config.
 * @property {string[]} availableActions - actions the player may take now.
 */

/**
 * Reads and validates the paytable of the blackjack config.
 *
 * @param {unknown} config - game config handed by the orchestrator.
 * @returns {{ blackjack: number, win: number }} a frozen copy of the paytable.
 * @throws {TypeError} when the config or one of the two multipliers is missing.
 */
function readPaytable(config) {
  const paytable = config?.paytable;
  for (const key of ['blackjack', 'win']) {
    const value = paytable?.[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new TypeError(
        `blackjack: config.paytable.${key} is required (a number >= 0). Payouts are admin data and are never hardcoded.`
      );
    }
  }
  return Object.freeze({ blackjack: paytable.blackjack, win: paytable.win });
}

/**
 * Sums the opening bets.
 *
 * @param {unknown} bets - normalized bets [{ type, amount }].
 * @returns {number} total opening stake.
 * @throws {TypeError} when bets is empty or an amount is not a positive number.
 */
function sumBets(bets) {
  if (!Array.isArray(bets) || bets.length === 0) {
    throw new TypeError('blackjack: bets must be a non-empty array of { type, amount }');
  }
  let total = 0;
  for (const bet of bets) {
    const amount = bet?.amount;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new TypeError('blackjack: every bet amount must be a positive number');
    }
    total += amount;
  }
  return total;
}

/**
 * Builds a terminal game result.
 *
 * @param {'win' | 'loss' | 'push'} outcome
 * @param {number} multiplier - payout multiplier, stake included.
 * @param {{ player: Card[], dealer: Card[], totalBet: number }} hands
 * @param {boolean} natural - true when the round ended on a natural.
 * @returns {{ outcome: string, multiplier: number, details: object }}
 */
function result(outcome, multiplier, { player, dealer, totalBet }, natural) {
  return {
    outcome,
    multiplier,
    details: {
      playerHand: [...player],
      dealerHand: [...dealer],
      playerTotal: blackjackTotal(player),
      dealerTotal: blackjackTotal(dealer),
      totalBet,
      natural,
    },
  };
}

/**
 * Lets the dealer draw until 17 or more, then settles the round.
 *
 * @param {BlackjackSession} session - session with the final player hand.
 * @param {Card[]} player - final player hand.
 * @param {import('../deck.js').Shoe} shoe - shoe after the player's turn.
 * @param {number} totalBet - final stake.
 * @returns {{ outcome: string, multiplier: number, details: object }}
 */
function dealerPlaysAndSettle(session, player, shoe, totalBet) {
  let dealer = [...session.dealer];
  let current = shoe;
  while (blackjackTotal(dealer) < DEALER_STANDS_ON) {
    const drawn = draw(current, 1);
    dealer = [...dealer, ...drawn.cards];
    current = drawn.shoe;
  }

  const hands = { player, dealer, totalBet };
  const playerTotal = blackjackTotal(player);
  const dealerTotal = blackjackTotal(dealer);
  if (dealerTotal > BUST_LIMIT || playerTotal > dealerTotal) {
    return result('win', session.paytable.win, hands, false);
  }
  if (playerTotal < dealerTotal) {
    return result('loss', 0, hands, false);
  }
  return result('push', 1, hands, false);
}

/**
 * Opens a round: deals 2 cards to the player and 2 to the dealer.
 *
 * @param {Card[]} raw - deck shuffled by the Core, in dealing order.
 * @param {{ bets: Array<{ type: string, amount: number }>, config: object, balance?: number }} context
 * @returns {BlackjackSession | { outcome: string, multiplier: number, details: object }}
 *   a running session, or the result when a natural ends the round at once.
 * @throws {TypeError} when raw, bets or config is invalid.
 * @example
 * start(shuffledDeck, { bets: [{ type: 'main', amount: 10 }], config: { paytable: { blackjack: 2.5, win: 2 } } });
 */
export function start(raw, { bets, config, balance } = {}) {
  const paytable = readPaytable(config);
  const openingBet = sumBets(bets);
  if (!Array.isArray(raw)) {
    throw new TypeError('blackjack: raw must be the shuffled deck (an array of cards)');
  }

  const dealt = draw(createShoe(raw), 4);
  const [p1, d1, p2, d2] = dealt.cards;
  const player = [p1, p2];
  const dealer = [d1, d2];

  const playerNatural = isBlackjack(player);
  const dealerNatural = isBlackjack(dealer);
  const hands = { player, dealer, totalBet: openingBet };
  if (playerNatural && dealerNatural) {
    return result('push', 1, hands, true);
  }
  if (playerNatural) {
    return result('win', paytable.blackjack, hands, true);
  }
  if (dealerNatural) {
    return result('loss', 0, hands, true);
  }

  const canDouble = typeof balance !== 'number' || balance >= openingBet * 2;
  return Object.freeze({
    needsDraw: true,
    shoe: dealt.shoe,
    player: Object.freeze(player),
    dealer: Object.freeze(dealer),
    openingBet,
    totalBet: openingBet,
    paytable,
    availableActions: Object.freeze(
      ALL_ACTIONS.filter((action) => action !== 'double' || canDouble)
    ),
  });
}

/**
 * Applies one player action to a running round.
 *
 * @param {BlackjackSession} session - session returned by start() or step().
 * @param {string} action - 'hit' | 'stand' | 'double', among session.availableActions.
 * The orchestrator also passes the raw draw as a third argument: it is null
 * during a blackjack round (no new randomness), so it is not read here.
 *
 * @returns {BlackjackSession | { outcome: string, multiplier: number, details: object }}
 *   the next session, or the result when the round is over.
 * @throws {Error} when the action is unknown or not offered right now.
 */
export function step(session, action) {
  if (!session?.availableActions?.includes(action)) {
    throw new Error(`blackjack: action '${String(action)}' is not available now`);
  }

  if (action === 'stand') {
    return dealerPlaysAndSettle(session, session.player, session.shoe, session.totalBet);
  }

  const drawn = draw(session.shoe, 1);
  const player = [...session.player, ...drawn.cards];
  const totalBet = action === 'double' ? session.totalBet * 2 : session.totalBet;

  if (blackjackTotal(player) > BUST_LIMIT) {
    return result('loss', 0, { player, dealer: session.dealer, totalBet }, false);
  }
  if (action === 'double') {
    return dealerPlaysAndSettle(session, player, drawn.shoe, totalBet);
  }

  return Object.freeze({
    ...session,
    shoe: drawn.shoe,
    player: Object.freeze(player),
    availableActions: Object.freeze(['hit', 'stand']),
  });
}

/**
 * Tells G3 what may be displayed: never the shoe nor the hidden dealer card.
 *
 * @param {{ phase: 'playing' | 'result', raw?: unknown, session?: BlackjackSession, gameResult?: object }} state
 * @returns {object} during the round: { phase, playerHand, playerTotal, dealerHand (visible card),
 *   dealerHiddenCards }; at the end: { phase, playerHand, playerTotal, dealerHand, dealerTotal,
 *   outcome, natural }.
 */
export function view({ phase, session, gameResult } = {}) {
  if (gameResult !== undefined) {
    const { details } = gameResult;
    return {
      phase: 'result',
      playerHand: [...details.playerHand],
      playerTotal: details.playerTotal,
      dealerHand: [...details.dealerHand],
      dealerTotal: details.dealerTotal,
      outcome: gameResult.outcome,
      natural: details.natural,
    };
  }
  return {
    phase: phase ?? 'playing',
    playerHand: [...session.player],
    playerTotal: blackjackTotal(session.player),
    dealerHand: [session.dealer[0]],
    dealerHiddenCards: session.dealer.length - 1,
  };
}
