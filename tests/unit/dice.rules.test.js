// Unit tests of the dice (craps) rules: /src/games/dice/rules.js
// Contract under test: resolve(raw, { bets, config }) -> gameResult (pure
// function, come / point / done state machine, pass-line paytable).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  resolve,
  diceRules,
  diceTotalFromRawValue,
  DICE_TOTALS,
  PAYTABLE,
  COME,
  POINT,
  DONE,
} from '../../src/games/dice/rules.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const raw = (value) => ({ gameId: 'dice', value, nonce: 0 });
const BETS = [{ type: 'bet', amount: 100 }];

// Midpoint of each total's interval in [0, 1): always maps to that total.
const MIDPOINTS = {};
let previousCumulative = 0;
for (const { total, cumulative } of DICE_TOTALS) {
  MIDPOINTS[total] = (previousCumulative + cumulative) / 2 / 36;
  previousCumulative = cumulative;
}
const rollsOf = (totals) => totals.map((total) => raw(MIDPOINTS[total]));

// ---------------------------------------------------------------------------
// diceTotalFromRawValue: raw value -> dice total mapping
// ---------------------------------------------------------------------------

describe('diceTotalFromRawValue', () => {
  it('maps 0 to the lowest total (2)', () => {
    assert.strictEqual(diceTotalFromRawValue(0), 2);
  });

  it('maps each interval boundary to the upper total', () => {
    const boundaries = [
      [1 / 36, 3],
      [3 / 36, 4],
      [6 / 36, 5],
      [10 / 36, 6],
      [15 / 36, 7],
      [21 / 36, 8],
      [26 / 36, 9],
      [30 / 36, 10],
      [33 / 36, 11],
      [35 / 36, 12],
    ];
    for (const [value, total] of boundaries) {
      assert.strictEqual(diceTotalFromRawValue(value), total, `boundary ${value}`);
    }
  });

  it('maps the midpoint of every interval to its total', () => {
    for (const { total } of DICE_TOTALS) {
      assert.strictEqual(diceTotalFromRawValue(MIDPOINTS[total]), total, `total ${total}`);
    }
  });

  it('maps values just below 1 to 12', () => {
    assert.strictEqual(diceTotalFromRawValue(0.999999), 12);
  });

  it('follows the true two-d6 distribution over [0, 1)', () => {
    const N = 36000; // every one of the 36 equiprobable slices is hit 1000 times
    const counts = new Map();
    for (let i = 0; i < N; i += 1) {
      const total = diceTotalFromRawValue(i / N);
      counts.set(total, (counts.get(total) ?? 0) + 1);
    }
    let previous = 0;
    for (const { total, cumulative } of DICE_TOTALS) {
      const expected = (cumulative - previous) * (N / 36);
      assert.strictEqual(counts.get(total), expected, `total ${total}`);
      previous = cumulative;
    }
  });

  it('rejects malformed raw values', () => {
    for (const bad of [-0.001, 1, NaN, Infinity, undefined, '0.5']) {
      assert.throws(() => diceTotalFromRawValue(bad), TypeError, `value ${String(bad)}`);
    }
  });
});

// ---------------------------------------------------------------------------
// resolve: come-out phase (come -> done directly)
// ---------------------------------------------------------------------------

describe('resolve - come-out phase (come -> done)', () => {
  it('a come-out 7 is a win', () => {
    assert.deepStrictEqual(resolve(rollsOf([7]), { bets: BETS }), {
      outcome: 'win',
      multiplier: 2,
      details: {
        point: null,
        rolls: [7],
        rawValues: [MIDPOINTS[7]],
        totalBet: 100,
        payout: 200,
      },
    });
  });

  it('a come-out 11 is a win', () => {
    const result = resolve(rollsOf([11]), { bets: BETS });
    assert.strictEqual(result.outcome, 'win');
    assert.strictEqual(result.details.point, null);
  });

  it('a come-out 2 is a loss', () => {
    const result = resolve(rollsOf([2]), { bets: BETS });
    assert.strictEqual(result.outcome, 'loss');
    assert.strictEqual(result.multiplier, 0);
    assert.strictEqual(result.details.payout, 0);
  });

  it('a come-out 3 is a loss', () => {
    assert.strictEqual(resolve(rollsOf([3]), { bets: BETS }).outcome, 'loss');
  });

  it('a come-out 12 is a push and the stake is returned', () => {
    const result = resolve(rollsOf([12]), { bets: BETS });
    assert.strictEqual(result.outcome, 'push');
    assert.strictEqual(result.multiplier, 1);
    assert.strictEqual(result.details.payout, 100);
    assert.strictEqual(result.details.point, null);
  });

  it('accepts a single raw result, not wrapped in an array', () => {
    const result = resolve(raw(MIDPOINTS[7]), { bets: BETS });
    assert.deepStrictEqual(result.details.rolls, [7]);
    assert.strictEqual(result.outcome, 'win');
  });
});

