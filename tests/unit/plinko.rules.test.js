// ---------------------------------------------------------------------------
// Unit tests - Plinko rules (src/games/plinko/rules.js)
// ---------------------------------------------------------------------------
// T26 - Groupe 2. Pure settlement of a Plinko round from a landing slot.
//
// These tests deliberately pin the CONTRACT of the module before any Core is
// wired to it: `raw` is the index of the landing slot, the paytable is admin
// data passed in `config`, and nothing else is consulted.
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolve } from '../../src/games/plinko/rules.js';

/**
 * A tiny symmetric board: three cheap edges, three centre slots.
 * Index 0 = leftmost slot.
 */
const PAYTABLE = [8, 2, 1, 1, 2, 8];

/**
 * Builds a config around a paytable.
 *
 * @param {number[]} [paytable]
 * @returns {{ paytable: number[] }}
 */
function makeConfig(paytable = PAYTABLE) {
  return { paytable };
}

/**
 * A single default bet.
 *
 * @param {number} [amount]
 * @returns {Array<{ type: string, amount: number }>}
 */
function makeBets(amount = 10) {
  return [{ type: 'slot', amount }];
}

describe('plinko resolve - happy path', () => {
  it('returns a loss when the landing slot returns nothing', () => {
    const result = resolve(0, { bets: makeBets(), config: makeConfig([0, 1]) });

    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
  });

  it('returns a win and the configured multiplier on a paying slot', () => {
    const result = resolve(0, { bets: makeBets(), config: makeConfig() });

    assert.equal(result.outcome, 'win');
    assert.equal(result.multiplier, 8);
  });

  it('returns a push when the multiplier is exactly 1', () => {
    const result = resolve(2, { bets: makeBets(), config: makeConfig() });

    assert.equal(result.outcome, 'push');
    assert.equal(result.multiplier, 1);
  });

  it('treats a multiplier below 1 as a loss, stake partly returned', () => {
    const result = resolve(0, { bets: makeBets(), config: makeConfig([0.5]) });

    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0.5);
  });

  it('accepts several bets on the same round and aggregates them', () => {
    const bets = [
      { type: 'slot', amount: 10 },
      { type: 'slot', amount: 30 },
    ];

    const result = resolve(5, { bets, config: makeConfig() });

    assert.equal(result.details.totalBet, 40);
    assert.equal(result.details.payout, 320);
    assert.equal(result.multiplier, 8);
  });
});

describe('plinko resolve - boundaries', () => {
  it('settles the leftmost slot (index 0)', () => {
    const result = resolve(0, { bets: makeBets(), config: makeConfig() });

    assert.equal(result.details.slot, 0);
    assert.equal(result.multiplier, PAYTABLE[0]);
  });

  it('settles the rightmost configured slot', () => {
    const lastIndex = PAYTABLE.length - 1;
    const result = resolve(lastIndex, { bets: makeBets(), config: makeConfig() });

    assert.equal(result.details.slot, lastIndex);
    assert.equal(result.multiplier, PAYTABLE[lastIndex]);
  });

  it('rejects a slot beyond the configured board', () => {
    assert.throws(() => resolve(99, { bets: makeBets(), config: makeConfig() }), /no paytable entry/);
  });
});

describe('plinko resolve - purity', () => {
  it('never mutates the arguments it receives', () => {
    const config = makeConfig();
    const bets = makeBets();
    const configSnapshot = JSON.stringify(config);
    const betsSnapshot = JSON.stringify(bets);

    resolve(0, { bets, config });

    assert.equal(JSON.stringify(config), configSnapshot);
    assert.equal(JSON.stringify(bets), betsSnapshot);
  });

  it('returns the same result for the same inputs', () => {
    const first = resolve(4, { bets: makeBets(), config: makeConfig() });
    const second = resolve(4, { bets: makeBets(), config: makeConfig() });

    assert.deepEqual(first, second);
  });

  it('copies the bets into details instead of referencing them', () => {
    const bets = makeBets();
    const result = resolve(0, { bets, config: makeConfig() });

    bets[0].amount = 999;

    assert.equal(result.details.bets[0].amount, 10);
  });
});

describe('plinko resolve - invalid input', () => {
  it('rejects a non-integer raw', () => {
    assert.throws(() => resolve(2.5, { bets: makeBets(), config: makeConfig() }), /raw must be/);
  });

  it('rejects a negative raw', () => {
    assert.throws(() => resolve(-1, { bets: makeBets(), config: makeConfig() }), /raw must be/);
  });

  it('rejects bets that are not an array', () => {
    assert.throws(() => resolve(0, { bets: null, config: makeConfig() }), /bets must be an array/);
  });

  it('rejects an empty bet list', () => {
    assert.throws(() => resolve(0, { bets: [], config: makeConfig() }), /at least one bet/);
  });

  it('rejects a zero-amount bet', () => {
    const bets = [{ type: 'slot', amount: 0 }];
    assert.throws(() => resolve(0, { bets, config: makeConfig() }), /every bet must look like/);
  });

  it('rejects a bet with an unknown type', () => {
    const bets = [{ type: 'left-most', amount: 10 }];
    assert.throws(() => resolve(0, { bets, config: makeConfig() }), /every bet must look like/);
  });

  it('refuses to settle without a paytable rather than inventing one', () => {
    assert.throws(() => resolve(0, { bets: makeBets() }), /config\.paytable is required/);
  });

  it('refuses to settle when config has no paytable array', () => {
    assert.throws(() => resolve(0, { bets: makeBets(), config: {} }), /config\.paytable is required/);
  });
});