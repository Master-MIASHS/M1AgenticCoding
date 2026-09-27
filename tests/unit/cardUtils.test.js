// ---------------------------------------------------------------------------
// Unit tests - shared card engine (src/games/cardUtils.js)
// ---------------------------------------------------------------------------
// T1 - Groupe 2. The card engine is a dependency-free module of pure
// functions shared by the four card games (blackjack, baccarat, video poker,
// poker). Following the TDD rule of the ticket, these tests pin down the
// behavior contract before the implementation exists.
//
// Card format (G2 <-> Core contract, to be formalized with G1):
//   { rank: '2' | '3' | ... | '10' | 'J' | 'Q' | 'K' | 'A',
//     suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' }
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as cardUtils from '../../src/games/cardUtils.js';

/**
 * Builds a card from a string rank and a string suit.
 *
 * @param {string} rank - '2'..'10' | 'J' | 'Q' | 'K' | 'A'
 * @param {string} suit - 'hearts' | 'diamonds' | 'clubs' | 'spades'
 * @returns {{ rank: string, suit: string }}
 */
function card(rank, suit) {
  return { rank, suit };
}

/**
 * Deep-copies a hand (plain string data only) so tests can detect mutation.
 *
 * @param {Array<{ rank: string, suit: string }>} hand
 * @returns {Array<{ rank: string, suit: string }>}
 */
function cloneHand(hand) {
  return JSON.parse(JSON.stringify(hand));
}

describe('blackjackTotal', () => {
  it('counts 2-9 at face value', () => {
    assert.strictEqual(cardUtils.blackjackTotal([card('5', 'hearts'), card('7', 'spades')]), 12);
    assert.strictEqual(cardUtils.blackjackTotal([card('2', 'clubs'), card('9', 'diamonds')]), 11);
  });

  it('counts 10, J, Q and K as 10', () => {
    assert.strictEqual(cardUtils.blackjackTotal([card('10', 'hearts'), card('J', 'spades')]), 20);
    assert.strictEqual(cardUtils.blackjackTotal([card('Q', 'hearts'), card('K', 'spades')]), 20);
  });

  it('counts the ace as 11 when it does not bust the hand', () => {
    assert.strictEqual(cardUtils.blackjackTotal([card('A', 'hearts'), card('K', 'spades')]), 21);
    const softHand = [card('A', 'hearts'), card('5', 'spades'), card('5', 'diamonds')];
    assert.strictEqual(cardUtils.blackjackTotal(softHand), 21);
  });

  it('counts the ace as 1 when 11 would bust the hand', () => {
    const hand = [card('A', 'hearts'), card('A', 'spades'), card('K', 'diamonds')];
    assert.strictEqual(cardUtils.blackjackTotal(hand), 12);
    const softHand = [card('A', 'hearts'), card('A', 'spades'), card('9', 'diamonds')];
    assert.strictEqual(cardUtils.blackjackTotal(softHand), 21);
  });

  it('counts four aces plus a king as 14', () => {
    const hand = [
      card('A', 'hearts'),
      card('A', 'diamonds'),
      card('A', 'clubs'),
      card('A', 'spades'),
      card('K', 'hearts'),
    ];
    assert.strictEqual(cardUtils.blackjackTotal(hand), 14);
  });

  it('returns the lowest total above 21 when no ace can save the hand', () => {
    const hand = [card('K', 'hearts'), card('10', 'spades'), card('5', 'diamonds')];
    assert.strictEqual(cardUtils.blackjackTotal(hand), 25);
  });

  it('throws a TypeError on an empty hand', () => {
    assert.throws(() => cardUtils.blackjackTotal([]), TypeError);
  });

  it('throws a TypeError on a non-array hand', () => {
    assert.throws(() => cardUtils.blackjackTotal(null), TypeError);
    assert.throws(() => cardUtils.blackjackTotal('A'), TypeError);
  });

  it('throws a TypeError on an invalid rank', () => {
    assert.throws(() => cardUtils.blackjackTotal([card('X', 'hearts')]), TypeError);
    assert.throws(() => cardUtils.blackjackTotal(['A']), TypeError);
  });

  it('throws a TypeError on an invalid suit', () => {
    assert.throws(() => cardUtils.blackjackTotal([card('A', 'trèfle')]), TypeError);
  });
});

