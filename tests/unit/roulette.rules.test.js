// ---------------------------------------------------------------------------
// Unit tests - Roulette rules (src/games/roulette/rules.js)
// ---------------------------------------------------------------------------
// T191 - Groupe 2, vague 2. Pure settlement of a roulette spin from a drawn
// number (0..36). Multiple bets of different types are settled together on the
// same spin (famille B, #73 / PR #135 : option A).
//
// These tests deliberately pin the CONTRACT of the module before any Core is
// wired to it: `raw` is the drawn number, the winning numbers and the payouts
// are admin data passed in `config`, and nothing else is consulted.
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolve } from '../../src/games/roulette/rules.js';
import { draw } from '../../src/games/roulette/index.js';

/**
 * European roulette numbers. Test fixture data only: in the real game this
 * layout comes from the admin configuration, never from the source.
 */
const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACKS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
const EVENS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36];

function numbers(min, max) {
  const out = [];
  for (let n = min; n <= max; n += 1) out.push(n);
  return out;
}

/**
 * Paytable keyed by bet type. Each entry names the numbers that win and the
 * total return multiplier when the drawn number is among them.
 */
const PAYTABLE = {
  'straight-17': { match: [17], multiplier: 36 },
  red: { match: REDS, multiplier: 2 },
  black: { match: BLACKS, multiplier: 2 },
  even: { match: EVENS, multiplier: 2 },
  low: { match: numbers(1, 18), multiplier: 2 },
  high: { match: numbers(19, 36), multiplier: 2 },
  'dozen-1': { match: numbers(1, 12), multiplier: 3 },
  refund: { match: [17], multiplier: 1 },
};

/**
 * Builds a config. The wheel layout is NOT part of it: only the paytable.
 *
 * @param {Record<string, object>} [bets]
 * @returns {object}
 */
function makeConfig(bets = PAYTABLE) {
  return { bets };
}

/**
 * A single default bet.
 *
 * @param {string} [type]
 * @param {number} [amount]
 * @returns {Array<{ type: string, amount: number }>}
 */
function makeBets(type = 'straight-17', amount = 10) {
  return [{ type, amount }];
}

describe('roulette resolve - happy path', () => {
  it('returns a win when the drawn number is in the bet match', () => {
    const result = resolve(17, { bets: makeBets('straight-17'), config: makeConfig() });

    assert.equal(result.outcome, 'win');
    assert.equal(result.multiplier, 36);
  });

  it('returns a loss when the drawn number is not in the bet match', () => {
    const result = resolve(17, { bets: makeBets('red'), config: makeConfig() });

    // 17 is black in the European layout, so the red bet loses.
    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
  });

  it('returns a push when a matched bet returns exactly the stake', () => {
    const result = resolve(17, { bets: makeBets('refund'), config: makeConfig() });

    assert.equal(result.outcome, 'push');
    assert.equal(result.multiplier, 1);
  });

  it('wins on an even-money bet when the number is in its match', () => {
    const result = resolve(8, { bets: makeBets('even'), config: makeConfig() });

    assert.equal(result.outcome, 'win');
    assert.equal(result.multiplier, 2);
  });

  it('settles a dozen bet with its own multiplier', () => {
    const result = resolve(5, { bets: makeBets('dozen-1'), config: makeConfig() });

    assert.equal(result.outcome, 'win');
    assert.equal(result.multiplier, 3);
  });

  it('settles a matched bet that returns nothing as a loss', () => {
    const paytable = { gone: { match: [17], multiplier: 0 } };
    const result = resolve(17, { bets: makeBets('gone'), config: makeConfig(paytable) });

    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
  });
});

describe('roulette resolve - several bets on one spin', () => {
  it('aggregates a winning and a losing bet into one aggregate multiplier', () => {
    const bets = [
      { type: 'straight-17', amount: 5 },
      { type: 'red', amount: 10 },
    ];

    // 5 x 36 reversed, red loses (17 is black) -> 0, total stake 15.
    const result = resolve(17, { bets, config: makeConfig() });

    assert.equal(result.details.payout, 180);
    assert.equal(result.multiplier, 12);
    assert.equal(result.outcome, 'win');
  });

  it('reports a loss when every bet loses', () => {
    const bets = [
      { type: 'black', amount: 5 },
      { type: 'even', amount: 5 },
    ];

    // 1 is red and odd, so neither bet matches.
    const result = resolve(1, { bets, config: makeConfig() });

    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
  });

  it('marks each bet individually in details', () => {
    const bets = [
      { type: 'straight-17', amount: 5 },
      { type: 'even', amount: 10 },
    ];

    const result = resolve(17, { bets, config: makeConfig() });

    assert.equal(result.details.bets[0].won, true);
    assert.equal(result.details.bets[1].won, false);
  });
});

