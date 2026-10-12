// ---------------------------------------------------------------------------
// Unit tests - Wheel of Fortune rules (src/games/wheel/rules.js)
// ---------------------------------------------------------------------------
// T26 - Groupe 2. Pure settlement of a Wheel of Fortune round from a segment.
//
// These tests deliberately pin the CONTRACT of the module before any Core is
// wired to it: `raw` is the drawn segment, the layout and the paytable are
// admin data passed in `config`, and nothing else is consulted.
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolve } from '../../src/games/wheel/rules.js';

/**
 * A small illustrative wheel. It is test fixture data only: in the real game
 * this layout comes from the admin configuration, never from the source.
 */
const SEGMENTS = [
  { id: 's1', label: '1', color: 'red' },
  { id: 's2', label: '2', color: 'black' },
  { id: 's3', label: '3', color: 'red' },
  { id: 's4', label: '4', color: 'black' },
];

/**
 * Paytable keyed by bet type. Each entry names the segment fields that must
 * match, and the total return multiplier when they do.
 */
const PAYTABLE = {
  red: { match: { color: 'red' }, multiplier: 2 },
  black: { match: { color: 'black' }, multiplier: 2 },
  label3: { match: { label: '3' }, multiplier: 5 },
  anything: { match: {}, multiplier: 1.5 },
  gone: { match: { color: 'red' }, multiplier: 0 },
};

/**
 * Builds a config. The wheel layout is NOT part of it: the rules never need
 * to know it, and requiring it would force an identity rule against the Core's
 * `raw`.
 *
 * @param {Record<string, object>} [paytable]
 * @returns {object}
 */
function makeConfig(paytable = PAYTABLE) {
  return { paytable };
}

/**
 * A single default bet.
 *
 * @param {string} [type]
 * @param {number} [amount]
 * @returns {Array<{ type: string, amount: number }>}
 */
function makeBets(type = 'red', amount = 10) {
  return [{ type, amount }];
}

describe('wheel resolve - happy path', () => {
  it('returns a win when the drawn segment matches the bet', () => {
    const result = resolve(SEGMENTS[0], { bets: makeBets('red'), config: makeConfig() });

    assert.equal(result.outcome, 'win');
    assert.equal(result.multiplier, 2);
  });

  it('returns a loss when the drawn segment does not match the bet', () => {
    const result = resolve(SEGMENTS[1], { bets: makeBets('red'), config: makeConfig() });

    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
  });

  it('returns a push when a matched bet returns exactly the stake', () => {
    const paytable = { even: { match: {}, multiplier: 1 } };
    const result = resolve(SEGMENTS[0], { bets: makeBets('even'), config: makeConfig(paytable) });

    assert.equal(result.outcome, 'push');
    assert.equal(result.multiplier, 1);
  });

  it('matches on label as well as on color', () => {
    const result = resolve(SEGMENTS[2], { bets: makeBets('label3'), config: makeConfig() });

    assert.equal(result.outcome, 'win');
    assert.equal(result.multiplier, 5);
  });

  it('supports a bet whose match object is empty, matching every segment', () => {
    const result = resolve(SEGMENTS[3], { bets: makeBets('anything'), config: makeConfig() });

    assert.equal(result.outcome, 'win');
    assert.equal(result.multiplier, 1.5);
  });

  it('settles a matched bet that returns nothing as a loss', () => {
    const result = resolve(SEGMENTS[0], { bets: makeBets('gone'), config: makeConfig() });

    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
  });
});

describe('wheel resolve - several bets on one spin', () => {
  it('aggregates a winning and a losing bet into one aggregate multiplier', () => {
    const bets = [
      { type: 'red', amount: 10 },
      { type: 'black', amount: 10 },
    ];

    const result = resolve(SEGMENTS[0], { bets, config: makeConfig() });

    // red wins 2x -> 20 returned, black loses -> 0, total stake 20.
    assert.equal(result.details.payout, 20);
    assert.equal(result.multiplier, 1);
    assert.equal(result.outcome, 'push');
  });

  it('reports a loss when every bet loses', () => {
    const bets = [
      { type: 'black', amount: 5 },
      { type: 'label3', amount: 5 },
    ];

    // SEGMENTS[0] is red and labelled '1', so neither bet matches.
    const result = resolve(SEGMENTS[0], { bets, config: makeConfig() });

    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
  });

  it('marks each bet individually in details', () => {
    const bets = [
      { type: 'red', amount: 10 },
      { type: 'black', amount: 10 },
    ];

    const result = resolve(SEGMENTS[0], { bets, config: makeConfig() });

    assert.equal(result.details.bets[0].won, true);
    assert.equal(result.details.bets[1].won, false);
  });
});

