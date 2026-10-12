// ---------------------------------------------------------------------------
// Games - Baccarat rules (Groupe 2 - ticket #220)
// ---------------------------------------------------------------------------
// Pure rules of a Punto Banco round, plugged into createGame as an INSTANT
// game (G2 contract section 3.1, skill jeux-g2 sections 1 and 5):
//   resolve(raw, { bets, config }) -> gameResult
//
// raw is the TOP of the single deck shuffled by the Core, through the game's
// own draw(core, context) (src/games/baccarat/index.js): the cards are dealt
// in raw order (player, banker, player, banker, then the third cards). A round
// never needs more than six cards (three per side), so the draw only hands
// over what the round may use. Once the deck is shuffled, dealing needs no
// more randomness (deck.js cursor).
//
// RULES APPLIED - standard Punto Banco tableau:
//  * two cards to the player and two to the banker;
//  * a hand of 8 or 9 is a "natural": neither hand draws;
//  * otherwise the player draws on 0-5 and stands on 6-7;
//  * the banker's third card follows the standard tableau, read from the VALUE
//    of the player's third card (see shouldBankerDraw). When the player stood,
//    the banker draws on 0-5 and stands on 6-7;
//  * the higher total wins, equal totals are a tie.
//
// BETS (player / banker / tie) and settlement:
//  * a winning player / banker bet returns config.paytable.player /
//    config.paytable.banker (stake included: the banker commission is an admin
//    value, e.g. 1.95);
//  * a winning tie bet returns config.paytable.tie;
//  * on a tie, player and banker bets are PUSHED (stake given back), the
//    standard baccarat rule;
//  * a losing bet returns 0.
// The outcome and the aggregate multiplier follow the Core convention over the
// total stake, exactly like the roulette: one settlement per round (the Core
// derives the outcome from the multiplier, src/core/economy.js).
//
// VIEW (card game, contract G2 section 5.2, confirmed on #220):
//  * the game exposes rules.view(...): G3 only receives what was actually
//    played (hands, totals, winner, settled bets), never the raw draw nor the
//    shoe;
//  * the shoe size (6 to 8 decks in a real casino) is an admin value read from
//    config.deckCount by the game draw (src/games/baccarat/index.js); the
//    rules never build nor count decks.
//
// ABSOLUTE RULES honored by this module:
//  * only imports: cardUtils.js and deck.js. No Core, no coreService, no
//    React, and no randomness at all.
//  * every function is pure: raw, bets and config are never mutated.
//  * no tuning value is hardcoded: the paytable is injected through `config`
//    (AGENTS.md rule 4) and resolve() throws when it is missing.
//
// OPEN POINTS of ticket #220 - implemented on the project owner's explicit
// instruction, still to be confirmed by the G2 referent (#68) and the config
// shape (#122):
//  1. baccarat is played as an INSTANT game: once the cards are dealt a hand
//     has no player decision (skill jeux-g2 section 1);
//  2. the bets accepted are player / banker / tie only (no pairs side bets);
//  3. the third-card tableau is the standard Punto Banco one;
//  4. the paytable shape is { player, banker, tie } (multipliers, stake
//     included), pending the config shape of #122.
// ---------------------------------------------------------------------------

import { baccaratTotal } from '../cardUtils.js';
import { createShoe, draw } from '../deck.js';

const PLAYER = 'player';
const BANKER = 'banker';
const TIE = 'tie';

/** The three bet types of the game, in display order. */
const BET_TYPES = Object.freeze([PLAYER, BANKER, TIE]);

/** A hand totalling 8 or 9 is a natural: no third card is drawn. */
const NATURAL_TOTAL = 8;

/** Highest total the banker draws on when the player did not draw. */
const BANKER_DRAWS_UP_TO = 5;

/**
 * A single playing card, as defined in cardUtils.js.
 *
 * @typedef {object} Card
 * @property {string} rank - '2'..'10' | 'J' | 'Q' | 'K' | 'A'.
 * @property {string} suit - 'hearts' | 'diamonds' | 'clubs' | 'spades'.
 */

/**
 * Runtime configuration of the baccarat, injected by the orchestrator.
 *
 * @typedef {object} BaccaratConfig
 * @property {{ player: number, banker: number, tie: number }} paytable
 *   - multiplier returned by a WINNING bet of each type, stake included.
 */

/**
 * Reads and validates the paytable of the baccarat config.
 *
 * @param {unknown} config - game config handed by the orchestrator.
 * @returns {{ player: number, banker: number, tie: number }} a frozen copy of
 *   the paytable.
 * @throws {TypeError} when the config or one of the three multipliers is
 *   missing (payouts are admin data, never hardcoded).
 */
