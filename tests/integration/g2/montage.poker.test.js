// ---------------------------------------------------------------------------
// Tests d'intégration G2 - montage des règles Poker sur createGame.
// ---------------------------------------------------------------------------
// Le mélange contrôlé permet de jouer une main connue avec le vrai
// orchestrateur, le vrai sabot et le vrai mock du Core.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../../src/services/coreService.js';
import { createGame } from '../../../src/games/_template/createGame.js';
import { draw as pokerDraw } from '../../../src/games/poker/draw.js';
import { rules as pokerRules } from '../../../src/games/poker/rules.js';

const START_BALANCE = coreService.getState().balance;
const CONFIG = {
  smallBlind: 1,
  bigBlind: 2,
  botStack: 20,
  raiseStep: 2,
};
const BETS = [{ type: 'small-blind', amount: CONFIG.smallBlind }];

function card(rank, suit) {
  return { rank, suit };
}

function makeTestCore(firstCards) {
  const playCalls = [];
  const aiCalls = [];
  const core = {
    ...coreService,
    melanger(cards) {
      const first = firstCards.map(({ rank, suit }) => {
        const found = cards.find((candidate) => candidate.rank === rank && candidate.suit === suit);
        assert.ok(found, `card ${rank} of ${suit} must be in the deck`);
        return found;
      });
      const firstKeys = new Set(first.map(({ rank, suit }) => `${rank}:${suit}`));
      return [...first, ...cards.filter(({ rank, suit }) => !firstKeys.has(`${rank}:${suit}`))];
    },
    choisirAction(payload) {
      aiCalls.push(payload);
      return { type: 'check' };
    },
    play(gameId, bet, gameResult) {
      playCalls.push({ gameId, bet, gameResult });
      return coreService.play(gameId, bet, gameResult);
    },
  };
  return { core, playCalls, aiCalls };
}

function makeGame(core) {
  return createGame({
    id: 'poker',
    rules: pokerRules,
    config: CONFIG,
    core,
    draw: pokerDraw,
  });
}

function assertActiveViewIsPrivate(response, hiddenCards) {
  assert.equal(response.terminal, false);
  assert.equal('raw' in response.renderPayload, false, 'the raw shoe is not sent to G3');
  assert.equal('shoe' in response.renderPayload.view, false);
  assert.equal('aiHand' in response.renderPayload.view, false);
  const serializedView = JSON.stringify(response.renderPayload);
  for (const hiddenCard of hiddenCards) {
    assert.ok(
      !serializedView.includes(JSON.stringify(hiddenCard)),
      `hidden card ${hiddenCard.rank} of ${hiddenCard.suit} is not exposed`,
    );
  }
}

test('plays a complete hand, hides the bot cards, and settles exactly once', () => {
  const hiddenCards = [card('K', 'spades'), card('K', 'hearts')];
  const { core, playCalls, aiCalls } = makeTestCore([
    card('A', 'spades'),
    hiddenCards[0],
    card('A', 'hearts'),
    hiddenCards[1],
    card('2', 'clubs'),
    card('5', 'diamonds'),
    card('8', 'clubs'),
    card('9', 'diamonds'),
    card('J', 'clubs'),
  ]);
  const game = makeGame(core);

  let response = game.start(BETS);
  assertActiveViewIsPrivate(response, hiddenCards);
  assert.deepEqual(response.availableActions, ['fold', 'call', 'raise']);

  response = game.action(response.sessionId, 'call');
  assertActiveViewIsPrivate(response, hiddenCards);
  assert.equal(response.renderPayload.view.stage, 'flop');

  response = game.action(response.sessionId, 'check');
  assertActiveViewIsPrivate(response, hiddenCards);
  assert.equal(response.renderPayload.view.stage, 'turn');

  response = game.action(response.sessionId, 'check');
  assertActiveViewIsPrivate(response, hiddenCards);
  assert.equal(response.renderPayload.view.stage, 'river');

  response = game.action(response.sessionId, 'check');
  assert.equal(response.terminal, true);
  assert.equal(response.gameResult.outcome, 'win');
  assert.equal(response.gameResult.details.totalBet, 2);
  assert.equal(playCalls.length, 1, 'the Core settles once, at the end of the hand');
  assert.equal(playCalls[0].gameId, 'poker');
  assert.equal(playCalls[0].bet, 2);
  assert.equal(response.renderPayload.economy.newBalance, START_BALANCE + 2);
  assert.deepEqual(response.renderPayload.view.aiHand, hiddenCards);
  assert.equal(aiCalls.length, 4, 'one bot decision is made for each completed betting street');
});
