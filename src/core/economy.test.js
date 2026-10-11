import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSettlement, getBalance, play } from './economy.js';
import { arreterEvenementBonus, lancerEvenementBonus } from './config/events.config.js';
import { getState, restoreState } from './state.js';

let stateBeforeTest;

beforeEach(() => {
  stateBeforeTest = getState();
});

afterEach(() => {
  restoreState(stateBeforeTest);
});

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
  it('persists the settled balance for a loss, a push and a win', () => {
    assert.deepEqual(play('slots', 100, { outcome: 'loss', multiplier: 0 }, { roundId: 'slots-1' }),
      { newBalance: 900, xpGained: 10, leveledUp: false });
    assert.deepEqual(play('slots', 100, { outcome: 'push', multiplier: 1 }, { roundId: 'slots-2' }),
      { newBalance: 900, xpGained: 10, leveledUp: false });
    assert.deepEqual(play('slots', 100, { outcome: 'win', multiplier: 2 }, { roundId: 'slots-3' }),
      { newBalance: 1000, xpGained: 10, leveledUp: false });
    assert.equal(getBalance(), 1000);
    assert.equal(getState().xp, 30);
    assert.equal(getState().history.length, 3);
  });

  it('validates the bet and result through the settlement calculation', () => {
    assert.throws(() => play('slots', 0, { outcome: 'loss', multiplier: 0 }, { roundId: 'bad-1' }), RangeError);
    assert.throws(() => play('slots', 1001, { outcome: 'win', multiplier: 2 }, { roundId: 'bad-2' }), RangeError);
    assert.throws(() => play('slots', 100, { outcome: 'unknown', multiplier: 2 }, { roundId: 'bad-3' }), TypeError);
  });

  it('updates balance, best balance, XP, level, history and round registry atomically', () => {
    restoreState({ ...getState(), xp: 95, level: 1 });
    const result = play('slots', 100, { outcome: 'win', multiplier: 2 }, { roundId: 'slots-level-up' });
    assert.deepEqual(result, { newBalance: 1100, xpGained: 10, leveledUp: true });
    const updated = getState();
    assert.equal(updated.balance, 1100);
    assert.equal(updated.bestBalance, 1100);
    assert.equal(updated.xp, 105);
    assert.equal(updated.level, 2);
    assert.deepEqual(updated.settledRoundIds, ['slots-level-up']);
    assert.equal(updated.history.length, 1);
    assert.deepEqual({ ...updated.history[0], playedAt: '<iso>' }, {
      roundId: 'slots-level-up',
      gameId: 'slots',
      bet: 100,
      outcome: 'win',
      payout: 200,
      netGain: 100,
      playedAt: '<iso>',
    });
    assert.equal(new Date(updated.history[0].playedAt).toISOString(), updated.history[0].playedAt);
  });

  it('counts one bankruptcy when a settlement moves the balance from positive to zero', () => {
    restoreState({ ...getState(), balance: 100, bestBalance: 100, faillites: 4 });
    const result = play('slots', 100, { outcome: 'loss', multiplier: 0 },
      { roundId: 'slots-bankruptcy' });
    assert.deepEqual(result, { newBalance: 0, xpGained: 10, leveledUp: false });
    assert.equal(getState().faillites, 5);

    const duplicate = play('slots', 100, { outcome: 'loss', multiplier: 0 },
      { roundId: 'slots-bankruptcy' });
    assert.deepEqual(duplicate, { success: false, reason: 'already_settled' });
    assert.equal(getState().faillites, 5);
  });

  it('does not count a bankruptcy while the settled balance stays positive', () => {
    restoreState({ ...getState(), balance: 100, bestBalance: 100, faillites: 2 });
    play('slots', 25, { outcome: 'loss', multiplier: 0 }, { roundId: 'slots-loss-positive' });
    assert.equal(getState().faillites, 2);
  });

  it('applies an active gains event only to a positive net gain', () => {
    const eventId = 'economy-test-gains-positive';
    const now = Date.now();
    lancerEvenementBonus({
      id: eventId,
      cible: 'gains',
      multiplicateur: 2,
      debut: now - 1000,
      fin: now + 60_000,
    });
    try {
      const result = play('slots', 10, { outcome: 'win', multiplier: 2 },
        { roundId: 'slots-gains-bonus' });
      assert.deepEqual(result, { newBalance: 1020, xpGained: 10, leveledUp: false });
      assert.deepEqual(getState().history.at(-1), {
        roundId: 'slots-gains-bonus',
        gameId: 'slots',
        bet: 10,
        outcome: 'win',
        payout: 30,
        netGain: 20,
        playedAt: getState().history.at(-1).playedAt,
      });
    } finally {
      arreterEvenementBonus(eventId);
    }
  });

  it('does not apply a gains event to a loss or a push', () => {
    const eventId = 'economy-test-gains-neutral';
    const now = Date.now();
    lancerEvenementBonus({
      id: eventId,
      cible: 'gains',
      multiplicateur: 3,
      debut: now - 1000,
      fin: now + 60_000,
    });
    try {
      assert.deepEqual(play('slots', 10, { outcome: 'loss', multiplier: 0 },
        { roundId: 'slots-loss-no-bonus' }),
      { newBalance: 990, xpGained: 10, leveledUp: false });
      assert.deepEqual(play('slots', 10, { outcome: 'push', multiplier: 1 },
        { roundId: 'slots-push-no-bonus' }),
      { newBalance: 990, xpGained: 10, leveledUp: false });
    } finally {
      arreterEvenementBonus(eventId);
    }
  });

  it('rounds once after applying a fractional gains multiplier', () => {
    const eventId = 'economy-test-gains-rounding';
    const now = Date.now();
    lancerEvenementBonus({
      id: eventId,
      cible: 'gains',
      multiplicateur: 1.5,
      debut: now - 1000,
      fin: now + 60_000,
    });
    try {
      const result = play('slots', 10, { outcome: 'win', multiplier: 1.2345 },
        { roundId: 'slots-gains-rounding' });
      assert.deepEqual(result, { newBalance: 1003.52, xpGained: 10, leveledUp: false });
      assert.equal(getState().history.at(-1).payout, 13.52);
      assert.equal(getState().history.at(-1).netGain, 3.52);
    } finally {
      arreterEvenementBonus(eventId);
    }
  });

  it('applies the bonus before rounding a small positive gain', () => {
    const eventId = 'economy-test-gains-before-rounding';
    const now = Date.now();
    lancerEvenementBonus({
      id: eventId,
      cible: 'gains',
      multiplicateur: 10,
      debut: now - 1000,
      fin: now + 60_000,
    });
    try {
      const result = play('slots', 1, { outcome: 'win', multiplier: 1.004 },
        { roundId: 'slots-small-gain' });
      assert.deepEqual(result, { newBalance: 1000.04, xpGained: 10, leveledUp: false });
      assert.equal(getState().history.at(-1).payout, 1.04);
      assert.equal(getState().history.at(-1).netGain, 0.04);
    } finally {
      arreterEvenementBonus(eventId);
    }
  });

  it('keeps bonus settlement amounts compatible with history within one cent', () => {
    const eventId = 'economy-test-history-consistency';
    const now = Date.now();
    lancerEvenementBonus({
      id: eventId,
      cible: 'gains',
      multiplicateur: 1.5,
      debut: now - 1000,
      fin: now + 60_000,
    });
    try {
      assert.doesNotThrow(() => play(
        'slots',
        10.005,
        { outcome: 'win', multiplier: 1.2345 },
        { roundId: 'slots-history-consistency' },
      ));
      const { bet, payout, netGain } = getState().history.at(-1);
      assert.ok(Math.abs(netGain - (payout - bet)) <= 0.01);
    } finally {
      arreterEvenementBonus(eventId);
    }
  });

  it('refuses a duplicate round without applying a second settlement or XP gain', () => {
    const first = play('slots', 100, { outcome: 'win', multiplier: 2 }, { roundId: 'slots-duplicate' });
    const afterFirst = getState();
    const duplicate = play('slots', 100, { outcome: 'win', multiplier: 2 }, { roundId: 'slots-duplicate' });
    assert.deepEqual(first, { newBalance: 1100, xpGained: 10, leveledUp: false });
    assert.deepEqual(duplicate, { success: false, reason: 'already_settled' });
    assert.deepEqual(getState(), afterFirst);
  });

  it('keeps a roundId reusable when persistence fails', () => {
    const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    let failWrite = true;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        setItem() {
          if (failWrite) throw new Error('stockage indisponible');
        },
      },
    });
    try {
      const before = getState();
      assert.throws(() => play('slots', 100, { outcome: 'win', multiplier: 2 },
        { roundId: 'slots-retry' }), /stockage indisponible/);
      assert.deepEqual(getState(), before);
      failWrite = false;
      assert.deepEqual(play('slots', 100, { outcome: 'win', multiplier: 2 },
        { roundId: 'slots-retry' }),
      { newBalance: 1100, xpGained: 10, leveledUp: false });
    } finally {
      if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
      else delete globalThis.localStorage;
    }
  });

  it('keeps legacy calls working and emits the warning required by G5', () => {
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (...args) => warnings.push(args);
    try {
      assert.deepEqual(play('slots', 100, { outcome: 'loss', multiplier: 0 }),
        { newBalance: 900, xpGained: 10, leveledUp: false });
    } finally {
      console.warn = originalWarn;
    }
    assert.deepEqual(warnings, [['[Core] play() appelé sans roundId']]);
    assert.deepEqual(getState().settledRoundIds, []);
    assert.equal(getState().history.at(-1).roundId, null);
  });

  it('accepts an explicit null roundId as a legacy call', () => {
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (...args) => warnings.push(args);
    try {
      play('slots', 100, { outcome: 'push', multiplier: 1 }, { roundId: null });
    } finally {
      console.warn = originalWarn;
    }
    assert.deepEqual(warnings, [['[Core] play() appelé sans roundId']]);
    assert.equal(getState().history.at(-1).roundId, null);
    assert.deepEqual(getState().settledRoundIds, []);
  });

  it('rejects an invalid roundId before changing state', () => {
    const before = getState();
    for (const roundId of ['', '   ', 42, []]) {
      assert.throws(() => play('slots', 100, { outcome: 'win', multiplier: 2 }, { roundId }), TypeError);
    }
    assert.deepEqual(getState(), before);
  });
});
