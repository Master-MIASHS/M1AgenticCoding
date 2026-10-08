// ---------------------------------------------------------------------------
// Unit tests - blackjack rules (src/games/blackjack/rules.js)
// ---------------------------------------------------------------------------
// Vague 2 - Groupe 2 (#189). Pure rules of one blackjack round, plugged into
// createGame as a multi-step game (G2 contract section 3.2):
//   start(raw, { bets, config, balance }) -> session | gameResult
//   step(session, action, raw)           -> session | gameResult
//   view({ phase, raw, session, gameResult }) -> what G3 may display
//
// raw (start) is the deck already shuffled by the Core: cards are dealt in
// raw order: player, dealer (visible), player, dealer (hidden), then the next
// cards for hit / double and for the dealer. During actions raw is null: the
// cards come from the shoe kept in the session (deck.js).
//
// Rules v1 (#189, proposed in #8): hit / stand / double, no split, dealer
// stands on every 17 (soft 17 included), naturals checked at the deal.
// Following the TDD rule of the ticket, these tests pin down the behavior
// contract before the implementation exists.
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as rules from '../../src/games/blackjack/rules.js';

const CONFIG = { paytable: { blackjack: 2.5, win: 2 } };
const BETS = [{ type: 'main', amount: 10 }];

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
 * Deep-copies plain data so tests can detect mutation.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Starts a round with the default bets and config.
 *
 * @param {Array<{ rank: string, suit: string }>} raw - shuffled deck, in dealing order.
 * @param {object} [extra] - extra context fields (balance...).
 * @returns {object} session or gameResult.
 */
function startRound(raw, extra = {}) {
  return rules.start(raw, { bets: BETS, config: CONFIG, ...extra });
}

describe('start', () => {
  it('deals 2 cards to the player and 2 to the dealer, in raw order, and keeps the round going', () => {
    const raw = [
      card('10', 'hearts'),
      card('9', 'spades'),
      card('7', 'diamonds'),
      card('8', 'clubs'),
    ];
    const session = startRound(raw);
    assert.strictEqual(session.needsDraw, true);
    assert.deepStrictEqual(session.player, [card('10', 'hearts'), card('7', 'diamonds')]);
    assert.deepStrictEqual(session.dealer, [card('9', 'spades'), card('8', 'clubs')]);
  });

  it('offers hit, stand and double', () => {
    const raw = [
      card('10', 'hearts'),
      card('9', 'spades'),
      card('7', 'diamonds'),
      card('8', 'clubs'),
    ];
    assert.deepStrictEqual(startRound(raw).availableActions, ['hit', 'stand', 'double']);
  });

  it('records the opening stake as totalBet (sum of the bets)', () => {
    const raw = [
      card('10', 'hearts'),
      card('9', 'spades'),
      card('7', 'diamonds'),
      card('8', 'clubs'),
    ];
    const session = rules.start(raw, {
      bets: [
        { type: 'main', amount: 10 },
        { type: 'main', amount: 5 },
      ],
      config: CONFIG,
    });
    assert.strictEqual(session.totalBet, 15);
  });

  it('does not mutate the raw deck nor the bets', () => {
    const raw = [
      card('10', 'hearts'),
      card('9', 'spades'),
      card('7', 'diamonds'),
      card('8', 'clubs'),
    ];
    const bets = [{ type: 'main', amount: 10 }];
    const rawSnapshot = clone(raw);
    const betsSnapshot = clone(bets);
    rules.start(raw, { bets, config: CONFIG });
    assert.deepStrictEqual(raw, rawSnapshot);
    assert.deepStrictEqual(bets, betsSnapshot);
  });

  it('ends the round at once on a player natural: win, blackjack multiplier', () => {
    const raw = [
      card('A', 'hearts'),
      card('9', 'spades'),
      card('K', 'diamonds'),
      card('8', 'clubs'),
    ];
    const result = startRound(raw);
    assert.strictEqual(result.needsDraw, undefined);
    assert.strictEqual(result.outcome, 'win');
    assert.strictEqual(result.multiplier, CONFIG.paytable.blackjack);
    assert.strictEqual(result.details.natural, true);
  });

  it('ends the round at once on a dealer natural: loss', () => {
    const raw = [
      card('9', 'hearts'),
      card('A', 'spades'),
      card('8', 'diamonds'),
      card('K', 'clubs'),
    ];
    const result = startRound(raw);
    assert.strictEqual(result.outcome, 'loss');
    assert.strictEqual(result.multiplier, 0);
  });

  it('pushes when both player and dealer have a natural', () => {
    const raw = [
      card('A', 'hearts'),
      card('A', 'spades'),
      card('K', 'diamonds'),
      card('Q', 'clubs'),
    ];
    const result = startRound(raw);
    assert.strictEqual(result.outcome, 'push');
    assert.strictEqual(result.multiplier, 1);
  });

  it('rejects a missing config or an incomplete paytable (no payout in code)', () => {
    const raw = [
      card('10', 'hearts'),
      card('9', 'spades'),
      card('7', 'diamonds'),
      card('8', 'clubs'),
    ];
    assert.throws(() => rules.start(raw, { bets: BETS }), TypeError);
    assert.throws(() => rules.start(raw, { bets: BETS, config: {} }), TypeError);
    assert.throws(
      () => rules.start(raw, { bets: BETS, config: { paytable: { blackjack: 2.5 } } }),
      TypeError
    );
    assert.throws(
      () => rules.start(raw, { bets: BETS, config: { paytable: { win: 2 } } }),
      TypeError
    );
  });

  it('rejects an invalid raw deck or invalid bets', () => {
    assert.throws(() => rules.start(null, { bets: BETS, config: CONFIG }), TypeError);
    const raw = [
      card('10', 'hearts'),
      card('9', 'spades'),
      card('7', 'diamonds'),
      card('8', 'clubs'),
    ];
    assert.throws(() => rules.start(raw, { bets: [], config: CONFIG }), TypeError);
    assert.throws(
      () => rules.start(raw, { bets: [{ type: 'main', amount: -5 }], config: CONFIG }),
      TypeError
    );
  });

  it('offers double only when a known balance covers the doubled stake', () => {
    const raw = [
      card('10', 'hearts'),
      card('9', 'spades'),
      card('7', 'diamonds'),
      card('8', 'clubs'),
    ];
    assert.deepStrictEqual(startRound(raw, { balance: 15 }).availableActions, ['hit', 'stand']);
    assert.deepStrictEqual(startRound(raw, { balance: 20 }).availableActions, [
      'hit',
      'stand',
      'double',
    ]);
  });
});

