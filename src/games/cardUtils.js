// ---------------------------------------------------------------------------
// Games - Shared card engine (T1 - Groupe 2)
// ---------------------------------------------------------------------------
// Pure, dependency-free card hand calculations shared by the four card
// games (blackjack, baccarat, video poker, poker).
//
// ABSOLUTE RULES honored by this module:
//  * Zero imports: no Core, no coreService, no React, no Math.random().
//  * Every function is pure: same input, same output, no side effect,
//    inputs are never mutated.
//
// Card format (G2 <-> Core contract, to be formalized with G1):
//   { rank: '2' | '3' | ... | '10' | 'J' | 'Q' | 'K' | 'A',
//     suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' }
// ---------------------------------------------------------------------------

/**
 * A single playing card.
 *
 * Contract note: this format MUST match the deck produced by the Core
 * `shuffleDeck()` (to be formalized in the G2 <-> Core contract document).
 *
 * @typedef {object} Card
 * @property {string} rank - '2'..'10' | 'J' | 'Q' | 'K' | 'A'.
 * @property {string} suit - 'hearts' | 'diamonds' | 'clubs' | 'spades'.
 */

/**
 * Evaluation of a five-card poker hand.
 *
 * @typedef {object} PokerEvaluation
 * @property {number} category - 1 (high card) to 10 (royal flush).
 * @property {number[]} tiebreakers - numeric ranks (2-14) in descending order.
 */

const RANKS = Object.freeze([
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
]);

const SUITS = Object.freeze(['hearts', 'diamonds', 'clubs', 'spades']);

const RANK_TO_NUMBER = Object.freeze({
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
});

const TEN_VALUE_RANKS = new Set(['10', 'J', 'Q', 'K']);

const WHEEL_RANKS = new Set([14, 5, 4, 3, 2]);

/**
 * Validates that a value is a well-formed Card.
 *
 * @param {unknown} card - value to validate.
 * @param {number} index - position of the card in the hand (error message).
 * @throws {TypeError} when the card is not an object with a valid rank/suit.
 */
function assertValidCard(card, index) {
  if (typeof card !== 'object' || card === null || Array.isArray(card)) {
    throw new TypeError(`cardUtils: card at index ${index} must be a { rank, suit } object`);
  }
  if (!RANKS.includes(card.rank)) {
    throw new TypeError(
      `cardUtils: card at index ${index} has an invalid rank: ${String(card.rank)}`,
    );
  }
  if (!SUITS.includes(card.suit)) {
    throw new TypeError(
      `cardUtils: card at index ${index} has an invalid suit: ${String(card.suit)}`,
    );
  }
}

/**
 * Validates that a value is an array of well-formed Cards.
 *
 * @param {unknown} hand - value to validate.
 * @throws {TypeError} when the hand is not an array or contains an invalid card.
 */
function assertValidHand(hand) {
  if (!Array.isArray(hand)) {
    throw new TypeError('cardUtils: hand must be an array of cards');
  }
  for (let i = 0; i < hand.length; i += 1) {
    assertValidCard(hand[i], i);
  }
}

/**
 * Computes the total of a blackjack hand.
 *
 * Values: 2-9 at face value, 10/J/Q/K as 10, ace as 11 or 1. An ace is
 * counted as 11 whenever that keeps the total at or below 21, otherwise as
 * 1. When no ace arrangement reaches 21, the lowest possible total (above
 * 21) is returned.
 *
 * @param {Card[]} hand - the player hand, at least one card.
 * @returns {number} best hand total (<= 21 when possible, else the lowest bust).
 * @throws {TypeError} when the hand is not a non-empty array of valid cards.
 * @example
 * blackjackTotal([{ rank: 'A', suit: 'hearts' }, { rank: 'K', suit: 'spades' }]);
 * // => 21
 */
export function blackjackTotal(hand) {
  assertValidHand(hand);
  if (hand.length === 0) {
    throw new TypeError('cardUtils: hand must contain at least one card');
  }

  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === 'A') {
      aces += 1;
      total += 1;
    } else if (TEN_VALUE_RANKS.has(card.rank)) {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }
  while (aces > 0 && total + 10 <= 21) {
    total += 10;
    aces -= 1;
  }
  return total;
}

/**
 * Detects a natural blackjack.
 *
 * A natural blackjack is a hand of exactly two cards totalling 21, i.e. an
 * ace with a 10/J/Q/K. Hands that do not have exactly two cards simply
 * return false (they are not a natural, not an error).
 *
 * @param {Card[]} hand - the hand to check.
 * @returns {boolean} true for a two-card hand totalling 21, false otherwise.
 * @throws {TypeError} when the hand is not an array of valid cards.
 * @example
 * isBlackjack([{ rank: 'A', suit: 'hearts' }, { rank: 'K', suit: 'spades' }]);
 * // => true
 */
export function isBlackjack(hand) {
  assertValidHand(hand);
  if (hand.length !== 2) {
    return false;
  }
  return blackjackTotal(hand) === 21;
}

/**
 * Computes the total of a baccarat hand.
 *
 * Values: 2-9 at face value, A/10/J/Q/K as 0. Only the units digit of the
 * raw sum counts (5+4 = 9, 6+7 = 3, 9+9 = 8): 9 is the highest total, 0 the
 * lowest.
 *
 * @param {Card[]} hand - the hand to total, at least one card.
 * @returns {number} hand total, 0 to 9.
 * @throws {TypeError} when the hand is not a non-empty array of valid cards.
 * @example
 * baccaratTotal([{ rank: '6', suit: 'hearts' }, { rank: '7', suit: 'spades' }]);
 * // => 3
 */
