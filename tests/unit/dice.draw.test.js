import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { draw } from '../../src/games/dice/draw.js';

describe('dice draw', () => {
  it('draws one come-out roll with exactly two integer faces in [1, 6]', () => {
    const values = [3, 4];
    const calls = [];
    const core = {
      tirageEntier(min, max) {
        calls.push([min, max]);
        return values.shift();
      },
    };

    const result = draw(core);

    assert.deepStrictEqual(result, [[3, 4]]);
    assert.ok(result.flat().every((face) => Number.isInteger(face) && face >= 1 && face <= 6));
    assert.deepStrictEqual(calls, Array.from({ length: 2 }, () => [1, 6]));
    assert.deepStrictEqual(values, []);
  });

  it('draws another roll after establishing a point and stops when the point is made', () => {
    const values = [2, 2, 3, 3, 1, 3];
    const calls = [];
    const core = {
      tirageEntier(min, max) {
        calls.push([min, max]);
        return values.shift();
      },
    };

    assert.deepStrictEqual(draw(core), [[2, 2], [3, 3], [1, 3]]);
    assert.equal(calls.length, 6);
    assert.deepStrictEqual(calls, Array.from({ length: 6 }, () => [1, 6]));
    assert.deepStrictEqual(values, []);
  });

  it('stops after seven-out and returns every roll in order', () => {
    const values = [2, 3, 3, 4];
    const calls = [];
    const core = {
      tirageEntier(min, max) {
        calls.push([min, max]);
        return values.shift();
      },
    };

    assert.deepStrictEqual(draw(core), [[2, 3], [3, 4]]);
    assert.equal(calls.length, 2 * 2);
    assert.deepStrictEqual(calls, Array.from({ length: 4 }, () => [1, 6]));
    assert.deepStrictEqual(values, []);
  });

  it('stops after immediate come-out wins and losses', () => {
    for (const faces of [[3, 4], [1, 1]]) {
      const values = [...faces];
      const calls = [];
      const core = {
        tirageEntier(min, max) {
          calls.push([min, max]);
          return values.shift();
        },
      };

      assert.deepStrictEqual(draw(core), [faces]);
      assert.equal(calls.length, 2);
      assert.deepStrictEqual(calls, [[1, 6], [1, 6]]);
    }
  });

  it('propagates Core RNG errors', () => {
    const error = new Error('RNG failed');
    const core = { tirageEntier: () => { throw error; } };

    assert.throws(() => draw(core), (caught) => caught === error);
  });

  it('requires the Core integer-draw primitive', () => {
    assert.throws(() => draw({}), TypeError);
    assert.throws(() => draw(null), TypeError);
  });

  it('rejects non-integer faces returned by the Core', () => {
    assert.throws(() => draw({ tirageEntier: () => 3.5 }), TypeError);
  });

  it('rejects integer faces outside [1, 6]', () => {
    for (const face of [0, 7]) {
      assert.throws(() => draw({ tirageEntier: () => face }), RangeError);
    }
  });

  it('draws both faces before validating the completed roll', () => {
    const values = [1, 7];
    const calls = [];
    const core = {
      tirageEntier(min, max) {
        calls.push([min, max]);
        return values.shift();
      },
    };

    assert.throws(() => draw(core), RangeError);
    assert.equal(calls.length, 2);
    assert.deepStrictEqual(calls, [[1, 6], [1, 6]]);
  });
});