function readPaytable(config) {
  const paytable = config?.paytable;
  for (const type of BET_TYPES) {
    const value = paytable?.[type];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new TypeError(
        `baccarat: config.paytable.${type} is required (a number >= 0). Payouts are admin data and are never hardcoded.`
      );
    }
  }
  return Object.freeze({ player: paytable.player, banker: paytable.banker, tie: paytable.tie });
}

/**
 * Sums the amounts of the normalized bets, checking every entry.
 *
 * The orchestrator always sends an array, even for a single bet. A
 * non-positive amount is refused: the Core itself rejects a stake <= 0
 * (src/core/economy.js).
 *
 * @param {unknown} bets - expected `[{ type, amount }]`.
 * @returns {number} the total stake, a positive number.
 * @throws {TypeError} when the array is empty, an entry is malformed, its type
 *   is unknown, or its amount is not a positive number.
 */
function sumBets(bets) {
  if (!Array.isArray(bets) || bets.length === 0) {
    throw new TypeError('baccarat: bets must be a non-empty array of { type, amount }');
  }
  let total = 0;
  for (const bet of bets) {
    if (bet === null || typeof bet !== 'object') {
      throw new TypeError('baccarat: each bet must be an object { type, amount }');
    }
    if (!BET_TYPES.includes(bet.type)) {
      throw new TypeError(
        `baccarat: unknown bet type '${String(bet.type)}', expected 'player', 'banker' or 'tie'`
      );
    }
    if (typeof bet.amount !== 'number' || !Number.isFinite(bet.amount) || bet.amount <= 0) {
      throw new TypeError('baccarat: every bet amount must be a positive number');
    }
    total += bet.amount;
  }
  return total;
}

/**
 * Tells whether the player draws a third card: on 0 to 5, never on 6 or 7.
 *
 * @param {number} playerTotal - player total, 0 to 9.
 * @returns {boolean} true when the player draws.
 */
function shouldPlayerDraw(playerTotal) {
  return playerTotal <= 5;
}

/**
 * Tells whether the banker draws a third card once the player has drawn.
 *
 * Standard Punto Banco tableau, driven by the banker total and the VALUE of
 * the player's third card. A banker of 7 never draws.
 *
 * @param {number} bankerTotal - banker total before drawing, 0 to 7.
 * @param {number} playerThird - value of the player's third card, 0 to 9.
 * @returns {boolean} true when the banker draws.
 */
function shouldBankerDraw(bankerTotal, playerThird) {
  if (bankerTotal <= 2) return true;
  if (bankerTotal === 3) return playerThird !== 8;
  if (bankerTotal === 4) return playerThird >= 2 && playerThird <= 7;
  if (bankerTotal === 5) return playerThird >= 4 && playerThird <= 7;
  if (bankerTotal === 6) return playerThird === 6 || playerThird === 7;
  return false;
}

/**
 * Multiplier returned by one bet, given the winner of the hand.
 *
 * @param {string} betType - 'player' | 'banker' | 'tie'.
 * @param {'player' | 'banker' | 'tie'} winner - the winning side.
 * @param {{ player: number, banker: number, tie: number }} paytable
 * @returns {number} stake-included multiplier: the paytable value for a
 *   winning bet, 1 for a pushed player/banker bet on a tie, 0 otherwise.
 */
function multiplierFor(betType, winner, paytable) {
  if (winner === TIE) {
    // Standard baccarat: on a tie the player and banker bets are returned.
    return betType === TIE ? paytable.tie : 1;
  }
  return betType === winner ? paytable[betType] : 0;
}

/**
 * Deduces the outcome from the aggregate multiplier, exactly like the Core
 * when settling (src/core/economy.js): > 1 => win, < 1 => loss, = 1 => push.
 *
 * @param {number} multiplier - validated payout multiplier.
 * @returns {'win' | 'loss' | 'push'} the matching outcome.
 */
function outcomeFromMultiplier(multiplier) {
  if (multiplier > 1) return 'win';
  if (multiplier < 1) return 'loss';
  return 'push';
}

/**
 * Plays one baccarat round from the cards dealt in raw order.
 *
 * @param {Card[]} raw - top of the deck shuffled by the Core, in dealing order
 *   (player, banker, player, banker, then the third cards), produced by
 *   `src/games/baccarat/index.js`.
 * @param {{ bets: Array<{ type: string, amount: number }>, config?: BaccaratConfig }} context
 * @returns {{ outcome: 'win' | 'loss' | 'push', multiplier: number, details: object }}
 *   the settled round: `outcome` is deduced from the aggregate `multiplier`,
 *   `details` carries both hands, the third cards and the settled bets.
 * @throws {TypeError} on an invalid raw, bets, or missing/malformed config.
 * @throws {RangeError} when raw does not hold enough cards for the hand.
 * @example
 * resolve(deck.slice(0, 6), {
 *   bets: [{ type: 'player', amount: 10 }],
 *   config: { paytable: { player: 2, banker: 1.95, tie: 9 } },
 * });
 * // => { outcome: 'win', multiplier: 2, details: { ... } }
 */
