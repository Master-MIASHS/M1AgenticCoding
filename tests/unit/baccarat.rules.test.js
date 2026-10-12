// ---------------------------------------------------------------------------
// Unit tests - baccarat rules (src/games/baccarat/rules.js)
// ---------------------------------------------------------------------------
// Groupe 2 - ticket #220. Pure rules of one Punto Banco round, plugged into
// createGame as an INSTANT game (G2 contract section 3.1):
//   resolve(raw, { bets, config }) -> { outcome, multiplier, details }
//
// raw is the top of the deck shuffled by the Core, in dealing order:
// player, banker, player, banker, then the third cards (src/games/baccarat/
// index.js). The paytable is INJECTED through config (AGENTS.md rule 4): the
// values below are arbitrary and test-only, only the shape matters (open
// point #122).
//
// Following the TDD rule of the ticket, these tests pin down the behaviour
// contract: dealing order, totals, natural, the standard third-card tableau,
// the outcome derived from the aggregate multiplier, and every edge case
// listed in #220 (null/malformed bet, tie, malformed raw, missing config).
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as rules from '../../src/games/baccarat/rules.js';

const CONFIG = { paytable: { player: 2, banker: 1.95, tie: 9 } };
const BET_PLAYER = [{ type: 'player', amount: 10 }];

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
 * Resolves a round with the default config.
 *
 * @param {Array<{ rank: string, suit: string }>} raw - dealt cards, in order.
 * @param {Array<{ type: string, amount: number }>} [bets] - default: 10 on player.
 * @param {object} [config] - default: CONFIG.
 * @returns {object} the gameResult.
 */
function resolveRound(raw, bets = BET_PLAYER, config = CONFIG) {
  return rules.resolve(raw, { bets, config });
}

describe('resolve - dealing and totals', () => {
  it('deals 2 cards to each hand in raw order and detects a natural', () => {
    const result = resolveRound([
      card('4', 'hearts'),
      card('3', 'spades'),
      card('4', 'diamonds'),
      card('2', 'clubs'),
    ]);

    assert.deepStrictEqual(result.details.playerHand, [card('4', 'hearts'), card('4', 'diamonds')]);
    assert.deepStrictEqual(result.details.bankerHand, [card('3', 'spades'), card('2', 'clubs')]);
    assert.strictEqual(result.details.playerTotal, 8);
    assert.strictEqual(result.details.bankerTotal, 5);
    assert.strictEqual(result.details.natural, true);
    assert.deepStrictEqual(result.details.thirdCards, { player: null, banker: null });
    assert.strictEqual(result.details.winner, 'player');
    assert.strictEqual(result.outcome, 'win');
    assert.strictEqual(result.multiplier, CONFIG.paytable.player);
  });

  it('keeps only the units digit of a hand (9 + 9 = 8, a natural)', () => {
    const result = resolveRound([
      card('9', 'hearts'),
      card('7', 'spades'),
      card('9', 'diamonds'),
      card('7', 'clubs'),
    ]);

    assert.strictEqual(result.details.playerTotal, 8);
    assert.strictEqual(result.details.bankerTotal, 4);
    assert.strictEqual(result.details.natural, true);
  });

  it('player 6: the player stands, the banker draws on 0 and loses', () => {
    const third = card('2', 'hearts');
    const result = resolveRound([
      card('3', 'hearts'),
      card('A', 'spades'),
      card('3', 'diamonds'),
      card('K', 'clubs'),
      third,
    ]);

    assert.strictEqual(result.details.playerTotal, 6);
    assert.strictEqual(result.details.bankerTotal, 2);
    assert.strictEqual(result.details.natural, false);
    assert.deepStrictEqual(result.details.thirdCards, { player: null, banker: third });
    assert.strictEqual(result.details.winner, 'player');
    assert.strictEqual(result.outcome, 'win');
  });

  it('banker wins: the commission is read from the config (1.95)', () => {
    const result = resolveRound(
      [
        card('3', 'hearts'),
        card('A', 'spades'),
        card('3', 'diamonds'),
        card('K', 'clubs'),
        card('9', 'hearts'),
      ],
      [{ type: 'banker', amount: 10 }]
    );

    assert.strictEqual(result.details.winner, 'banker');
    assert.strictEqual(result.outcome, 'win');
    assert.strictEqual(result.multiplier, CONFIG.paytable.banker);
    assert.strictEqual(result.details.payout, 19.5);
  });

  it('banker natural 9: no third card, the banker wins', () => {
    const result = resolveRound(
      [card('3', 'hearts'), card('9', 'spades'), card('4', 'diamonds'), card('K', 'clubs')],
      [{ type: 'banker', amount: 10 }]
    );

    assert.strictEqual(result.details.natural, true);
    assert.deepStrictEqual(result.details.thirdCards, { player: null, banker: null });
    assert.strictEqual(result.details.winner, 'banker');
  });
});

