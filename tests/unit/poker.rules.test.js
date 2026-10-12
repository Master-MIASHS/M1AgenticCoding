import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createGame } from '../../src/games/_template/createGame.js';
import { bestPokerHand } from '../../src/games/cardUtils.js';
import {
  availableActions,
  resolveShowdown,
  rules,
  start,
  step,
  view,
} from '../../src/games/poker/rules.js';
import { draw as pokerDraw } from '../../src/games/poker/draw.js';

const CONFIG = Object.freeze({
  smallBlind: 1,
  bigBlind: 2,
  botStack: 20,
  raiseStep: 2,
});

const card = (rank, suit = 'spades') => ({ rank, suit });

function makeCore({ chooseAction = () => ({ type: 'check' }) } = {}) {
  const playCalls = [];
  return {
    playCalls,
    melanger(cards) {
      return cards;
    },
    choisirAction: chooseAction,
    getBalance() {
      return 100;
    },
    play(gameId, bet, gameResult) {
      playCalls.push({ gameId, bet, gameResult });
      return { newBalance: 100 };
    },
  };
}

function createStartingState(core = makeCore()) {
  const raw = pokerDraw(core);
  return start(raw, {
    bets: [{ type: 'small-blind', amount: CONFIG.smallBlind }],
    config: CONFIG,
    balance: 100,
  });
}

test('uses the shared evaluator for the best five-card hand', () => {
  const result = bestPokerHand([
    card('A'),
    card('K', 'hearts'),
    card('Q', 'clubs'),
    card('J', 'diamonds'),
    card('10'),
    card('2', 'hearts'),
  ]);
  assert.equal(result.category, 5);
  assert.deepEqual(result.tiebreakers, [14]);
});

test('starts an orchestrator-compatible session with blinds and engine fields', () => {
  const state = createStartingState();

  assert.equal(state.needsDraw, true);
  assert.equal(state.raiseStep, CONFIG.raiseStep);
  assert.equal(state.totalBet, CONFIG.smallBlind);
  assert.equal(state.aiTotalBet, CONFIG.bigBlind);
  assert.equal(state.playerChips, 99);
  assert.equal(state.aiChips, 18);
  assert.equal(state.pot, 3);
  assert.deepEqual(state.pendingActions, ['player', 'ai']);
  assert.deepEqual(availableActions(state), ['fold', 'call', 'raise']);
});

test('rejects an opening bet that differs from the configured small blind', () => {
  const raw = pokerDraw(makeCore());
  assert.throws(
    () =>
      start(raw, {
        bets: [{ type: 'main', amount: 2 }],
        config: CONFIG,
        balance: 100,
      }),
    /equal the configured smallBlind/,
  );
});

test('replays bot actions in order and advances the board after a completed street', () => {
  const core = makeCore();
  const state = createStartingState(core);
  const snapshot = structuredClone(state);
  const raw = pokerDraw(core, { session: state, action: 'call' });

  // The bot's preflop check, then its opening check on the flop (#413).
  assert.deepEqual(raw.aiActions, [{ type: 'check' }, { type: 'check' }]);
  const next = step(state, 'call', raw);

  assert.deepEqual(state, snapshot);
  assert.equal(next.stage, 'flop');
  assert.equal(next.communityCards.length, 3);
  assert.equal(next.toAct, 'player');
  assert.deepEqual(next.availableActions, ['fold', 'check', 'raise']);
  assert.equal(next.totalBet, 2);
  assert.equal(next.aiTotalBet, 2);
  assert.equal(next.needsDraw, true);
});

test('plays the bot opening turn of the next street in the same action (#413)', () => {
  const core = makeCore();
  const state = createStartingState(core);
  const preflop = step(state, 'call', pokerDraw(core, { session: state, action: 'call' }));

  assert.equal(preflop.toAct, 'player');
  const raw = pokerDraw(core, { session: preflop, action: 'check' });
  assert.deepEqual(raw.aiActions, [{ type: 'check' }]);
  const next = step(preflop, 'check', raw);

  assert.equal(next.stage, 'turn');
  assert.equal(next.communityCards.length, 4);
  assert.equal(next.toAct, 'player');
});

test('returns the terminal game-result shape after a player fold', () => {
  const result = step(createStartingState(), 'fold', { aiActions: [] });

  assert.deepEqual(
    { outcome: result.outcome, multiplier: result.multiplier, totalBet: result.details.totalBet },
    { outcome: 'loss', multiplier: 0, totalBet: CONFIG.smallBlind },
  );
});

test('showdown reveals the bot hand only in the terminal view', () => {
  const state = createStartingState();
  const showdownState = {
    ...state,
    communityCards: [
      card('6', 'hearts'),
      card('7', 'hearts'),
      card('8', 'hearts'),
      card('9', 'hearts'),
      card('10', 'hearts'),
    ],
    totalBet: 2,
    aiTotalBet: 2,
    pot: 4,
  };
  const activeView = view({ session: showdownState });
  assert.equal('aiHand' in activeView, false);
  assert.equal('shoe' in activeView, false);

  const result = resolveShowdown(showdownState);
  assert.equal(result.outcome, 'push');
  assert.equal(result.multiplier, 1);
  assert.equal(result.details.totalBet, 2);
  assert.equal(view({ gameResult: result }).aiHand.length, 2);
});

test('integrates with createGame and settles the wager once at showdown', () => {
  const core = makeCore();
  const game = createGame({
    id: 'poker',
    rules,
    config: CONFIG,
    core,
    draw: pokerDraw,
  });
  let response = game.start({ type: 'small-blind', amount: CONFIG.smallBlind });
  assert.equal(response.terminal, false);
  assert.equal('aiHand' in response.renderPayload.view, false);

  response = game.action(response.sessionId, 'call');
  for (let street = 0; street < 3 && !response.terminal; street += 1) {
    response = game.action(response.sessionId, 'check');
  }

  assert.equal(response.terminal, true);
  assert.equal(response.gameResult.outcome, 'push');
  assert.equal(response.gameResult.details.totalBet, 2);
  assert.equal(core.playCalls.length, 1);
  assert.equal(core.playCalls[0].bet, 2);
  assert.equal(response.renderPayload.view.aiHand.length, 2);
});
