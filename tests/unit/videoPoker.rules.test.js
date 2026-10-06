import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { RANKS, SUITS } from '../../src/games/cardUtils.js';
import { videoPokerRules } from '../../src/games/video-poker/rules.js';

const PAYTABLE = {
  10: 250,
  9: 50,
  8: 25,
  7: 9,
  6: 6,
  5: 4,
  4: 3,
  3: 2,
  2: 1,
};

function makeDeckWithHand(hand) {
  const handKeys = new Set(hand.map(({ rank, suit }) => `${rank}:${suit}`));
  const remaining = SUITS.flatMap((suit) =>
    RANKS.filter((rank) => !handKeys.has(`${rank}:${suit}`)).map((rank) => ({ rank, suit }))
  );
  return [...hand.map((card) => ({ ...card })), ...remaining];
}

function playHand(hand, config = { paytable: PAYTABLE }) {
  let session = videoPokerRules.start(makeDeckWithHand(hand), { config });
  for (let index = 0; index < 5; index += 1) {
    session = videoPokerRules.step(session, `hold-${index}`, null);
  }
  return videoPokerRules.step(session, 'draw', null);
}

describe('videoPokerRules.start', () => {
  it('deals five cards and exposes the agreed hold/draw actions', () => {
    const raw = makeDeckWithHand([
      { rank: 'A', suit: 'hearts' },
      { rank: 'K', suit: 'hearts' },
      { rank: 'Q', suit: 'hearts' },
      { rank: 'J', suit: 'hearts' },
      { rank: '10', suit: 'hearts' },
    ]);
    const session = videoPokerRules.start(raw, { config: { paytable: PAYTABLE } });

    assert.deepEqual(session.hand, raw.slice(0, 5));
    assert.deepEqual(session.held, [false, false, false, false, false]);
    assert.deepEqual(session.availableActions, [
      'hold-0',
      'hold-1',
      'hold-2',
      'hold-3',
      'hold-4',
      'draw',
    ]);
    assert.equal(session.needsDraw, true);
    assert.equal(session.shoe.cursor, 5);
    assert.equal(session.shoe.cards.length, 52);
  });

  it('copies the shuffled deck and rejects missing paytable configuration', () => {
    const raw = makeDeckWithHand([
      { rank: '2', suit: 'hearts' },
      { rank: '4', suit: 'diamonds' },
      { rank: '6', suit: 'clubs' },
      { rank: '8', suit: 'spades' },
      { rank: '10', suit: 'hearts' },
    ]);
    const firstCard = { ...raw[0] };
    const session = videoPokerRules.start(raw, { config: { paytable: PAYTABLE } });
    raw.length = 0;

    assert.equal(session.shoe.cards.length, 52);
    assert.deepEqual(session.hand[0], firstCard);
    assert.throws(
      () => videoPokerRules.start(session.shoe.cards, {}),
      /video poker: config\.paytable is required/
    );
  });
});

describe('videoPokerRules.step', () => {
  it('toggles holds without advancing the shoe, then replaces only unheld cards', () => {
    const deck = makeDeckWithHand([
      { rank: '2', suit: 'hearts' },
      { rank: '4', suit: 'diamonds' },
      { rank: '6', suit: 'clubs' },
      { rank: '8', suit: 'spades' },
      { rank: '10', suit: 'hearts' },
    ]);
    const session = videoPokerRules.start(deck, { config: { paytable: PAYTABLE } });
    const heldOnce = videoPokerRules.step(session, 'hold-0', null);
    const heldTwice = videoPokerRules.step(heldOnce, 'hold-0', null);

    assert.deepEqual(heldOnce.held, [true, false, false, false, false]);
    assert.deepEqual(heldTwice.held, [false, false, false, false, false]);
    assert.equal(heldOnce.shoe.cursor, 5);
    assert.equal(heldTwice.shoe.cursor, 5);

    const kept = videoPokerRules.step(heldOnce, 'hold-2', null);
    const result = videoPokerRules.step(kept, 'draw', null);
    assert.deepEqual(result.details.hand, [
      deck[0],
      deck[5],
      deck[2],
      deck[6],
      deck[7],
    ]);
    assert.deepEqual(result.details.hand[0], deck[0]);
    assert.deepEqual(result.details.hand[2], deck[2]);
    assert.equal('needsDraw' in result, false);
  });

  it('rejects unsupported actions and exhausted replacement cards', () => {
    const shortDeck = makeDeckWithHand([
      { rank: '2', suit: 'hearts' },
      { rank: '4', suit: 'diamonds' },
      { rank: '6', suit: 'clubs' },
      { rank: '8', suit: 'spades' },
      { rank: '10', suit: 'hearts' },
    ]).slice(0, 7);
    const session = videoPokerRules.start(shortDeck, { config: { paytable: PAYTABLE } });

    assert.throws(
      () => videoPokerRules.step(session, 'hold-5', null),
      /video poker: unsupported action "hold-5"/
    );
    assert.throws(
      () => videoPokerRules.step(session, 'draw', null),
      RangeError
    );
  });
});