describe('wheel resolve - boundaries', () => {
  it('settles the first segment of the configured wheel', () => {
    const result = resolve(SEGMENTS[0], { bets: makeBets('red'), config: makeConfig() });

    assert.deepEqual(result.details.segment, SEGMENTS[0]);
  });

  it('settles the last segment of the configured wheel', () => {
    const last = SEGMENTS[SEGMENTS.length - 1];
    const result = resolve(last, { bets: makeBets('black'), config: makeConfig() });

    assert.equal(result.outcome, 'win');
    assert.equal(result.multiplier, 2);
  });

  it('ignores segment fields the paytable does not name', () => {
    const result = resolve(SEGMENTS[0], { bets: makeBets('red'), config: makeConfig() });

    // 'red' matches on color only, the id and label are irrelevant.
    assert.equal(result.outcome, 'win');
  });
});

describe('wheel resolve - purity', () => {
  it('never mutates the arguments it receives', () => {
    const config = makeConfig();
    const bets = makeBets();
    const configSnapshot = JSON.stringify(config);
    const betsSnapshot = JSON.stringify(bets);

    resolve(SEGMENTS[0], { bets, config });

    assert.equal(JSON.stringify(config), configSnapshot);
    assert.equal(JSON.stringify(bets), betsSnapshot);
  });

  it('returns the same result for the same inputs', () => {
    const first = resolve(SEGMENTS[2], { bets: makeBets('label3'), config: makeConfig() });
    const second = resolve(SEGMENTS[2], { bets: makeBets('label3'), config: makeConfig() });

    assert.deepEqual(first, second);
  });

  it('copies the bets into details instead of referencing them', () => {
    const bets = makeBets('red');
    const result = resolve(SEGMENTS[0], { bets, config: makeConfig() });

    bets[0].amount = 999;

    assert.equal(result.details.bets[0].amount, 10);
  });
});

describe('wheel resolve - invalid input', () => {
  it('rejects a raw that is not a segment object', () => {
    assert.throws(() => resolve(3, { bets: makeBets(), config: makeConfig() }), /raw must be/);
    assert.throws(() => resolve(null, { bets: makeBets(), config: makeConfig() }), /raw must be/);
  });

  it('rejects bets that are not an array', () => {
    assert.throws(
      () => resolve(SEGMENTS[0], { bets: undefined, config: makeConfig() }),
      /bets must be an array/
    );
  });

  it('rejects an empty bet list', () => {
    assert.throws(() => resolve(SEGMENTS[0], { bets: [], config: makeConfig() }), /at least one bet/);
  });

  it('rejects a zero-amount bet', () => {
    const bets = [{ type: 'red', amount: 0 }];
    assert.throws(
      () => resolve(SEGMENTS[0], { bets, config: makeConfig() }),
      /every bet must look like/
    );
  });

  it('rejects a bet type that is absent from the paytable', () => {
    assert.throws(
      () => resolve(SEGMENTS[0], { bets: makeBets('purple'), config: makeConfig() }),
      /unknown bet type 'purple'/
    );
  });

  it('rejects a paytable entry without a match object', () => {
    const paytable = { broken: { multiplier: 2 } };
    assert.throws(
      () => resolve(SEGMENTS[0], { bets: makeBets('broken'), config: makeConfig(paytable) }),
      /has no 'match' object/
    );
  });

  it('rejects a paytable entry without a numeric multiplier', () => {
    const paytable = { broken: { match: {} } };
    assert.throws(
      () => resolve(SEGMENTS[0], { bets: makeBets('broken'), config: makeConfig(paytable) }),
      /has no numeric 'multiplier'/
    );
  });

  it('refuses to settle without a paytable rather than inventing one', () => {
    assert.throws(() => resolve(SEGMENTS[0], { bets: makeBets() }), /config is required/);
  });

  it('refuses to settle without a paytable even if a layout is supplied', () => {
    assert.throws(
      () => resolve(SEGMENTS[0], { bets: makeBets(), config: { segments: SEGMENTS } }),
      /config\.paytable/
    );
  });
});