export function resolve(raw, { bets, config } = {}) {
  const paytable = readPaytable(config);
  const totalBet = sumBets(bets);
  if (!Array.isArray(raw)) {
    throw new TypeError('baccarat: raw must be the cards dealt by the baccarat draw');
  }

  const dealt = draw(createShoe(raw), 4);
  let shoe = dealt.shoe;
  let playerHand = [dealt.cards[0], dealt.cards[2]];
  let bankerHand = [dealt.cards[1], dealt.cards[3]];
  let playerTotal = baccaratTotal(playerHand);
  let bankerTotal = baccaratTotal(bankerHand);
  const natural = playerTotal >= NATURAL_TOTAL || bankerTotal >= NATURAL_TOTAL;

  let playerThirdCard = null;
  let bankerThirdCard = null;

  if (!natural) {
    if (shouldPlayerDraw(playerTotal)) {
      const playerDraw = draw(shoe, 1);
      playerThirdCard = playerDraw.cards[0];
      shoe = playerDraw.shoe;
      playerHand = [...playerHand, playerThirdCard];
      playerTotal = baccaratTotal(playerHand);
    }

    const bankerDraws =
      playerThirdCard === null
        ? bankerTotal <= BANKER_DRAWS_UP_TO
        : shouldBankerDraw(bankerTotal, baccaratTotal([playerThirdCard]));
    if (bankerDraws) {
      const bankerDraw = draw(shoe, 1);
      bankerThirdCard = bankerDraw.cards[0];
      shoe = bankerDraw.shoe;
      bankerHand = [...bankerHand, bankerThirdCard];
      bankerTotal = baccaratTotal(bankerHand);
    }
  }

  const winner = playerTotal === bankerTotal ? TIE : playerTotal > bankerTotal ? PLAYER : BANKER;
  const settledBets = bets.map((bet) => {
    const multiplier = multiplierFor(bet.type, winner, paytable);
    return {
      type: bet.type,
      amount: bet.amount,
      won: multiplier > 1,
      multiplier,
      payout: bet.amount * multiplier,
    };
  });

  const payout = settledBets.reduce((sum, bet) => sum + bet.payout, 0);
  // Same convention as the Core: one aggregate multiplier over the total stake.
  const multiplier = payout / totalBet;

  return {
    outcome: outcomeFromMultiplier(multiplier),
    multiplier,
    details: {
      playerHand,
      bankerHand,
      playerTotal,
      bankerTotal,
      natural,
      winner,
      thirdCards: { player: playerThirdCard, banker: bankerThirdCard },
      bets: settledBets,
      totalBet,
      payout,
    },
  };
}

/**
 * What G3 may display once the round is settled.
 *
 * Baccarat is a card game (contract G2 section 5.2, confirmed on #220): the
 * game exposes a view so `renderPayload` carries ONLY what was actually played
 * (hands, totals, winner, settled bets), never the raw draw nor the shoe.
 *
 * @param {{ phase?: string, gameResult?: object }} [context] - the render
 *   context handed by the orchestrator on the terminal phase; `raw` and
 *   `session` are intentionally ignored (the view derives from the settled
 *   gameResult only).
 * @returns {{ phase: string, playerHand: object[], bankerHand: object[],
 *   playerTotal: number, bankerTotal: number, natural: boolean, winner: string,
 *   outcome: string, bets: object[], totalBet: number, payout: number }}
 * @throws {TypeError} when there is no settled gameResult to describe (never
 *   happens in practice: the view is only requested on the terminal phase).
 * @example
 * rules.view({ phase, raw, session, gameResult });
 */
export function view({ phase = 'result', gameResult } = {}) {
  if (!gameResult || typeof gameResult !== 'object' || !gameResult.details) {
    throw new TypeError('baccarat: view() needs the settled gameResult of the round');
  }
  const { details } = gameResult;
  return {
    phase,
    playerHand: details.playerHand.map((c) => ({ ...c })),
    bankerHand: details.bankerHand.map((c) => ({ ...c })),
    playerTotal: details.playerTotal,
    bankerTotal: details.bankerTotal,
    natural: details.natural,
    winner: details.winner,
    outcome: gameResult.outcome,
    bets: details.bets.map((bet) => ({ ...bet })),
    totalBet: details.totalBet,
    payout: details.payout,
  };
}