describe('videoPokerRules.resolve', () => {
  const paidHands = [
    ['royal flush', 10, 250, [
      { rank: '10', suit: 'hearts' },
      { rank: 'J', suit: 'hearts' },
      { rank: 'Q', suit: 'hearts' },
      { rank: 'K', suit: 'hearts' },
      { rank: 'A', suit: 'hearts' },
    ]],
    ['straight flush', 9, 50, [
      { rank: '5', suit: 'hearts' },
      { rank: '6', suit: 'hearts' },
      { rank: '7', suit: 'hearts' },
      { rank: '8', suit: 'hearts' },
      { rank: '9', suit: 'hearts' },
    ]],
    ['four of a kind', 8, 25, [
      { rank: '7', suit: 'hearts' },
      { rank: '7', suit: 'diamonds' },
      { rank: '7', suit: 'clubs' },
      { rank: '7', suit: 'spades' },
      { rank: 'K', suit: 'hearts' },
    ]],
    ['full house', 7, 9, [
      { rank: 'Q', suit: 'hearts' },
      { rank: 'Q', suit: 'diamonds' },
      { rank: 'Q', suit: 'clubs' },
      { rank: '4', suit: 'spades' },
      { rank: '4', suit: 'hearts' },
    ]],
    ['flush', 6, 6, [
      { rank: '2', suit: 'clubs' },
      { rank: '5', suit: 'clubs' },
      { rank: '8', suit: 'clubs' },
      { rank: 'J', suit: 'clubs' },
      { rank: 'K', suit: 'clubs' },
    ]],
    ['straight', 5, 4, [
      { rank: '2', suit: 'hearts' },
      { rank: '3', suit: 'diamonds' },
      { rank: '4', suit: 'clubs' },
      { rank: '5', suit: 'spades' },
      { rank: '6', suit: 'hearts' },
    ]],
    ['three of a kind', 4, 3, [
      { rank: '6', suit: 'hearts' },
      { rank: '6', suit: 'diamonds' },
      { rank: '6', suit: 'clubs' },
      { rank: '3', suit: 'spades' },
      { rank: '9', suit: 'hearts' },
    ]],
    ['two pair', 3, 2, [
      { rank: '8', suit: 'hearts' },
      { rank: '8', suit: 'diamonds' },
      { rank: '3', suit: 'clubs' },
      { rank: '3', suit: 'spades' },
      { rank: 'K', suit: 'hearts' },
    ]],
    ['high card', 1, 0, [
      { rank: '2', suit: 'hearts' },
      { rank: '5', suit: 'diamonds' },
      { rank: '8', suit: 'clubs' },
      { rank: 'J', suit: 'spades' },
      { rank: 'K', suit: 'hearts' },
    ]],
  ];

  for (const [label, category, multiplier, hand] of paidHands) {
    it(`uses the configured ${label} payment`, () => {
      const result = playHand(hand);

      assert.equal(result.details.category, category);
      assert.equal(result.multiplier, multiplier);
      assert.equal(result.outcome, multiplier > 1 ? 'win' : multiplier === 1 ? 'push' : 'loss');
      assert.deepEqual(result.details.hand, hand);
    });
  }

  it('pays one times the stake only for a pair of jacks or better', () => {
    const jacksOrBetter = playHand([
      { rank: 'J', suit: 'hearts' },
      { rank: 'J', suit: 'diamonds' },
      { rank: '2', suit: 'clubs' },
      { rank: '5', suit: 'spades' },
      { rank: '9', suit: 'hearts' },
    ]);
    const lowerPair = playHand([
      { rank: '10', suit: 'hearts' },
      { rank: '10', suit: 'diamonds' },
      { rank: '2', suit: 'clubs' },
      { rank: '5', suit: 'spades' },
      { rank: '9', suit: 'hearts' },
    ]);

    assert.equal(jacksOrBetter.details.category, 2);
    assert.equal(jacksOrBetter.details.tiebreakers[0], 11);
    assert.equal(jacksOrBetter.multiplier, 1);
    assert.equal(jacksOrBetter.outcome, 'push');
    assert.equal(lowerPair.details.category, 2);
    assert.equal(lowerPair.details.tiebreakers[0], 10);
    assert.equal(lowerPair.multiplier, 0);
    assert.equal(lowerPair.outcome, 'loss');
  });

  it('returns a safe rendering view without the shoe or paytable', () => {
    const deck = makeDeckWithHand(paidHands[0][3]);
    const session = videoPokerRules.start(deck, { config: { paytable: PAYTABLE } });
    const view = videoPokerRules.view({
      phase: 'playing',
      raw: deck,
      session,
    });

    assert.deepEqual(view.hand, session.hand);
    assert.deepEqual(view.held, [false, false, false, false, false]);
    assert.equal('shoe' in view, false);
    assert.equal('paytable' in view, false);
    assert.equal(JSON.stringify(view).includes(JSON.stringify(deck[12])), false);
  });

  it('returns the final hand and held positions in the result view', () => {
    const gameResult = playHand(paidHands[0][3]);
    const view = videoPokerRules.view({ phase: 'result', gameResult });

    assert.deepEqual(view.hand, gameResult.details.hand);
    assert.deepEqual(view.held, [true, true, true, true, true]);
    assert.deepEqual(view.result, {
      outcome: gameResult.outcome,
      multiplier: gameResult.multiplier,
      category: 10,
      tiebreakers: [14],
    });
    assert.equal('shoe' in view, false);
  });

  it('rejects malformed cards and invalid paytables', () => {
    const validDeck = makeDeckWithHand([
      { rank: '2', suit: 'hearts' },
      { rank: '4', suit: 'diamonds' },
      { rank: '6', suit: 'clubs' },
      { rank: '8', suit: 'spades' },
      { rank: '10', suit: 'hearts' },
    ]);
    const invalidDeck = [...validDeck];
    invalidDeck[12] = { rank: '1', suit: 'hearts' };

    assert.throws(
      () => videoPokerRules.start(validDeck, { config: { paytable: { 10: -1 } } }),
      /video poker: paytable values must be finite non-negative numbers/
    );
    assert.throws(
      () => videoPokerRules.start(invalidDeck, { config: { paytable: PAYTABLE } }),
      /video poker: invalid card at index 12/
    );
  });
});