describe('step', () => {
  it('hit: adds the next card and no longer offers double', () => {
    const raw = [
      card('10', 'hearts'),
      card('9', 'spades'),
      card('2', 'diamonds'),
      card('8', 'clubs'),
      card('3', 'hearts'),
    ];
    const next = rules.step(startRound(raw), 'hit', null);
    assert.strictEqual(next.needsDraw, true);
    assert.deepStrictEqual(next.player, [
      card('10', 'hearts'),
      card('2', 'diamonds'),
      card('3', 'hearts'),
    ]);
    assert.deepStrictEqual(next.availableActions, ['hit', 'stand']);
  });

  it('hit over 21: immediate loss, the dealer does not play', () => {
    const raw = [
      card('10', 'hearts'),
      card('9', 'spades'),
      card('6', 'diamonds'),
      card('8', 'clubs'),
      card('K', 'hearts'),
      card('5', 'spades'),
    ];
    const result = rules.step(startRound(raw), 'hit', null);
    assert.strictEqual(result.outcome, 'loss');
    assert.strictEqual(result.multiplier, 0);
    assert.strictEqual(result.details.dealerHand.length, 2);
  });

  it('stand: the dealer draws until at least 17, and loses over 21', () => {
    const raw = [
      card('10', 'hearts'),
      card('9', 'spades'),
      card('9', 'diamonds'),
      card('5', 'clubs'),
      card('2', 'hearts'),
      card('6', 'diamonds'),
    ];
    const result = rules.step(startRound(raw), 'stand', null);
    assert.deepStrictEqual(result.details.dealerHand, [
      card('9', 'spades'),
      card('5', 'clubs'),
      card('2', 'hearts'),
      card('6', 'diamonds'),
    ]);
    assert.strictEqual(result.details.dealerTotal, 22);
    assert.strictEqual(result.outcome, 'win');
    assert.strictEqual(result.multiplier, CONFIG.paytable.win);
  });

  it('stand: the dealer stays on a soft 17 (ace + 6)', () => {
    const raw = [
      card('10', 'hearts'),
      card('A', 'spades'),
      card('8', 'diamonds'),
      card('6', 'clubs'),
      card('5', 'hearts'),
    ];
    const result = rules.step(startRound(raw), 'stand', null);
    assert.strictEqual(result.details.dealerHand.length, 2);
    assert.strictEqual(result.details.dealerTotal, 17);
    assert.strictEqual(result.outcome, 'win');
  });

  it('compares the totals: lower total loses, equal total pushes', () => {
    const lower = [
      card('10', 'hearts'),
      card('10', 'spades'),
      card('7', 'diamonds'),
      card('9', 'clubs'),
    ];
    const lost = rules.step(startRound(lower), 'stand', null);
    assert.strictEqual(lost.outcome, 'loss');
    assert.strictEqual(lost.multiplier, 0);

    const equal = [
      card('10', 'hearts'),
      card('10', 'spades'),
      card('8', 'diamonds'),
      card('8', 'clubs'),
    ];
    const pushed = rules.step(startRound(equal), 'stand', null);
    assert.strictEqual(pushed.outcome, 'push');
    assert.strictEqual(pushed.multiplier, 1);
  });

  it('double: one card only, doubled totalBet, then the dealer plays (win)', () => {
    const raw = [
      card('5', 'hearts'),
      card('9', 'spades'),
      card('6', 'diamonds'),
      card('8', 'clubs'),
      card('10', 'hearts'),
      card('4', 'spades'),
    ];
    const result = rules.step(startRound(raw), 'double', null);
    assert.strictEqual(result.details.playerHand.length, 3);
    assert.strictEqual(result.details.playerTotal, 21);
    assert.strictEqual(result.details.totalBet, 20);
    assert.strictEqual(result.outcome, 'win');
    assert.strictEqual(result.multiplier, CONFIG.paytable.win);
  });

  it('double: the doubled stake is reported when the player loses', () => {
    const raw = [
      card('5', 'hearts'),
      card('10', 'spades'),
      card('6', 'diamonds'),
      card('9', 'clubs'),
      card('2', 'hearts'),
    ];
    const result = rules.step(startRound(raw), 'double', null);
    assert.strictEqual(result.outcome, 'loss');
    assert.strictEqual(result.details.totalBet, 20);
  });

  it('rejects double after a hit', () => {
    const raw = [
      card('2', 'hearts'),
      card('9', 'spades'),
      card('3', 'diamonds'),
      card('8', 'clubs'),
      card('4', 'hearts'),
      card('5', 'spades'),
    ];
    const afterHit = rules.step(startRound(raw), 'hit', null);
    assert.throws(() => rules.step(afterHit, 'double', null));
  });

  it('rejects an unknown action or one that is not offered', () => {
    const raw = [
      card('10', 'hearts'),
      card('9', 'spades'),
      card('7', 'diamonds'),
      card('8', 'clubs'),
    ];
    const session = startRound(raw);
    assert.throws(() => rules.step(session, 'split', null));
    assert.throws(() => rules.step(session, 'fly', null));
    const noDouble = startRound(raw, { balance: 15 });
    assert.throws(() => rules.step(noDouble, 'double', null));
  });

  it('does not mutate the session it receives', () => {
    const raw = [
      card('10', 'hearts'),
      card('9', 'spades'),
      card('2', 'diamonds'),
      card('8', 'clubs'),
      card('3', 'hearts'),
    ];
    const session = startRound(raw);
    const snapshot = clone(session);
    rules.step(session, 'hit', null);
    assert.deepStrictEqual(clone(session), snapshot);
  });

  it('reports both hands, both totals and the stake in the result details', () => {
    const raw = [
      card('10', 'hearts'),
      card('10', 'spades'),
      card('8', 'diamonds'),
      card('7', 'clubs'),
    ];
    const result = rules.step(startRound(raw), 'stand', null);
    assert.deepStrictEqual(result.details.playerHand, [
      card('10', 'hearts'),
      card('8', 'diamonds'),
    ]);
    assert.deepStrictEqual(result.details.dealerHand, [card('10', 'spades'), card('7', 'clubs')]);
    assert.strictEqual(result.details.playerTotal, 18);
    assert.strictEqual(result.details.dealerTotal, 17);
    assert.strictEqual(result.details.totalBet, 10);
  });
});