// ---------------------------------------------------------------------------
// resolve: come -> point -> done transitions
// ---------------------------------------------------------------------------

describe('resolve - come -> point -> done transitions', () => {
  it('establishes a point on the come-out roll, then a 7 wins', () => {
    const result = resolve(rollsOf([4, 7]), { bets: BETS });
    assert.strictEqual(result.outcome, 'win');
    assert.strictEqual(result.details.point, 4);
    assert.deepStrictEqual(result.details.rolls, [4, 7]);
  });

  it('rolling the point again wins', () => {
    const result = resolve(rollsOf([9, 9]), { bets: BETS });
    assert.strictEqual(result.outcome, 'win');
    assert.strictEqual(result.details.point, 9);
  });

  it('rolling another total after the point loses', () => {
    const result = resolve(rollsOf([5, 8]), { bets: BETS });
    assert.strictEqual(result.outcome, 'loss');
    assert.strictEqual(result.details.payout, 0);
    assert.strictEqual(result.details.point, 5);
  });

  it('the point phase always settles on the first roll after the point', () => {
    assert.strictEqual(resolve(rollsOf([6, 8]), { bets: BETS }).outcome, 'loss');
    assert.strictEqual(resolve(rollsOf([10, 12]), { bets: BETS }).outcome, 'loss');
    assert.strictEqual(resolve(rollsOf([5, 2]), { bets: BETS }).outcome, 'loss');
    assert.strictEqual(resolve(rollsOf([8, 7]), { bets: BETS }).outcome, 'win');
  });

  it('settles every possible point value (4, 5, 6, 8, 9, 10)', () => {
    for (const point of PAYTABLE.pointValues) {
      assert.strictEqual(
        resolve(rollsOf([point, 7]), { bets: BETS }).outcome,
        'win',
        `point ${point}, then 7`
      );
      assert.strictEqual(
        resolve(rollsOf([point, point]), { bets: BETS }).outcome,
        'win',
        `point ${point}, then point`
      );
      const other = point === 4 ? 5 : 4;
      assert.strictEqual(
        resolve(rollsOf([point, other]), { bets: BETS }).outcome,
        'loss',
        `point ${point}, then ${other}`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// resolve: paytable (win / loss / push, multipliers, bets)
// ---------------------------------------------------------------------------

describe('resolve - paytable (win / loss / push, multipliers)', () => {
  it('a win pays 1:1: multiplier 2 (stake included), stake plus profit returned', () => {
    const result = resolve(rollsOf([7]), { bets: [{ type: 'bet', amount: 250 }] });
    assert.strictEqual(result.outcome, 'win');
    assert.strictEqual(result.multiplier, 2);
    assert.strictEqual(result.details.payout, 500);
  });

  it('sums multiple bets into the total bet', () => {
    const bets = [
      { type: 'bet', amount: 100 },
      { type: 'bet', amount: 50 },
    ];
    const result = resolve(rollsOf([4, 4]), { bets });
    assert.strictEqual(result.details.totalBet, 150);
    assert.strictEqual(result.details.payout, 300);
  });

  it('a loss returns nothing (multiplier 0)', () => {
    const result = resolve(rollsOf([4, 9]), { bets: BETS });
    assert.strictEqual(result.outcome, 'loss');
    assert.strictEqual(result.multiplier, 0);
    assert.strictEqual(result.details.payout, 0);
  });

  it('a push returns the stake unchanged (multiplier 1)', () => {
    const result = resolve(rollsOf([12]), { bets: BETS });
    assert.strictEqual(result.outcome, 'push');
    assert.strictEqual(result.multiplier, 1);
    assert.strictEqual(result.details.payout, 100);
  });

  it('keeps payout consistent with the outcome', () => {
    const win = resolve(rollsOf([4, 7]), { bets: BETS });
    assert.strictEqual(win.details.payout, win.details.totalBet * win.multiplier);
    const loss = resolve(rollsOf([4, 9]), { bets: BETS });
    assert.strictEqual(loss.details.payout, 0);
    const push = resolve(rollsOf([12]), { bets: BETS });
    assert.strictEqual(push.details.payout, push.details.totalBet);
  });
});

// ---------------------------------------------------------------------------
// gameResult contract
// ---------------------------------------------------------------------------

describe('gameResult contract', () => {
  it('accepts config without changing the gameResult', () => {
    const expected = resolve(rollsOf([7]), { bets: BETS });
    const result = resolve(rollsOf([7]), { bets: BETS, config: {} });
    assert.deepStrictEqual(result, expected);
  });

  it('always returns a contract gameResult { outcome, multiplier, details } (#159)', () => {
    for (const totals of [[7], [3], [12], [4, 7], [9, 9], [10, 2]]) {
      const result = resolve(rollsOf(totals), { bets: BETS });
      assert.deepStrictEqual(Object.keys(result).sort(), ['details', 'multiplier', 'outcome']);
      assert.ok(['win', 'loss', 'push'].includes(result.outcome));
      assert.ok(Array.isArray(result.details.rolls));
      assert.ok(Array.isArray(result.details.rawValues));
    }
  });

  it('exposes the machine states come / point / done', () => {
    assert.strictEqual(COME, 'come');
    assert.strictEqual(POINT, 'point');
    assert.strictEqual(DONE, 'done');
  });

  it('exposes a diceRules object following the G2 template contract', () => {
    assert.strictEqual(typeof diceRules.resolve, 'function');
    assert.strictEqual(diceRules.resolve, resolve);
  });

  it('is pure: same inputs, same outputs, frozen constants', () => {
    const first = resolve(rollsOf([6, 6]), { bets: BETS });
    const second = resolve(rollsOf([6, 6]), { bets: BETS });
    assert.deepStrictEqual(first, second);
    assert.ok(Object.isFrozen(PAYTABLE));
    assert.ok(Object.isFrozen(DICE_TOTALS));
    assert.ok(Object.isFrozen(diceRules));
  });

  it('does not call Math.random() or import the Core (absolute rules)', () => {
    const source = readFileSync(new URL('../../src/games/dice/rules.js', import.meta.url), 'utf8');
    // Check the code only: comments (including this banner) may quote the rule.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    assert.ok(!code.includes('Math.random'), 'Math.random() is forbidden outside core/rng.js');
    assert.ok(!/from\s+['"][^'"]*core/.test(code), 'no direct Core import in rules.js');
  });
});

// ---------------------------------------------------------------------------
// Edge cases and errors
// ---------------------------------------------------------------------------

describe('edge cases and errors', () => {
  it('throws on an empty raw sequence', () => {
    assert.throws(() => resolve([], { bets: BETS }), TypeError);
  });

  it('throws when a raw result is missing its numeric value', () => {
    assert.throws(
      () => resolve([raw(MIDPOINTS[4]), { gameId: 'dice', nonce: 1 }], { bets: BETS }),
      TypeError
    );
  });

  it('throws when the point phase cannot finish with the provided rolls', () => {
    assert.throws(() => resolve(rollsOf([4]), { bets: BETS }), RangeError);
  });

  it('throws when the come-out establishes a point and no roll follows', () => {
    assert.throws(() => resolve(rollsOf([10]), { bets: BETS }), RangeError);
  });

  it('throws on surplus rolls after the terminal roll', () => {
    assert.throws(() => resolve(rollsOf([7, 4]), { bets: BETS }), RangeError);
    assert.throws(() => resolve(rollsOf([12, 7]), { bets: BETS }), RangeError);
  });
});
