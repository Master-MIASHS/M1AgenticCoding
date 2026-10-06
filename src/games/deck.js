// ---------------------------------------------------------------------------
// Games - Deck builder and draw cursor (T1 ter - Groupe 2, #102)
// ---------------------------------------------------------------------------
// Builds the 52 x deckCount cards of a shoe from the RANKS / SUITS of
// cardUtils.js and draws them with a cursor, for the card games (blackjack,
// baccarat, video poker, poker).
//
// Deck (Option A, #70; docs/contracts/cards-contract.md section 2; G2
// contract section 4.2):
//  * G2 builds the deck here; the Core shuffles it with melanger().
//  * This module NEVER shuffles: the game's own draw(core, context), passed
//    to createGame (#141), calls core.melanger(buildDeck(deckCount)) at the
//    start of each round.
//  * Drawing needs no new randomness: the cursor just moves forward. The shoe
//    lives in the game session, never in a global state.
//  * An exhausted shoe is an error; the caller shuffles a new deck for the
//    next round.
//
// ABSOLUTE RULES honored by this module:
//  * Only import: RANKS / SUITS from cardUtils.js. No Core, no coreService,
//    no React, and no randomness at all (only the Core shuffles).
//  * Every function is pure: same input, same output, no side effect, inputs
//    are never mutated. Cards and shoes are frozen (cards contract section 3:
//    G2 never mutates a card).
// ---------------------------------------------------------------------------

import { RANKS, SUITS } from './cardUtils.js';

/**
 * A single playing card, as defined in cardUtils.js.
 *
 * @typedef {object} Card
 * @property {string} rank - '2'..'10' | 'J' | 'Q' | 'K' | 'A'.
 * @property {string} suit - 'hearts' | 'diamonds' | 'clubs' | 'spades'.
 */

/**
 * A shoe: shuffled cards and the position of the next card to draw.
 *
 * @typedef {object} Shoe
 * @property {readonly Card[]} cards - the cards, in drawing order.
 * @property {number} cursor - index of the next card to draw.
 */

/**
 * Checks that a value is a whole number greater than or equal to `min`.
 *
 * @param {unknown} value - value to check.
 * @param {number} min - smallest accepted value.
 * @returns {boolean} true when the value is an integer >= min.
 */
function isIntegerAtLeast(value, min) {
  return Number.isInteger(value) && value >= min;
}

/**
 * Validates that a value is a shoe built by createShoe().
 *
 * @param {unknown} shoe - value to validate.
 * @throws {TypeError} when the value is not a { cards, cursor } shoe.
 */
function assertValidShoe(shoe) {
  if (
    typeof shoe !== 'object' ||
    shoe === null ||
    !Array.isArray(shoe.cards) ||
    !isIntegerAtLeast(shoe.cursor, 0) ||
    shoe.cursor > shoe.cards.length
  ) {
    throw new TypeError('deck: shoe must be a { cards, cursor } object built by createShoe()');
  }
}

/**
 * Builds an unshuffled deck of 52 x deckCount cards.
 *
 * Order: suits in SUITS order, and within a suit, ranks in RANKS order
 * (2 of hearts first, ace of spades last), repeated deckCount times. The
 * caller shuffles it with the Core melanger().
 *
 * @param {number} deckCount - number of 52-card decks in the shoe (integer >= 1).
 * @returns {Card[]} a new array of frozen cards.
 * @throws {TypeError} when deckCount is not an integer >= 1.
 * @example
 * buildDeck(1).length; // => 52
 * buildDeck(2).length; // => 104
 */
export function buildDeck(deckCount) {
  if (!isIntegerAtLeast(deckCount, 1)) {
    throw new TypeError('deck: deckCount must be an integer >= 1');
  }

  const cards = [];
  for (let i = 0; i < deckCount; i += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push(Object.freeze({ rank, suit }));
      }
    }
  }
  return cards;
}

/**
 * Creates a shoe from cards already shuffled by the Core.
 *
 * The received array is copied: changing it afterwards does not change the
 * shoe. The shoe is meant to be stored in the game session.
 *
 * @param {Card[]} shuffledCards - cards in drawing order (e.g. melanger(buildDeck(1))).
 * @returns {Shoe} a frozen shoe with the cursor at 0.
 * @throws {TypeError} when shuffledCards is not an array.
 * @example
 * const shoe = createShoe(shuffledCards); // => { cards: [...], cursor: 0 }
 */
export function createShoe(shuffledCards) {
  if (!Array.isArray(shuffledCards)) {
    throw new TypeError('deck: createShoe expects an array of cards');
  }
  return Object.freeze({ cards: Object.freeze([...shuffledCards]), cursor: 0 });
}

/**
 * Draws the next n cards of a shoe.
 *
 * No randomness: the cards come in shoe order and the cursor moves forward.
 * The received shoe is never modified; a new shoe is returned.
 *
 * @param {Shoe} shoe - shoe built by createShoe().
 * @param {number} n - number of cards to draw (integer >= 0; 0 is allowed).
 * @returns {{ cards: Card[], shoe: Shoe }} the drawn cards (new array) and the new shoe.
 * @throws {TypeError} when the shoe or n is invalid.
 * @throws {RangeError} when fewer than n cards remain in the shoe.
 * @example
 * const { cards, shoe: next } = draw(shoe, 5); // 5 cards, next.cursor === 5
 */
export function draw(shoe, n) {
  assertValidShoe(shoe);
  if (!isIntegerAtLeast(n, 0)) {
    throw new TypeError('deck: n must be an integer >= 0');
  }
  const left = shoe.cards.length - shoe.cursor;
  if (n > left) {
    throw new RangeError(`deck: cannot draw ${n} card(s), only ${left} left in the shoe`);
  }

  const end = shoe.cursor + n;
  return {
    cards: shoe.cards.slice(shoe.cursor, end),
    shoe: Object.freeze({ cards: shoe.cards, cursor: end }),
  };
}

/**
 * Counts the cards left in a shoe.
 *
 * @param {Shoe} shoe - shoe built by createShoe().
 * @returns {number} number of cards that can still be drawn.
 * @throws {TypeError} when the shoe is invalid.
 * @example
 * remaining(createShoe(buildDeck(1))); // => 52
 */
export function remaining(shoe) {
  assertValidShoe(shoe);
  return shoe.cards.length - shoe.cursor;
}