describe('roulette resolve - boundaries', () => {
  it('settles the drawn number 0 as a loss, with no bet matching it', () => {
    const result = resolve(0, { bets: makeBets('red'), config: makeConfig() });

    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
  });

  it('settles the highest number 36', () => {
    const result = resolve(36, { bets: makeBets('even'), config: makeConfig() });

    assert.equal(result.outcome, 'win');
    assert.equal(result.multiplier, 2);
  });

  it('settles number 1 as a low and odd outcome', () => {
    const result = resolve(1, { bets: makeBets('low'), config: makeConfig() });

    assert.equal(result.outcome, 'win');
    assert.equal(result.multiplier, 2);
  });
});

describe('roulette resolve - purity', () => {
  it('never mutates the arguments it receives', () => {
    const config = makeConfig();
    const bets = makeBets();
    const configSnapshot = JSON.stringify(config);
    const betsSnapshot = JSON.stringify(bets);

    resolve(17, { bets, config });

    assert.equal(JSON.stringify(config), configSnapshot);
    assert.equal(JSON.stringify(bets), betsSnapshot);
  });

  it('returns the same result for the same inputs', () => {
    const first = resolve(17, { bets: makeBets('straight-17'), config: makeConfig() });
    const second = resolve(17, { bets: makeBets('straight-17'), config: makeConfig() });

    assert.deepEqual(first, second);
  });

  it('copies the bets into details instead of referencing them', () => {
    const bets = makeBets('straight-17');
    const result = resolve(17, { bets, config: makeConfig() });

    bets[0].amount = 999;

    assert.equal(result.details.bets[0].amount, 10);
  });
});

describe('roulette resolve - invalid input', () => {
  it('rejects a raw that is not an integer between 0 and 36', () => {
    for (const bad of [-1, 37, 0.5, '17', null, undefined]) {
      assert.throws(() => resolve(bad, { bets: makeBets(), config: makeConfig() }), /raw must be/);
    }
  });

  it('rejects bets that are not an array', () => {
    assert.throws(
      () => resolve(17, { bets: undefined, config: makeConfig() }),
      /bets must be an array/
    );
  });

  it('rejects an empty bet list', () => {
    assert.throws(() => resolve(17, { bets: [], config: makeConfig() }), /at least one bet/);
  });

  it('rejects a zero-amount bet', () => {
    const bets = [{ type: 'straight-17', amount: 0 }];
    assert.throws(
      () => resolve(17, { bets, config: makeConfig() }),
      /every bet must look like/
    );
  });

  it('rejects a bet type that is absent from the paytable', () => {
    assert.throws(
      () => resolve(17, { bets: makeBets('purple'), config: makeConfig() }),
      /unknown bet type 'purple'/
    );
  });

  it('rejects a paytable entry without a match list', () => {
    const paytable = { broken: { multiplier: 2 } };
    assert.throws(
      () => resolve(17, { bets: makeBets('broken'), config: makeConfig(paytable) }),
      /has no 'match' list/
    );
  });

  it('rejects a paytable entry whose match is not a list', () => {
    const paytable = { broken: { match: 17, multiplier: 2 } };
    assert.throws(
      () => resolve(17, { bets: makeBets('broken'), config: makeConfig(paytable) }),
      /has no 'match' list/
    );
  });

  it('rejects a paytable entry without a numeric multiplier', () => {
    const paytable = { broken: { match: [17] } };
    assert.throws(
      () => resolve(17, { bets: makeBets('broken'), config: makeConfig(paytable) }),
      /has no numeric 'multiplier'/
    );
  });

  it('rejects a paytable entry with a negative multiplier', () => {
    const paytable = { broken: { match: [17], multiplier: -2 } };
    assert.throws(
      () => resolve(17, { bets: makeBets('broken'), config: makeConfig(paytable) }),
      /negative 'multiplier'/
    );
  });

  it('refuses to settle without a paytable rather than inventing one', () => {
    assert.throws(() => resolve(17, { bets: makeBets() }), /config is required/);
  });

  it('refuses to settle without a paytable even if unrelated config is supplied', () => {
    assert.throws(
      () => resolve(17, { bets: makeBets(), config: { houseEdge: 0.027 } }),
      /config\.bets/
    );
  });
});

describe('roulette draw (index.js)', () => {
  it('calls core.tirageEntier(0, 36) exactly once', () => {
    const calls = [];
    const core = {
      tirageEntier: (min, max) => {
        calls.push([min, max]);
        return 17;
      },
    };

    const drawn = draw(core, { bets: makeBets() });

    assert.equal(drawn, 17);
    assert.deepEqual(calls, [[0, 36]]);
  });
});