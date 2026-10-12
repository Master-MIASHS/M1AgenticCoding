import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  resolve,
  diceRules,
  PAYTABLE,
  COME,
  POINT,
  DONE,
} from '../../src/games/dice/rules.js';

const CONFIG = { paytable: { pass: 2 } };
const BETS = [{ type: 'pass', amount: 100 }];
const DICE_FOR_TOTAL = new Map([
  [2, [1, 1]],
  [3, [1, 2]],
  [4, [1, 3]],
  [5, [1, 4]],
  [6, [1, 5]],
  [7, [1, 6]],
  [8, [2, 6]],
  [9, [3, 6]],
  [10, [4, 6]],
  [11, [5, 6]],
  [12, [6, 6]],
]);
const rollsOf = (totals) => totals.map((total) => DICE_FOR_TOTAL.get(total));
const resolveTotals = (totals, options = {}) =>
  resolve(rollsOf(totals), { bets: BETS, config: CONFIG, ...options });

describe('resolve - craps come-out and point rules', () => {
  it('wins on a come-out 7 or 11', () => {
    for (const total of [7, 11]) {
      assert.equal(resolveTotals([total]).outcome, 'win');
    }
  });

  it('loses on a come-out 2, 3, or 12 (no push)', () => {
    for (const total of [2, 3, 12]) {
      const result = resolveTotals([total]);
      assert.equal(result.outcome, 'loss');
      assert.equal(result.multiplier, 0);
      assert.equal(result.details.payout, 0);
      assert.equal(result.details.point, null);
    }
  });

  it('establishes a point on every other come-out total', () => {
    for (const total of [4, 5, 6, 8, 9, 10]) {
      assert.throws(() => resolveTotals([total]), RangeError);
      assert.equal(resolveTotals([total, total]).details.point, total);
    }
  });

  it('wins when the established point is rolled again', () => {
    for (const point of PAYTABLE.pointValues) {
      const result = resolveTotals([point, point]);
      assert.equal(result.outcome, 'win');
      assert.equal(result.details.point, point);
    }
  });

  it('loses on seven-out after a point is established', () => {
    for (const point of PAYTABLE.pointValues) {
      const result = resolveTotals([point, 7]);
      assert.equal(result.outcome, 'loss');
      assert.equal(result.details.point, point);
    }
  });

  it('continues through other totals until the point or seven resolves the round', () => {
    const result = resolveTotals([5, 8, 6, 5]);
    assert.equal(result.outcome, 'win');
    assert.deepEqual(result.details.rolls, [5, 8, 6, 5]);
  });
});

describe('resolve - pass bet and configurable multiplier', () => {
  it('uses config.paytable.pass as the winning total-return multiplier', () => {
    const result = resolveTotals([7], {
      bets: [{ type: 'pass', amount: 250 }],
      config: { paytable: { pass: 2.5 } },
    });
    assert.equal(result.multiplier, 2.5);
    assert.equal(result.details.payout, 625);
  });

  it('returns zero for a loss', () => {
    const result = resolveTotals([12]);
    assert.equal(result.multiplier, 0);
    assert.equal(result.details.payout, 0);
  });

  it('sums multiple pass bets and settles the full amount', () => {
    const result = resolveTotals([7], {
      bets: [
        { type: 'pass', amount: 100 },
        { type: 'pass', amount: 50 },
      ],
    });
    assert.equal(result.details.totalBet, 150);
    assert.equal(result.details.payout, 300);
  });

  it('rejects a missing, non-finite, or non-winning pass multiplier', () => {
    for (const config of [
      undefined,
      {},
      { paytable: {} },
      { paytable: { pass: undefined } },
      { paytable: { pass: NaN } },
      { paytable: { pass: Infinity } },
      { paytable: { pass: 1 } },
      { paytable: { pass: 0 } },
    ]) {
      assert.throws(() => resolve(rollsOf([7]), { bets: BETS, config }), TypeError);
    }
  });

  it('requires pass bets with positive finite amounts', () => {
    for (const bets of [
      undefined,
      [],
      [{ type: 'other', amount: 10 }],
      [{ type: 'pass', amount: 0 }],
      [{ type: 'pass', amount: NaN }],
      [{ type: 'pass', amount: Infinity }],
    ]) {
      assert.throws(() => resolve(rollsOf([7]), { bets, config: CONFIG }), TypeError);
    }
  });
});

describe('gameResult contract and raw dice validation', () => {
  it('returns the details shape expected by G3 and the Core', () => {
    const result = resolve([[2, 2], [1, 3]], { bets: BETS, config: CONFIG });
    assert.deepEqual(Object.keys(result).sort(), ['details', 'multiplier', 'outcome']);
    assert.equal(result.outcome, 'win');
    assert.equal(result.multiplier, 2);
    assert.deepEqual(result.details, {
      point: 4,
      rolls: [4, 4],
      rawValues: [[2, 2], [1, 3]],
      dice: [[2, 2], [1, 3]],
      totalBet: 100,
      payout: 200,
    });
  });

  it('accepts only non-empty sequences of two integer faces in [1, 6]', () => {
    for (const raw of [undefined, null, [], [7], [[1]], [[1, 2, 3]], [[1.5, 5]], [['2', 5]]]) {
      assert.throws(() => resolve(raw, { bets: BETS, config: CONFIG }), TypeError);
    }
    for (const raw of [[[0, 6]], [[1, 7]]]) {
      assert.throws(() => resolve(raw, { bets: BETS, config: CONFIG }), RangeError);
    }
  });

  it('rejects incomplete rounds and rolls supplied after a terminal result', () => {
    assert.throws(() => resolve([[1, 3]], { bets: BETS, config: CONFIG }), RangeError);
    assert.throws(() => resolve([[1, 3], [1, 4]], { bets: BETS, config: CONFIG }), RangeError);
    assert.throws(() => resolve([[1, 6], [1, 1]], { bets: BETS, config: CONFIG }), RangeError);
  });

  it('preserves the rules facade and remains pure and deterministic', () => {
    const input = rollsOf([4, 8, 4]);
    const before = structuredClone(input);
    assert.deepEqual(
      resolve(input, { bets: BETS, config: CONFIG }),
      resolve(input, { bets: BETS, config: CONFIG })
    );
    assert.deepEqual(input, before);
    assert.equal(diceRules.resolve, resolve);
    assert.deepEqual([COME, POINT, DONE], ['come', 'point', 'done']);
  });

  it('does not access randomness or import the Core', () => {
    const source = readFileSync(new URL('../../src/games/dice/rules.js', import.meta.url), 'utf8');
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.ok(!code.includes('Math.random'));
    assert.ok(!/from\s+['"][^'"]*core/.test(code));
  });
});