describe('isBlackjack', () => {
  it('returns true for a two-card hand totalling 21 (ace + 10/J/Q/K)', () => {
    assert.strictEqual(cardUtils.isBlackjack([card('A', 'hearts'), card('K', 'spades')]), true);
    assert.strictEqual(cardUtils.isBlackjack([card('A', 'hearts'), card('J', 'spades')]), true);
    assert.strictEqual(cardUtils.isBlackjack([card('A', 'hearts'), card('10', 'spades')]), true);
  });

  it('returns false for two aces', () => {
    assert.strictEqual(cardUtils.isBlackjack([card('A', 'hearts'), card('A', 'spades')]), false);
  });

  it('returns false for two ten-value cards', () => {
    assert.strictEqual(cardUtils.isBlackjack([card('K', 'hearts'), card('Q', 'spades')]), false);
  });

  it('returns false for an ace and a 9 (total 20)', () => {
    assert.strictEqual(cardUtils.isBlackjack([card('A', 'hearts'), card('9', 'spades')]), false);
  });

  it('returns false when the hand does not have exactly two cards', () => {
    assert.strictEqual(cardUtils.isBlackjack([card('A', 'hearts')]), false);
    const threeCards = [card('A', 'hearts'), card('K', 'spades'), card('2', 'diamonds')];
    assert.strictEqual(cardUtils.isBlackjack(threeCards), false);
  });

  it('throws a TypeError on an invalid card', () => {
    const hand = [card('A', 'hearts'), card('Z', 'spades')];
    assert.throws(() => cardUtils.isBlackjack(hand), TypeError);
  });
});

describe('baccaratTotal', () => {
  it('counts A, 10, J, Q and K as 0', () => {
    for (const rank of ['A', '10', 'J', 'Q', 'K']) {
      assert.strictEqual(cardUtils.baccaratTotal([card(rank, 'hearts')]), 0, `rank ${rank}`);
    }
  });

  it('counts 2-9 at face value', () => {
    assert.strictEqual(cardUtils.baccaratTotal([card('5', 'hearts')]), 5);
    assert.strictEqual(cardUtils.baccaratTotal([card('9', 'hearts')]), 9);
  });

  it('keeps only the units digit of the total (9 is the highest total)', () => {
    // Real baccarat scoring: only the units digit of the raw sum counts.
    // The T1 issue originally said "mod 9"; corrected to units digit so a
    // natural 9 (5+4) scores 9, not 0.
    assert.strictEqual(cardUtils.baccaratTotal([card('5', 'hearts'), card('4', 'spades')]), 9);
    assert.strictEqual(cardUtils.baccaratTotal([card('6', 'hearts'), card('7', 'spades')]), 3);
    assert.strictEqual(cardUtils.baccaratTotal([card('9', 'hearts'), card('9', 'spades')]), 8);
    const threeEights = [card('8', 'hearts'), card('8', 'diamonds'), card('8', 'clubs')];
    assert.strictEqual(cardUtils.baccaratTotal(threeEights), 4);
    assert.strictEqual(cardUtils.baccaratTotal([card('J', 'hearts'), card('5', 'spades')]), 5);
    const threeTens = [card('10', 'hearts'), card('10', 'diamonds'), card('10', 'clubs')];
    assert.strictEqual(cardUtils.baccaratTotal(threeTens), 0);
  });

  it('throws a TypeError on an empty hand', () => {
    assert.throws(() => cardUtils.baccaratTotal([]), TypeError);
  });

  it('throws a TypeError on an invalid rank', () => {
    assert.throws(() => cardUtils.baccaratTotal([card('X', 'hearts')]), TypeError);
  });

  it('throws a TypeError on an invalid suit', () => {
    assert.throws(() => cardUtils.baccaratTotal([card('5', 'trèfle')]), TypeError);
  });
});