describe('view', () => {
  it('during the round: player cards and the visible dealer card only, never the shoe', () => {
    const raw = [
      card('10', 'hearts'),
      card('9', 'spades'),
      card('7', 'diamonds'),
      card('8', 'clubs'),
    ];
    const session = startRound(raw);
    const view = rules.view({ phase: 'playing', raw, session, gameResult: undefined });
    assert.deepStrictEqual(view.playerHand, [card('10', 'hearts'), card('7', 'diamonds')]);
    assert.deepStrictEqual(view.dealerHand, [card('9', 'spades')]);
    assert.strictEqual(view.playerTotal, 17);
    assert.strictEqual(view.phase, 'playing');
    const text = JSON.stringify(view);
    assert.ok(!text.includes('"clubs"'), 'the hidden dealer card is never sent');
    assert.ok(!('shoe' in view) && !('cards' in view) && !('raw' in view));
  });

  it('at the end: the whole dealer hand, both totals and the outcome', () => {
    const raw = [
      card('10', 'hearts'),
      card('10', 'spades'),
      card('8', 'diamonds'),
      card('7', 'clubs'),
    ];
    const gameResult = rules.step(startRound(raw), 'stand', null);
    const view = rules.view({ phase: 'result', raw: null, session: undefined, gameResult });
    assert.strictEqual(view.phase, 'result');
    assert.deepStrictEqual(view.dealerHand, [card('10', 'spades'), card('7', 'clubs')]);
    assert.strictEqual(view.playerTotal, 18);
    assert.strictEqual(view.dealerTotal, 17);
    assert.strictEqual(view.outcome, 'win');
  });
});

describe('module contract', () => {
  it('exports exactly start, step and view', () => {
    assert.deepStrictEqual(Object.keys(rules).sort(), ['start', 'step', 'view']);
  });

  it('has no randomness and no Core import (only cardUtils.js and deck.js)', () => {
    const source = readFileSync(
      new URL('../../src/games/blackjack/rules.js', import.meta.url),
      'utf8'
    );
    assert.ok(!source.includes('Math.random'));
    const imports = source.match(/^import .* from .*$/gm) ?? [];
    assert.deepStrictEqual(
      imports.map((line) => line.replace(/.* from /, '').replace(/[';]/g, '')).sort(),
      ['../cardUtils.js', '../deck.js']
    );
  });
});
