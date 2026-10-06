import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSettlement, getBalance, play } from './economy.js';

describe('calculateSettlement', () => {
  it('settles losses, returned stakes and wins with the stake included in payout', () => {
    assert.deepEqual(calculateSettlement(100, 10, { outcome: 'loss', multiplier: 0 }),
      { newBalance: 90, payout: 0, netGain: -10 });
    assert.deepEqual(calculateSettlement(100, 10, { outcome: 'push', multiplier: 1 }),
      { newBalance: 100, payout: 10, netGain: 0 });
    assert.deepEqual(calculateSettlement(100, 10, { outcome: 'win', multiplier: 2 }),
      { newBalance: 110, payout: 20, netGain: 10 });
  });

  it('supports a full-balance stake and fractional aggregate multipliers', () => {
    assert.equal(calculateSettlement(100, 100, { outcome: 'loss', multiplier: 0 }).newBalance, 0);
    assert.deepEqual(calculateSettlement(100, 20, { outcome: 'loss', multiplier: 0.5 }),
      { newBalance: 90, payout: 10, netGain: -10 });
  });

  it('settles multiple bets from their total stake and aggregate multiplier', () => {
    assert.deepEqual(calculateSettlement(100, 15,
      { outcome: 'win', multiplier: 20 / 15, details: { bets: [] } }),
    { newBalance: 105, payout: 20, netGain: 5 });
    assert.deepEqual(calculateSettlement(100, 15,
      { outcome: 'win', multiplier: 180 / 15, details: { bets: [] } }),
    { newBalance: 265, payout: 180, netGain: 165 });
  });

  it('rounds the aggregate payout once to two decimal places', () => {
    assert.deepEqual(calculateSettlement(100, 10, { outcome: 'win', multiplier: 1.2345 }),
      { newBalance: 102.35, payout: 12.35, netGain: 2.35 });
    assert.deepEqual(calculateSettlement(100, 10, { outcome: 'loss', multiplier: 0.2345 }),
      { newBalance: 92.35, payout: 2.35, netGain: -7.65 });
  });

  it('keeps the outcome semantics used by the G2 rules before rounding', () => {
    assert.deepEqual(calculateSettlement(100, 1, { outcome: 'loss', multiplier: 0.5 }),
      { newBalance: 99.5, payout: 0.5, netGain: -0.5 });
    assert.deepEqual(calculateSettlement(100, 3, { outcome: 'win', multiplier: 1.1 }),
      { newBalance: 100.3, payout: 3.3, netGain: 0.3 });
  });

  it('rejects an outcome inconsistent with the aggregate multiplier', () => {
    assert.throws(() => calculateSettlement(100, 10,
      { outcome: 'loss', multiplier: 2 }), RangeError);
    assert.throws(() => calculateSettlement(100, 10,
      { outcome: 'win', multiplier: 0.5 }), RangeError);
    assert.throws(() => calculateSettlement(100, 10,
      { outcome: 'push', multiplier: 1.1 }), RangeError);
  });

  it('rejects invalid stakes without changing the shared balance', () => {
    const before = getBalance();
    for (const bet of [NaN, Infinity, -Infinity, '10', null, undefined]) {
      assert.throws(() => calculateSettlement(100, bet, { outcome: 'win', multiplier: 2 }), TypeError);
    }
    for (const bet of [0, -1, 101]) {
      assert.throws(() => calculateSettlement(100, bet, { outcome: 'win', multiplier: 2 }), RangeError);
    }
    assert.equal(getBalance(), before);
  });

  it('rejects invalid balances, results and multipliers', () => {
    for (const balance of [NaN, Infinity, '100', null]) {
      assert.throws(() => calculateSettlement(balance, 10, { outcome: 'win', multiplier: 2 }), TypeError);
    }
    assert.throws(() => calculateSettlement(-1, 10, { outcome: 'win', multiplier: 2 }), RangeError);
    for (const result of [null, undefined, [], 'win', {}, { outcome: 'unknown', multiplier: 2 }]) {
      assert.throws(() => calculateSettlement(100, 10, result), TypeError);
    }
    for (const multiplier of [NaN, Infinity, -Infinity, '2', null, undefined]) {
      assert.throws(() => calculateSettlement(100, 10, { outcome: 'win', multiplier }), TypeError);
    }
    assert.throws(() => calculateSettlement(100, 10, { outcome: 'loss', multiplier: -1 }), RangeError);
  });

  it('rejects numeric overflow in payout and final balance', () => {
    assert.throws(() => calculateSettlement(Number.MAX_VALUE, Number.MAX_VALUE,
      { outcome: 'win', multiplier: 2 }), RangeError);
    assert.throws(() => calculateSettlement(Number.MAX_VALUE, Number.MAX_VALUE / 2,
      { outcome: 'win', multiplier: 2 }), RangeError);
  });

  it('does not inspect details or mutate inputs or shared state', () => {
    const before = getBalance();
    const result = Object.freeze({ outcome: 'win', multiplier: 2,
      get details() { throw new Error('details must stay opaque'); } });
    assert.equal(calculateSettlement(100, 10, result).newBalance, 110);
    assert.equal(getBalance(), before);
  });
});

describe('play', () => {
  it('returns the settled balance for a loss, a push and a win', () => {
    assert.deepEqual(play('slots', 100, { outcome: 'loss', multiplier: 0 }),
      { newBalance: 900, xpGained: 10, leveledUp: false });
    assert.deepEqual(play('slots', 100, { outcome: 'push', multiplier: 1 }),
      { newBalance: 1000, xpGained: 10, leveledUp: false });
    assert.deepEqual(play('slots', 100, { outcome: 'win', multiplier: 2 }),
      { newBalance: 1100, xpGained: 10, leveledUp: false });
  });

  it('validates the bet and result through the settlement calculation', () => {
    assert.throws(() => play('slots', 0, { outcome: 'loss', multiplier: 0 }), RangeError);
    assert.throws(() => play('slots', 1001, { outcome: 'win', multiplier: 2 }), RangeError);
    assert.throws(() => play('slots', 100, { outcome: 'unknown', multiplier: 2 }), TypeError);
  });

  it('does not mutate the shared balance before the state contract is available', () => {
    const before = getBalance();
    play('slots', 100, { outcome: 'win', multiplier: 2 });
    assert.equal(getBalance(), before);
  });
});