describe('evaluatePokerHand', () => {
  it('category 10 - royal flush', () => {
    const hand = [
      card('10', 'hearts'),
      card('J', 'hearts'),
      card('Q', 'hearts'),
      card('K', 'hearts'),
      card('A', 'hearts'),
    ];
    assert.deepStrictEqual(cardUtils.evaluatePokerHand(hand), {
      category: 10,
      tiebreakers: [14],
    });
  });

  it('category 9 - straight flush', () => {
    const hand = [
      card('5', 'hearts'),
      card('6', 'hearts'),
      card('7', 'hearts'),
      card('8', 'hearts'),
      card('9', 'hearts'),
    ];
    assert.deepStrictEqual(cardUtils.evaluatePokerHand(hand), {
      category: 9,
      tiebreakers: [9],
    });
  });

  it('category 9 - straight flush wheel (A-2-3-4-5) scores 5', () => {
    const hand = [
      card('A', 'clubs'),
      card('2', 'clubs'),
      card('3', 'clubs'),
      card('4', 'clubs'),
      card('5', 'clubs'),
    ];
    assert.deepStrictEqual(cardUtils.evaluatePokerHand(hand), {
      category: 9,
      tiebreakers: [5],
    });
  });

  it('category 8 - four of a kind', () => {
    const hand = [
      card('A', 'hearts'),
      card('A', 'diamonds'),
      card('A', 'clubs'),
      card('A', 'spades'),
      card('K', 'hearts'),
    ];
    assert.deepStrictEqual(cardUtils.evaluatePokerHand(hand), {
      category: 8,
      tiebreakers: [14, 13],
    });
  });

  it('category 7 - full house', () => {
    const hand = [
      card('K', 'hearts'),
      card('K', 'diamonds'),
      card('K', 'clubs'),
      card('Q', 'hearts'),
      card('Q', 'spades'),
    ];
    assert.deepStrictEqual(cardUtils.evaluatePokerHand(hand), {
      category: 7,
      tiebreakers: [13, 12],
    });
  });

  it('category 6 - flush (not a straight)', () => {
    const hand = [
      card('A', 'hearts'),
      card('J', 'hearts'),
      card('9', 'hearts'),
      card('5', 'hearts'),
      card('2', 'hearts'),
    ];
    assert.deepStrictEqual(cardUtils.evaluatePokerHand(hand), {
      category: 6,
      tiebreakers: [14, 11, 9, 5, 2],
    });
  });

  it('category 5 - straight', () => {
    const hand = [
      card('9', 'spades'),
      card('10', 'hearts'),
      card('J', 'diamonds'),
      card('Q', 'clubs'),
      card('K', 'spades'),
    ];
    assert.deepStrictEqual(cardUtils.evaluatePokerHand(hand), {
      category: 5,
      tiebreakers: [13],
    });
  });

  it('category 5 - straight wheel (A-2-3-4-5) scores 5', () => {
    const hand = [
      card('A', 'spades'),
      card('2', 'hearts'),
      card('3', 'diamonds'),
      card('4', 'clubs'),
      card('5', 'spades'),
    ];
    assert.deepStrictEqual(cardUtils.evaluatePokerHand(hand), {
      category: 5,
      tiebreakers: [5],
    });
  });

  it('category 4 - three of a kind', () => {
    const hand = [
      card('7', 'spades'),
      card('7', 'hearts'),
      card('7', 'diamonds'),
      card('K', 'clubs'),
      card('2', 'spades'),
    ];
    assert.deepStrictEqual(cardUtils.evaluatePokerHand(hand), {
      category: 4,
      tiebreakers: [7, 13, 2],
    });
  });

  it('category 3 - two pair', () => {
    const hand = [
      card('K', 'spades'),
      card('K', 'hearts'),
      card('7', 'diamonds'),
      card('7', 'clubs'),
      card('A', 'spades'),
    ];
    assert.deepStrictEqual(cardUtils.evaluatePokerHand(hand), {
      category: 3,
      tiebreakers: [13, 7, 14],
    });
  });

  it('category 2 - one pair', () => {
    const hand = [
      card('Q', 'spades'),
      card('Q', 'hearts'),
      card('5', 'diamonds'),
      card('9', 'clubs'),
      card('K', 'spades'),
    ];
    assert.deepStrictEqual(cardUtils.evaluatePokerHand(hand), {
      category: 2,
      tiebreakers: [12, 13, 9, 5],
    });
  });

  it('category 1 - high card', () => {
    const hand = [
      card('A', 'spades'),
      card('K', 'hearts'),
      card('9', 'diamonds'),
      card('5', 'clubs'),
      card('2', 'spades'),
    ];
    assert.deepStrictEqual(cardUtils.evaluatePokerHand(hand), {
      category: 1,
      tiebreakers: [14, 13, 9, 5, 2],
    });
  });

  it('orders two-pair tiebreakers (high pair, low pair, kicker)', () => {
    const kingsSevensAce = [
      card('K', 'spades'),
      card('K', 'hearts'),
      card('2', 'diamonds'),
      card('2', 'clubs'),
      card('A', 'spades'),
    ];
    const queensJacksAce = [
      card('Q', 'spades'),
      card('Q', 'hearts'),
      card('J', 'diamonds'),
      card('J', 'clubs'),
      card('A', 'spades'),
    ];
    assert.deepStrictEqual(cardUtils.evaluatePokerHand(kingsSevensAce), {
      category: 3,
      tiebreakers: [13, 2, 14],
    });
    assert.deepStrictEqual(cardUtils.evaluatePokerHand(queensJacksAce), {
      category: 3,
      tiebreakers: [12, 11, 14],
    });
  });

  it('throws a TypeError when the hand does not have exactly five cards', () => {
    const fourCards = [
      card('A', 'spades'),
      card('K', 'hearts'),
      card('Q', 'diamonds'),
      card('J', 'clubs'),
    ];
    assert.throws(() => cardUtils.evaluatePokerHand(fourCards), TypeError);
    const sixCards = [
      card('A', 'spades'),
      card('K', 'hearts'),
      card('Q', 'diamonds'),
      card('J', 'clubs'),
      card('10', 'spades'),
      card('9', 'hearts'),
    ];
    assert.throws(() => cardUtils.evaluatePokerHand(sixCards), TypeError);
  });

  it('throws a TypeError on a duplicated card', () => {
    const hand = [
      card('K', 'spades'),
      card('K', 'hearts'),
      card('K', 'diamonds'),
      card('Q', 'clubs'),
      card('K', 'spades'),
    ];
    assert.throws(() => cardUtils.evaluatePokerHand(hand), TypeError);
  });

  it('throws a TypeError on an invalid rank', () => {
    const hand = [
      card('A', 'spades'),
      card('K', 'hearts'),
      card('Q', 'diamonds'),
      card('J', 'clubs'),
      card('X', 'spades'),
    ];
    assert.throws(() => cardUtils.evaluatePokerHand(hand), TypeError);
  });

  it('throws a TypeError on an invalid suit', () => {
    const hand = [
      card('A', 'spades'),
      card('K', 'hearts'),
      card('Q', 'diamonds'),
      card('J', 'clubs'),
      card('10', 'trèfle'),
    ];
    assert.throws(() => cardUtils.evaluatePokerHand(hand), TypeError);
  });
});

