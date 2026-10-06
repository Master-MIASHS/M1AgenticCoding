// ---------------------------------------------------------------------------
// Unit tests - deck builder and draw cursor (src/games/deck.js)
// ---------------------------------------------------------------------------
// T1 ter - Groupe 2 (#102). The deck module builds the 52 x deckCount cards
// from the RANKS / SUITS of cardUtils.js and draws them with a cursor. It
// never shuffles: the game's own draw(core, context) shuffles a new deck with
// the Core melanger() at the start of each round (cards contract section 2,
// G2 contract section 4.2). Following the TDD rule of the ticket, these tests
// pin down the behavior contract before the implementation exists.
//
// Shoe shape: { cards: Card[], cursor: number }, stored in the game session.
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as deck from '../../src/games/deck.js';
import { RANKS, SUITS } from '../../src/games/cardUtils.js';

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
 * Counts how many times each `rank:suit` key appears in a list of cards.
 *
 * @param {Array<{ rank: string, suit: string }>} cards
 * @returns {Map<string, number>}
 */
function countCards(cards) {
  const counts = new Map();
  for (const c of cards) {
    const key = `${c.rank}:${c.suit}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

describe('buildDeck', () => {
  it('builds 52 cards for one deck and 104 cards for two decks', () => {
    assert.strictEqual(deck.buildDeck(1).length, 52);
    assert.strictEqual(deck.buildDeck(2).length, 104);
  });

  it('contains every card exactly deckCount times, in the { rank, suit } format', () => {
    for (const deckCount of [1, 2]) {
      const cards = deck.buildDeck(deckCount);
      const counts = countCards(cards);
      assert.strictEqual(counts.size, 52);
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          assert.strictEqual(counts.get(`${rank}:${suit}`), deckCount);
        }
      }
      for (const c of cards) {
        assert.deepStrictEqual(Object.keys(c).sort(), ['rank', 'suit']);
      }
    }
  });

  it('is not shuffled: suits in SUITS order, ranks in RANKS order within a suit', () => {
    const cards = deck.buildDeck(1);
    assert.deepStrictEqual(cards[0], card('2', 'hearts'));
    assert.deepStrictEqual(cards[12], card('A', 'hearts'));
    assert.deepStrictEqual(cards[13], card('2', 'diamonds'));
    assert.deepStrictEqual(cards[51], card('A', 'spades'));
  });

  it('returns a new array on each call, with the same content', () => {
    const first = deck.buildDeck(1);
    const second = deck.buildDeck(1);
    assert.notStrictEqual(first, second);
    assert.deepStrictEqual(first, second);
  });

  it('builds frozen cards (cards contract section 3: G2 never mutates a card)', () => {
    for (const c of deck.buildDeck(1)) {
      assert.ok(Object.isFrozen(c));
    }
  });

  it('rejects an invalid deckCount', () => {
    for (const invalid of [0, -1, 1.5, '1', undefined, null, Number.NaN]) {
      assert.throws(() => deck.buildDeck(invalid), TypeError);
    }
  });
});

describe('createShoe', () => {
  it('returns a shoe with the given cards and a cursor at 0', () => {
    const cards = deck.buildDeck(1);
    const shoe = deck.createShoe(cards);
    assert.deepStrictEqual(shoe.cards, cards);
    assert.strictEqual(shoe.cursor, 0);
  });

  it('copies the received array: changing the original does not change the shoe', () => {
    const cards = [card('A', 'hearts'), card('K', 'spades')];
    const shoe = deck.createShoe(cards);
    cards.reverse();
    cards.push(card('2', 'clubs'));
    assert.deepStrictEqual(shoe.cards, [card('A', 'hearts'), card('K', 'spades')]);
  });

  it('returns a frozen shoe that cannot be modified', () => {
    const shoe = deck.createShoe(deck.buildDeck(1));
    assert.ok(Object.isFrozen(shoe));
    assert.ok(Object.isFrozen(shoe.cards));
  });

  it('rejects a value that is not an array', () => {
    for (const invalid of [undefined, null, 'cards', 52, { cards: [] }]) {
      assert.throws(() => deck.createShoe(invalid), TypeError);
    }
  });
});

describe('draw', () => {
  it('returns the next n cards in order and a new shoe with the cursor moved by n', () => {
    const shoe = deck.createShoe(deck.buildDeck(1));
    const { cards, shoe: next } = deck.draw(shoe, 5);
    assert.deepStrictEqual(cards, shoe.cards.slice(0, 5));
    assert.strictEqual(next.cursor, 5);
  });

  it('continues from the cursor on consecutive draws', () => {
    const shoe = deck.createShoe(deck.buildDeck(1));
    const first = deck.draw(shoe, 5);
    const second = deck.draw(first.shoe, 3);
    assert.deepStrictEqual(second.cards, shoe.cards.slice(5, 8));
    assert.strictEqual(second.shoe.cursor, 8);
  });

  it('never modifies the shoe it receives', () => {
    const shoe = deck.createShoe(deck.buildDeck(1));
    deck.draw(shoe, 5);
    assert.strictEqual(shoe.cursor, 0);
    assert.strictEqual(shoe.cards.length, 52);
  });

  it('accepts n = 0 (video poker: every card held)', () => {
    const shoe = deck.createShoe(deck.buildDeck(1));
    const { cards, shoe: next } = deck.draw(shoe, 0);
    assert.deepStrictEqual(cards, []);
    assert.strictEqual(next.cursor, 0);
  });

  it('returns a new array of cards that is independent from the shoe', () => {
    const shoe = deck.createShoe(deck.buildDeck(1));
    const { cards, shoe: next } = deck.draw(shoe, 2);
    cards.pop();
    assert.strictEqual(next.cards.length, 52);
    assert.deepStrictEqual(deck.draw(shoe, 2).cards, shoe.cards.slice(0, 2));
  });

  it('draws every card, then throws a RangeError when the shoe is exhausted', () => {
    const shoe = deck.createShoe(deck.buildDeck(1));
    const { shoe: empty } = deck.draw(shoe, 52);
    assert.strictEqual(deck.remaining(empty), 0);
    assert.throws(() => deck.draw(empty, 1), RangeError);
  });

  it('throws a RangeError when asking for more cards than remain', () => {
    const shoe = deck.createShoe(deck.buildDeck(1));
    assert.throws(() => deck.draw(shoe, 53), RangeError);
  });

  it('rejects an invalid n or an invalid shoe', () => {
    const shoe = deck.createShoe(deck.buildDeck(1));
    for (const invalid of [-1, 1.5, '2', undefined, null, Number.NaN]) {
      assert.throws(() => deck.draw(shoe, invalid), TypeError);
    }
    for (const invalid of [undefined, null, [], { cards: [] }, { cursor: 0 }]) {
      assert.throws(() => deck.draw(invalid, 1), TypeError);
    }
  });
});

describe('remaining', () => {
  it('counts the cards left before and after draws', () => {
    const shoe = deck.createShoe(deck.buildDeck(2));
    assert.strictEqual(deck.remaining(shoe), 104);
    const { shoe: next } = deck.draw(shoe, 5);
    assert.strictEqual(deck.remaining(next), 99);
  });
});

describe('module contract', () => {
  it('exports exactly the four public functions', () => {
    assert.deepStrictEqual(Object.keys(deck).sort(), [
      'buildDeck',
      'createShoe',
      'draw',
      'remaining',
    ]);
  });

  it('has no randomness and no Core import (only cardUtils.js is imported)', () => {
    const source = readFileSync(new URL('../../src/games/deck.js', import.meta.url), 'utf8');
    assert.ok(!source.includes('Math.random'));
    const imports = source.match(/^import .* from .*$/gm) ?? [];
    assert.deepStrictEqual(
      imports.map((line) => line.replace(/.* from /, '').replace(/[';]/g, '')),
      ['./cardUtils.js'],
    );
  });
});
