// Unit tests - Core RNG (src/core/rng.js)
// Verifies the absolute rules around randomness:
//  - roll() produces RAW values only: it never decides a win or a loss.
//  - The contract { gameId, value, nonce } is stable for all games.
// (The "no Math.random outside the Core" rule is enforced by
// architecture.test.js.)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { roll } from '../../src/core/rng.js';

test('roll returns the documented contract { gameId, value, nonce }', () => {
  const r = roll('slots', {});
  assert.equal(r.gameId, 'slots');
  assert.equal(typeof r.value, 'number');
  assert.equal(typeof r.nonce, 'number');
  assert.deepEqual(Object.keys(r).sort(), ['gameId', 'nonce', 'value']);
});

test('roll value is a raw float in [0, 1)', () => {
  for (let i = 0; i < 100; i += 1) {
    const { value } = roll('dice');
    assert.ok(Number.isFinite(value), 'value must be finite');
    assert.ok(value >= 0 && value < 1, `value out of range: ${value}`);
  }
});

test('roll nonce is an integer in [0, 1000000)', () => {
  for (let i = 0; i < 100; i += 1) {
    const { nonce } = roll('blackjack');
    assert.ok(Number.isInteger(nonce), 'nonce must be an integer');
    assert.ok(nonce >= 0 && nonce < 1000000, `nonce out of range: ${nonce}`);
  }
});

test('roll propagates the requesting gameId', () => {
  for (const gameId of ['slots', 'roulette', 'video-poker']) {
    assert.equal(roll(gameId).gameId, gameId);
  }
});

test('roll never decides a win or a loss (no verdict field)', () => {
  const r = roll('slots');
  assert.ok(!('win' in r), 'roll must not return a win field');
  assert.ok(!('loss' in r), 'roll must not return a loss field');
  assert.ok(!('won' in r), 'roll must not return a won field');
  assert.ok(!('result' in r), 'roll must not return a result field');
});

test('consecutive rolls differ (raw randomness)', () => {
  const a = roll('plinko');
  const b = roll('plinko');
  assert.notDeepEqual([a.value, a.nonce], [b.value, b.nonce]);
});
