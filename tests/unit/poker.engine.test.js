import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyBot, applyPlayer, botPayload, isOver } from '../../src/games/poker/engine.js';

const card = (rank, suit = 'spades') => ({ rank, suit });

function state(overrides = {}) {
  return {
    stage: 'preflop',
    playerHand: [card('A', 'hearts'), card('A', 'clubs')],
    aiHand: [card('K', 'hearts'), card('Q', 'hearts')],
    communityCards: [],
    playerChips: 20,
    aiChips: 20,
    playerContribution: 1,
    aiContribution: 2,
    pot: 3,
    currentBet: 2,
    raiseStep: 2,
    totalBet: 1,
    toAct: 'player',
    pendingActions: ['player', 'ai'],
    ...overrides,
  };
}

test('applies a call immutably and advances the actor', () => {
  const current = state();
  const next = applyPlayer(current, 'call');

  assert.equal(next.playerChips, 19);
  assert.equal(next.playerContribution, 2);
  assert.equal(next.pot, 4);
  assert.equal(next.totalBet, 2);
  assert.equal(next.toAct, 'ai');
  assert.equal(next.roundComplete, false);
  assert.equal(current.playerChips, 20);
  assert.equal(current.playerContribution, 1);
  assert.deepEqual(current.pendingActions, ['player', 'ai']);
});

test('does not mutate the state when applying a player raise', () => {
  const current = state();
  const snapshot = structuredClone(current);

  applyPlayer(current, 'raise');

  assert.deepEqual(current, snapshot);
});

test('applies the configured fixed supplement for a player raise', () => {
  const next = applyPlayer(state(), 'raise');

  assert.equal(next.playerChips, 17);
  assert.equal(next.playerContribution, 4);
  assert.equal(next.currentBet, 4);
  assert.equal(next.pot, 6);
  assert.equal(next.totalBet, 4);
  assert.equal(next.toAct, 'ai');
  assert.deepEqual(next.pendingActions, ['ai']);
});

test('rejects dynamic raise action names and unaffordable player raises', () => {
  assert.throws(() => applyPlayer(state(), 'raise-4'), /not available/);
  assert.throws(
    () => applyPlayer(state({ playerChips: 2 }), 'raise'),
    /not available/,
  );
});

test('preserves the exact amount of a payable bot raise', () => {
  const current = state({
    toAct: 'ai',
    pendingActions: ['ai'],
    aiChips: 10,
    currentBet: 3,
  });
  const snapshot = structuredClone(current);
  const next = applyBot(current, { type: 'raise', amount: 6 });

  assert.equal(next.aiChips, 3);
  assert.equal(next.aiContribution, 9);
  assert.equal(next.currentBet, 9);
  assert.equal(next.pot, 10);
  assert.equal(current.aiChips, snapshot.aiChips);
  assert.deepEqual(current, snapshot);
});

test('caps a bot raise to its exact all-in amount even when it is not a raiseStep multiple', () => {
  const next = applyBot(
    state({
      toAct: 'ai',
      pendingActions: ['ai'],
      aiChips: 8,
      currentBet: 3,
    }),
    { type: 'raise', amount: 8 },
  );

  assert.equal(next.aiChips, 0);
  assert.equal(next.aiContribution, 10);
  assert.equal(next.currentBet, 10);
  assert.equal(next.pot, 11);
  assert.equal(next.toAct, 'player');
  assert.equal(next.totalBet, 1);
});

test('rejects an invalid non-multiple bot decision that is not an all-in', () => {
  assert.throws(
    () =>
      applyBot(
        state({
          toAct: 'ai',
          pendingActions: ['ai'],
          aiChips: 10,
          currentBet: 3,
        }),
        { type: 'raise', amount: 3 },
      ),
    /raiseStep multiple or an exact all-in/,
  );
});

test('bot payload contains local hand strength without exposing player cards', () => {
  const payload = botPayload(
    state({
      toAct: 'ai',
      pendingActions: ['ai'],
      aiContribution: 1,
      currentBet: 4,
      aiChips: 8,
    }),
  );

  assert.equal(payload.stage, 'preflop');
  assert.equal(payload.minRaise, 2);
  assert.deepEqual(payload.availableActions, ['fold', 'call', 'raise']);
  assert.equal(payload.aiState.chips, 5);
  assert.equal(payload.aiState.chips >= payload.minRaise, true);
  assert.ok(payload.aiHandStrength >= 0 && payload.aiHandStrength <= 1);
  assert.deepEqual(payload.aiState.hand, [card('K', 'hearts'), card('Q', 'hearts')]);
  assert.equal('playerHand' in payload, false);
});

test('bot payload removes raise when no raiseStep remains after calling', () => {
  const payload = botPayload(
    state({
      toAct: 'ai',
      pendingActions: ['ai'],
      aiContribution: 1,
      currentBet: 4,
      aiChips: 4,
    }),
  );

  assert.equal(payload.aiState.chips, 1);
  assert.deepEqual(payload.availableActions, ['fold', 'call']);
});

test('marks completed betting rounds separately from terminal hands', () => {
  const checked = applyPlayer(
    state({ playerContribution: 2, aiContribution: 2, currentBet: 2 }),
    'check',
  );
  const completed = applyBot(checked, { type: 'check' });

  assert.equal(completed.roundComplete, true);
  assert.equal(completed.terminal, undefined);
  assert.equal(isOver(completed), false);
  assert.equal(isOver(applyPlayer(state(), 'fold')), true);
});
