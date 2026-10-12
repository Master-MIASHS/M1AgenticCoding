import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { advanceCrapsRound } from '../../src/games/dice/craps.js';

describe('advanceCrapsRound', () => {
  it('wins on a come-out 7 or 11', () => {
    for (const total of [7, 11]) {
      assert.deepStrictEqual(advanceCrapsRound(null, total), {
        point: null,
        outcome: 'win',
        needsRoll: false,
      });
    }
  });

  it('loses on a come-out 2, 3, or 12', () => {
    for (const total of [2, 3, 12]) {
      assert.deepStrictEqual(advanceCrapsRound(null, total), {
        point: null,
        outcome: 'loss',
        needsRoll: false,
      });
    }
  });

  it('establishes a point for every other come-out total', () => {
    for (const total of [4, 5, 6, 8, 9, 10]) {
      assert.deepStrictEqual(advanceCrapsRound(null, total), {
        point: total,
        outcome: null,
        needsRoll: true,
      });
    }
  });

  it('wins when the established point is rolled again', () => {
    assert.deepStrictEqual(advanceCrapsRound(8, 8), {
      point: 8,
      outcome: 'win',
      needsRoll: false,
    });
  });

  it('loses on seven-out after the point is established', () => {
    assert.deepStrictEqual(advanceCrapsRound(8, 7), {
      point: 8,
      outcome: 'loss',
      needsRoll: false,
    });
  });

  it('continues rolling after any total other than the point or seven', () => {
    assert.deepStrictEqual(advanceCrapsRound(8, 6), {
      point: 8,
      outcome: null,
      needsRoll: true,
    });
  });

  it('rejects invalid points and totals', () => {
    for (const point of [2, 7, 11, 4.5]) {
      assert.throws(() => advanceCrapsRound(point, 7), TypeError);
    }
    for (const total of [1, 13, 4.5, NaN]) {
      assert.throws(() => advanceCrapsRound(null, total), TypeError);
    }
  });
});