describe('hasPair', () => {
  it('returns true for two cards of the same rank', () => {
    assert.strictEqual(cardUtils.hasPair([card('K', 'hearts'), card('K', 'spades')]), true);
    assert.strictEqual(cardUtils.hasPair([card('10', 'clubs'), card('10', 'diamonds')]), true);
    assert.strictEqual(cardUtils.hasPair([card('A', 'hearts'), card('A', 'diamonds')]), true);
  });

  it('returns false for two cards of different ranks', () => {
    assert.strictEqual(cardUtils.hasPair([card('K', 'hearts'), card('Q', 'spades')]), false);
    assert.strictEqual(cardUtils.hasPair([card('10', 'clubs'), card('J', 'diamonds')]), false);
  });

  it('throws a TypeError when the hand does not have exactly two cards', () => {
    assert.throws(() => cardUtils.hasPair([]), TypeError);
    assert.throws(() => cardUtils.hasPair([card('K', 'hearts')]), TypeError);
    const threeCards = [card('K', 'hearts'), card('Q', 'spades'), card('A', 'diamonds')];
    assert.throws(() => cardUtils.hasPair(threeCards), TypeError);
  });

  it('throws a TypeError on an invalid card', () => {
    const hand = [card('K', 'hearts'), card('Z', 'spades')];
    assert.throws(() => cardUtils.hasPair(hand), TypeError);
  });
});

describe('module contract', () => {
  it('exports exactly the five public functions', () => {
    assert.deepStrictEqual(Object.keys(cardUtils).sort(), [
      'baccaratTotal',
      'blackjackTotal',
      'evaluatePokerHand',
      'hasPair',
      'isBlackjack',
    ]);
  });

  it('does not mutate the hands it receives', () => {
    const blackjackHand = [card('A', 'hearts'), card('K', 'spades')];
    const blackjackSnapshot = cloneHand(blackjackHand);
    cardUtils.blackjackTotal(blackjackHand);
    cardUtils.isBlackjack(blackjackHand);
    cardUtils.hasPair(blackjackHand);
    assert.deepStrictEqual(blackjackHand, blackjackSnapshot);

    const baccaratHand = [card('8', 'hearts'), card('8', 'diamonds'), card('8', 'clubs')];
    const baccaratSnapshot = cloneHand(baccaratHand);
    cardUtils.baccaratTotal(baccaratHand);
    assert.deepStrictEqual(baccaratHand, baccaratSnapshot);

    const pokerHand = [
      card('K', 'hearts'),
      card('K', 'spades'),
      card('7', 'diamonds'),
      card('7', 'clubs'),
      card('A', 'hearts'),
    ];
    const pokerSnapshot = cloneHand(pokerHand);
    cardUtils.evaluatePokerHand(pokerHand);
    assert.deepStrictEqual(pokerHand, pokerSnapshot);
  });
});