describe('resolve - third card tableau', () => {
  const PLAYER_CARDS = [card('2', 'hearts'), card('2', 'diamonds')];
  const BANKER_THIRD = card('9', 'diamonds');

  const TABLEAU = [
    { banker: [card('A', 'clubs'), card('K', 'clubs')], third: card('5', 'spades'), draws: true },
    { banker: [card('3', 'clubs'), card('K', 'clubs')], third: card('8', 'spades'), draws: false },
    { banker: [card('3', 'clubs'), card('K', 'clubs')], third: card('7', 'spades'), draws: true },
    { banker: [card('4', 'clubs'), card('K', 'clubs')], third: card('A', 'spades'), draws: false },
    { banker: [card('4', 'clubs'), card('K', 'clubs')], third: card('7', 'spades'), draws: true },
    { banker: [card('5', 'clubs'), card('K', 'clubs')], third: card('3', 'spades'), draws: false },
    { banker: [card('5', 'clubs'), card('K', 'clubs')], third: card('4', 'spades'), draws: true },
    { banker: [card('6', 'clubs'), card('K', 'clubs')], third: card('5', 'spades'), draws: false },
    { banker: [card('6', 'clubs'), card('K', 'clubs')], third: card('6', 'spades'), draws: true },
    { banker: [card('7', 'clubs'), card('K', 'clubs')], third: card('7', 'spades'), draws: false },
  ];

  it('applies the standard tableau, driven by the player third card value', () => {
    for (const { banker, third, draws } of TABLEAU) {
      const raw = [PLAYER_CARDS[0], banker[0], PLAYER_CARDS[1], banker[1], third, BANKER_THIRD];
      const { details } = resolveRound(raw);

      assert.strictEqual(
        details.bankerHand.length,
        draws ? 3 : 2,
        `banker ${details.bankerTotal} / third card ${baccaratValue(third)} should ${draws ? 'draw' : 'stand'}`
      );
      assert.strictEqual(details.thirdCards.player, third, 'the player third card is reported');
    }
  });

  it('when the player stands, the banker draws on 0-5 and stands on 6-7', () => {
    const stands = resolveRound([
      card('3', 'hearts'),
      card('5', 'clubs'),
      card('3', 'diamonds'),
      card('K', 'clubs'),
      card('7', 'hearts'),
      BANKER_THIRD,
    ]);
    assert.strictEqual(stands.details.playerTotal, 6);
    assert.strictEqual(stands.details.bankerHand.length, 3, 'banker 5 draws');

    const noDraw = resolveRound([
      card('3', 'hearts'),
      card('6', 'clubs'),
      card('3', 'diamonds'),
      card('K', 'clubs'),
      card('7', 'hearts'),
      BANKER_THIRD,
    ]);
    assert.strictEqual(noDraw.details.playerTotal, 6);
    assert.strictEqual(noDraw.details.bankerHand.length, 2, 'banker 6 stands');
  });
});