export function baccaratTotal(hand) {
  assertValidHand(hand);
  if (hand.length === 0) {
    throw new TypeError('cardUtils: hand must contain at least one card');
  }

  let total = 0;
  for (const card of hand) {
    if (card.rank !== 'A' && !TEN_VALUE_RANKS.has(card.rank)) {
      total += Number(card.rank);
    }
  }
  return total % 10;
}

/**
 * Evaluates a five-card poker hand (video poker, v1).
 *
 * Category scale (1 = weakest, 10 = strongest):
 *   1  high card
 *   2  one pair
 *   3  two pair
 *   4  three of a kind
 *   5  straight (A-2-3-4-5 "wheel" scores a 5)
 *   6  flush
 *   7  full house
 *   8  four of a kind
 *   9  straight flush (wheel scores a 5)
 *   10 royal flush
 *
 * Tiebreakers are numeric ranks (2-14) in descending order, e.g. a full
 * house K-K-K-Q-Q returns [13, 12], two pair K-K-7-7-A returns [13, 7, 14],
 * a straight 9-10-J-Q-K returns [13], and the wheel returns [5].
 *
 * @param {Card[]} hand - exactly five distinct cards.
 * @returns {PokerEvaluation} object with `category` and `tiebreakers` keys.
 * @throws {TypeError} when the hand does not have exactly five distinct valid cards.
 * @example
 * evaluatePokerHand([
 *   { rank: '10', suit: 'hearts' },
 *   { rank: 'J', suit: 'hearts' },
 *   { rank: 'Q', suit: 'hearts' },
 *   { rank: 'K', suit: 'hearts' },
 *   { rank: 'A', suit: 'hearts' },
 * ]);
 * // => { category: 10, tiebreakers: [14] }
 */
export function evaluatePokerHand(hand) {
  assertValidHand(hand);
  if (hand.length !== 5) {
    throw new TypeError('cardUtils: a poker hand must have exactly five cards');
  }

  const seen = new Set();
  for (const card of hand) {
    const key = `${card.rank}:${card.suit}`;
    if (seen.has(key)) {
      throw new TypeError(`cardUtils: duplicated card ${key}`);
    }
    seen.add(key);
  }

  const ranks = hand.map((card) => RANK_TO_NUMBER[card.rank]);
  const sortedRanks = [...ranks].sort((a, b) => b - a);
  const isFlush = hand.every((card) => card.suit === hand[0].suit);

  const counts = new Map();
  for (const rank of ranks) {
    counts.set(rank, (counts.get(rank) ?? 0) + 1);
  }
  const groups = [...counts.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  let straightHigh = null;
  if (counts.size === 5) {
    if (sortedRanks[0] - sortedRanks[4] === 4) {
      straightHigh = sortedRanks[0];
    } else if ([...counts.keys()].every((rank) => WHEEL_RANKS.has(rank))) {
      straightHigh = 5; // wheel: A-2-3-4-5
    }
  }

  if (isFlush && straightHigh !== null) {
    return {
      category: straightHigh === 14 ? 10 : 9,
      tiebreakers: [straightHigh],
    };
  }
  if (groups[0].count === 4) {
    return { category: 8, tiebreakers: [groups[0].rank, groups[1].rank] };
  }
  if (groups[0].count === 3 && groups[1].count === 2) {
    return { category: 7, tiebreakers: [groups[0].rank, groups[1].rank] };
  }
  if (isFlush) {
    return { category: 6, tiebreakers: sortedRanks };
  }
  if (straightHigh !== null) {
    return { category: 5, tiebreakers: [straightHigh] };
  }
  if (groups[0].count === 3) {
    return { category: 4, tiebreakers: [groups[0].rank, groups[1].rank, groups[2].rank] };
  }
  if (groups[0].count === 2 && groups[1].count === 2) {
    return { category: 3, tiebreakers: [groups[0].rank, groups[1].rank, groups[2].rank] };
  }
  if (groups[0].count === 2) {
    return {
      category: 2,
      tiebreakers: [groups[0].rank, groups[1].rank, groups[2].rank, groups[3].rank],
    };
  }
  return { category: 1, tiebreakers: sortedRanks };
}

/**
 * Detects an opening pair eligible for a split (blackjack context).
 *
 * The hand must contain EXACTLY two cards; anything else is a programming
 * error and throws, to fail fast on misuse. This checks the opening pair
 * only - it is unrelated to the double-down option.
 *
 * @param {Card[]} hand - exactly two cards.
 * @returns {boolean} true when both cards share the same rank (suits ignored).
 * @throws {TypeError} when the hand does not have exactly two valid cards.
 * @example
 * hasPair([{ rank: 'K', suit: 'hearts' }, { rank: 'K', suit: 'spades' }]);
 * // => true
 */
export function hasPair(hand) {
  if (!Array.isArray(hand) || hand.length !== 2) {
    throw new TypeError('cardUtils: hasPair expects a hand of exactly two cards');
  }
  assertValidHand(hand);
  return hand[0].rank === hand[1].rank;
}
