// Unit tests - Core economy (src/core/economy.js)
// Verifies the public contract of play / balance / relance helpers and the
// invariant "XP is never lost" on the XP granted by a play.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { play, getBalance, claimDailyBonus, requestLoan } from '../../src/core/economy.js';
import { getState } from '../../src/core/state.js';

test('play returns the documented delta { newBalance, xpGained, leveledUp }', () => {
  const result = play('slots', 10, { value: 0.42 });
  assert.equal(typeof result.newBalance, 'number');
  assert.equal(typeof result.xpGained, 'number');
  assert.equal(typeof result.leveledUp, 'boolean');
});

test('play never grants negative XP (XP is never lost)', () => {
  const result = play('dice', 5, { value: 0.1 });
  assert.ok(result.xpGained >= 0, `xpGained must be >= 0, got ${result.xpGained}`);
});

test('play never returns a negative balance', () => {
  const result = play('roulette', 100, { value: 0.99 });
  assert.ok(result.newBalance >= 0, `newBalance must be >= 0, got ${result.newBalance}`);
});

test('getBalance is consistent with the global state', () => {
  assert.equal(getBalance(), getState().balance);
});

test('claimDailyBonus returns a positive fictitious amount', () => {
  const bonus = claimDailyBonus();
  assert.equal(typeof bonus, 'number');
  assert.ok(bonus > 0, 'daily bonus must be positive');
});

test('requestLoan returns the documented shape', () => {
  const loan = requestLoan(250);
  assert.equal(typeof loan.approved, 'boolean');
  assert.equal(loan.amount, 250);
});