describe('resolve - bets and settlement', () => {
  it('sums several bets of the same type into the total stake', () => {
    const result = resolveRound(
      [card('4', 'hearts'), card('3', 'spades'), card('4', 'diamonds'), card('2', 'clubs')],
      [
        { type: 'player', amount: 10 },
        { type: 'player', amount: 5 },
      ]
    );

    assert.strictEqual(result.details.totalBet, 15);
    assert.strictEqual(result.details.payout, 30);
    assert.strictEqual(result.multiplier, 2);
  });

  it('tie: player and banker bets are pushed, the tie bet is paid', () => {
    const raw = [
      card('4', 'hearts'),
      card('4', 'spades'),
      card('4', 'diamonds'),
      card('4', 'clubs'),
    ];

    const pushedPlayer = resolveRound(raw, [{ type: 'player', amount: 10 }]);
    assert.strictEqual(pushedPlayer.details.winner, 'tie');
    assert.strictEqual(pushedPlayer.outcome, 'push');
    assert.strictEqual(pushedPlayer.multiplier, 1);
    assert.strictEqual(pushedPlayer.details.payout, 10);

    const pushedBanker = resolveRound(raw, [{ type: 'banker', amount: 10 }]);
    assert.strictEqual(pushedBanker.outcome, 'push');
    assert.strictEqual(pushedBanker.multiplier, 1);

    const paidTie = resolveRound(raw, [{ type: 'tie', amount: 10 }]);
    assert.strictEqual(paidTie.outcome, 'win');
    assert.strictEqual(paidTie.multiplier, CONFIG.paytable.tie);
    assert.strictEqual(paidTie.details.payout, 90);
  });

  it('a losing bet keeps the stake: multiplier 0', () => {
    const result = resolveRound(
      [card('3', 'hearts'), card('9', 'spades'), card('4', 'diamonds'), card('K', 'clubs')],
      [{ type: 'player', amount: 10 }]
    );

    assert.strictEqual(result.details.winner, 'banker');
    assert.strictEqual(result.outcome, 'loss');
    assert.strictEqual(result.multiplier, 0);
    assert.strictEqual(result.details.payout, 0);
  });

  it('keeps the outcome coherent with the multiplier on every hand', () => {
    const hands = [
      [card('4', 'hearts'), card('3', 'spades'), card('4', 'diamonds'), card('2', 'clubs')],
      [card('3', 'hearts'), card('9', 'spades'), card('4', 'diamonds'), card('K', 'clubs')],
      [card('4', 'hearts'), card('4', 'spades'), card('4', 'diamonds'), card('4', 'clubs')],
    ];
    for (const raw of hands) {
      for (const type of ['player', 'banker', 'tie']) {
        const { outcome, multiplier } = resolveRound(raw, [{ type, amount: 10 }]);
        const expected = multiplier > 1 ? 'win' : multiplier < 1 ? 'loss' : 'push';
        assert.strictEqual(outcome, expected, `${type} / multiplier ${multiplier}`);
      }
    }
  });

  it('does not mutate raw, bets nor config', () => {
    const raw = [
      card('4', 'hearts'),
      card('3', 'spades'),
      card('4', 'diamonds'),
      card('2', 'clubs'),
    ];
    const bets = [{ type: 'player', amount: 10 }];
    const rawSnapshot = clone(raw);
    const betsSnapshot = clone(bets);
    const configSnapshot = clone(CONFIG);

    rules.resolve(raw, { bets, config: CONFIG });

    assert.deepStrictEqual(raw, rawSnapshot);
    assert.deepStrictEqual(bets, betsSnapshot);
    assert.deepStrictEqual(CONFIG, configSnapshot);
  });
});

