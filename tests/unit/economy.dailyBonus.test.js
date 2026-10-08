import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DAILY_BONUS_CONFIG } from '../../src/core/config/economy.config.js';
import { claimDailyBonus, createDailyBonus } from '../../src/core/economy.js';
import { getState, restoreState } from '../../src/core/state.js';

function createStore(initial, { failOnUpdate = false } = {}) {
  let state = structuredClone(initial);
  let updateCount = 0;
  return {
    read: () => structuredClone(state),
    update(updater) {
      updateCount += 1;
      if (failOnUpdate) throw new Error('stockage indisponible');
      const next = updater(structuredClone(state));
      state = structuredClone(next);
      return structuredClone(state);
    },
    inspect: () => structuredClone(state),
    updateCount: () => updateCount,
  };
}

const emptyWallet = () => ({ balance: 0, bestBalance: 250, lastClaimAt: null });

describe('bonus quotidien', () => {
  it('accorde le bonus par defaut a un solde nul', () => {
    const store = createStore(emptyWallet());
    const bonus = createDailyBonus({ store, now: () => 1_000_000 });

    assert.deepEqual(bonus.claim(), {
      claimed: true,
      amount: 100,
      newBalance: 100,
      nextClaimAt: 87_400_000,
    });
    assert.deepEqual(store.inspect(), {
      balance: 100,
      bestBalance: 250,
      lastClaimAt: 1_000_000,
    });
    assert.equal(store.updateCount(), 1);
  });

  it('refuse un joueur dont le solde est positif sans ecriture', () => {
    const store = createStore({ balance: 1, bestBalance: 250, lastClaimAt: null });
    const bonus = createDailyBonus({ store, now: () => 1_000 });

    assert.deepEqual(bonus.claim(), {
      claimed: false,
      reason: 'balance_not_zero',
      remainingMs: 0,
    });
    assert.equal(store.updateCount(), 0);
  });

  it('refuse avant 24 heures et laisse le stockage intact', () => {
    const initial = { balance: 0, bestBalance: 250, lastClaimAt: 1_000 };
    const store = createStore(initial);
    const bonus = createDailyBonus({ store, now: () => 1_001 });

    assert.deepEqual(bonus.claim(), {
      claimed: false,
      reason: 'cooldown',
      remainingMs: DAILY_BONUS_CONFIG.cooldownMs - 1,
    });
    assert.deepEqual(store.inspect(), initial);
    assert.equal(store.updateCount(), 0);
  });

  it('accorde de nouveau le bonus apres exactement 24 heures', () => {
    const firstClaimAt = 5_000;
    const store = createStore({ balance: 0, bestBalance: 20, lastClaimAt: firstClaimAt });
    const bonus = createDailyBonus({
      store,
      now: () => firstClaimAt + DAILY_BONUS_CONFIG.cooldownMs,
    });

    assert.equal(bonus.claim().claimed, true);
    assert.equal(store.inspect().balance, 100);
  });

  it('utilise un montant et un delai configures', () => {
    const store = createStore(emptyWallet());
    const config = { amount: 75, cooldownMs: 10_000 };
    const bonus = createDailyBonus({ store, config, now: () => 20_000 });

    assert.deepEqual(bonus.claim(), {
      claimed: true,
      amount: 75,
      newBalance: 75,
      nextClaimAt: 30_000,
    });
  });

  it('met a jour le meilleur solde dans la meme operation', () => {
    const store = createStore({ balance: 0, bestBalance: 40, lastClaimAt: null });
    const bonus = createDailyBonus({ store, config: { amount: 75, cooldownMs: 10 }, now: () => 100 });

    bonus.claim();

    assert.deepEqual(store.inspect(), {
      balance: 75,
      bestBalance: 75,
      lastClaimAt: 100,
    });
    assert.equal(store.updateCount(), 1);
  });

  it('lit l horloge une seule fois par reclamation', () => {
    const store = createStore(emptyWallet());
    let calls = 0;
    const bonus = createDailyBonus({ store, now: () => {
      calls += 1;
      return 100;
    } });

    bonus.claim();

    assert.equal(calls, 1);
  });

  it('rejette les dependances, configurations, horodatages et etats invalides', () => {
    assert.throws(() => createDailyBonus({}), /stockage/i);
    assert.throws(
      () => createDailyBonus({ store: createStore(emptyWallet()), config: { amount: 0, cooldownMs: 1 } }),
      /configuration/i,
    );
    assert.throws(
      () => createDailyBonus({ store: createStore(emptyWallet()), now: () => Number.NaN }).claim(),
      /horodatage/i,
    );
    assert.throws(
      () => createDailyBonus({ store: createStore({ balance: -1, bestBalance: 0, lastClaimAt: null }) }).claim(),
      /stockage/i,
    );
  });

  it('refuse un depassement numerique sans ecriture', () => {
    const store = createStore(emptyWallet());
    const bonus = createDailyBonus({
      store,
      config: { amount: 100, cooldownMs: 1 },
      now: () => Number.MAX_SAFE_INTEGER,
    });

    assert.throws(() => bonus.claim(), /plage numerique/i);
    assert.equal(store.updateCount(), 0);
  });

  it('propage un echec de stockage sans publier de nouvel etat', () => {
    const initial = emptyWallet();
    const store = createStore(initial, { failOnUpdate: true });
    const bonus = createDailyBonus({ store, now: () => 1_000 });

    assert.throws(() => bonus.claim(), /stockage indisponible/);
    assert.deepEqual(store.inspect(), initial);
  });

  it('branche l API publique sur l ecriture atomique du Core', () => {
    restoreState({
      balance: 0,
      bestBalance: 50,
      xp: 0,
      level: 1,
      unlockedGames: ['slots', 'dice'],
      history: [],
      role: 'player',
    });

    const result = claimDailyBonus();

    assert.equal(result.claimed, true);
    assert.equal(result.amount, DAILY_BONUS_CONFIG.amount);
    assert.equal(result.newBalance, DAILY_BONUS_CONFIG.amount);
    assert.equal(getState().balance, DAILY_BONUS_CONFIG.amount);
    assert.equal(getState().bestBalance, DAILY_BONUS_CONFIG.amount);

    const beforeRefusal = getState();
    assert.deepEqual(claimDailyBonus(), {
      claimed: false,
      reason: 'balance_not_zero',
      remainingMs: 0,
    });
    assert.deepEqual(getState(), beforeRefusal);
  });
});