describe('resolve - edge cases of ticket #220', () => {
  const RAW = [card('4', 'hearts'), card('3', 'spades'), card('4', 'diamonds'), card('2', 'clubs')];

  it('rejects a missing or incomplete config (no payout in code)', () => {
    assert.throws(() => rules.resolve(RAW, { bets: BET_PLAYER }), TypeError);
    assert.throws(() => rules.resolve(RAW, { bets: BET_PLAYER, config: {} }), TypeError);
    assert.throws(
      () => rules.resolve(RAW, { bets: BET_PLAYER, config: { paytable: { player: 2 } } }),
      TypeError
    );
    assert.throws(
      () =>
        rules.resolve(RAW, {
          bets: BET_PLAYER,
          config: { paytable: { player: 2, banker: 1.95, tie: -1 } },
        }),
      TypeError
    );
    assert.throws(
      () =>
        rules.resolve(RAW, {
          bets: BET_PLAYER,
          config: { paytable: { player: 2, banker: 'x', tie: 9 } },
        }),
      TypeError
    );
  });

  it('rejects null, empty and malformed bets (including a null stake)', () => {
    // A null stake is refused: the Core itself rejects a stake <= 0 when it
    // settles the round (src/core/economy.js).
    assert.throws(() => rules.resolve(RAW, { config: CONFIG }), TypeError);
    assert.throws(() => rules.resolve(RAW, { bets: [], config: CONFIG }), TypeError);
    assert.throws(() => rules.resolve(RAW, { bets: [null], config: CONFIG }), TypeError);
    assert.throws(
      () => rules.resolve(RAW, { bets: [{ type: 'player' }], config: CONFIG }),
      TypeError
    );
    assert.throws(
      () => rules.resolve(RAW, { bets: [{ type: 'player', amount: 0 }], config: CONFIG }),
      TypeError
    );
    assert.throws(
      () => rules.resolve(RAW, { bets: [{ type: 'player', amount: -5 }], config: CONFIG }),
      TypeError
    );
    assert.throws(
      () => rules.resolve(RAW, { bets: [{ type: 'player', amount: '10' }], config: CONFIG }),
      TypeError
    );
  });

  it('rejects an unknown bet type', () => {
    assert.throws(
      () => rules.resolve(RAW, { bets: [{ type: 'pair', amount: 10 }], config: CONFIG }),
      TypeError
    );
  });

  it('rejects a malformed or too short raw', () => {
    assert.throws(() => rules.resolve(null, { bets: BET_PLAYER, config: CONFIG }), TypeError);
    assert.throws(() => rules.resolve({}, { bets: BET_PLAYER, config: CONFIG }), TypeError);
    assert.throws(
      () =>
        rules.resolve([card('4', 'hearts'), card('3', 'spades')], {
          bets: BET_PLAYER,
          config: CONFIG,
        }),
      RangeError
    );
    assert.throws(
      () =>
        rules.resolve(
          [card('Z', 'hearts'), card('3', 'spades'), card('4', 'diamonds'), card('2', 'clubs')],
          { bets: BET_PLAYER, config: CONFIG }
        ),
      TypeError
    );
  });

  it('returns a gameResult with exactly outcome, multiplier and details', () => {
    const result = resolveRound(RAW);
    assert.deepStrictEqual(Object.keys(result).sort(), ['details', 'multiplier', 'outcome']);
    assert.deepStrictEqual(Object.keys(result.details).sort(), [
      'bankerHand',
      'bankerTotal',
      'bets',
      'natural',
      'payout',
      'playerHand',
      'playerTotal',
      'thirdCards',
      'totalBet',
      'winner',
    ]);
  });
});

describe('module contract', () => {
  it('exports exactly resolve', () => {
    assert.deepStrictEqual(Object.keys(rules).sort(), ['resolve']);
  });

  it('has no randomness and no Core import (only cardUtils.js and deck.js)', () => {
    const source = readFileSync(
      new URL('../../src/games/baccarat/rules.js', import.meta.url),
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

/**
 * Baccarat value of a single card (0-9), used only for readable messages.
 *
 * @param {{ rank: string }} card - the card to value.
 * @returns {number} its baccarat value.
 */
function baccaratValue(card) {
  const numeric = Number(card.rank);
  if (card.rank === 'A' || Number.isNaN(numeric) || numeric === 10) return 0;
  return numeric % 10;
}
