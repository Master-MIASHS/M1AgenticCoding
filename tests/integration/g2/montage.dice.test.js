// ---------------------------------------------------------------------------
// Tests d'intégration G2 - montage Dice / craps (#159, #218)
// ---------------------------------------------------------------------------
// Chaîne testée : start(bets) -> dice draw -> rules.resolve() -> gameResult
// -> un règlement Core avec roundId -> renderPayload.interpretation pour G3.
// ---------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../../src/services/coreService.js';
import { createGame } from '../../../src/games/_template/createGame.js';
import { diceRules } from '../../../src/games/dice/rules.js';
import { draw as diceDraw } from '../../../src/games/dice/draw.js';

const CONFIG = { paytable: { pass: 2 } };

function makeTestCore(faces) {
  const queue = faces.flat();
  const drawCalls = [];
  const playCalls = [];
  const core = {
    ...coreService,
    tirageEntier(min, max) {
      drawCalls.push([min, max]);
      if (queue.length === 0) {
        throw new Error(`fixture tirageEntier(): no face available for call ${drawCalls.length}`);
      }
      return queue.shift();
    },
    play(gameId, bet, gameResult, options) {
      playCalls.push({ gameId, bet, gameResult, options });
      return coreService.play(gameId, bet, gameResult, options);
    },
  };
  return { core, drawCalls, playCalls, remainingFaces: () => [...queue] };
}

function playDice(faces) {
  const { core, drawCalls, playCalls, remainingFaces } = makeTestCore(faces);
  const balanceBefore = coreService.getState().balance;
  const game = createGame({
    id: 'dice',
    rules: diceRules,
    config: CONFIG,
    core,
    draw: diceDraw,
  });
  const result = game.start([{ type: 'pass', amount: 10 }]);
  return { result, balanceBefore, drawCalls, playCalls, remainingFaces };
}

describe('G2 - montage Dice (#159) : orchestrateur + tirage + règles + Core', () => {
  test('come-out 2 perd la mise et règle une seule fois', () => {
    const { result, balanceBefore, drawCalls, playCalls } = playDice([[1, 1]]);
    assert.equal(result.terminal, true);
    assert.equal(result.gameResult.outcome, 'loss');
    assert.equal(result.gameResult.multiplier, 0);
    assert.equal(result.renderPayload.economy.newBalance, balanceBefore - 10);
    assert.deepEqual(drawCalls, [[1, 6], [1, 6]]);
    assert.equal(playCalls.length, 1);
    assert.equal(playCalls[0].bet, 10);
    assert.match(playCalls[0].options.roundId, /^dice-/);
  });

  test('come-out 7 gagne le multiplicateur configuré, mise incluse', () => {
    const { result, balanceBefore, playCalls } = playDice([[3, 4]]);
    assert.equal(result.gameResult.outcome, 'win');
    assert.equal(result.gameResult.multiplier, 2);
    assert.equal(result.renderPayload.economy.newBalance, balanceBefore + 10);
    assert.equal(playCalls.length, 1);
    assert.match(playCalls[0].options.roundId, /^dice-/);
  });

  test('come-out 12 est une défaite, sans égalité ni retour de mise', () => {
    const { result, balanceBefore } = playDice([[6, 6]]);
    assert.equal(result.gameResult.outcome, 'loss');
    assert.equal(result.gameResult.multiplier, 0);
    assert.equal(result.renderPayload.economy.newBalance, balanceBefore - 10);
  });

  test('le point gagne après plusieurs relances avec un seul start et un seul play', () => {
    const { result, drawCalls, playCalls, remainingFaces } = playDice([
      [2, 3],
      [3, 3],
      [1, 4],
      [1, 4],
    ]);

    assert.equal(result.terminal, true);
    assert.deepEqual(result.gameResult, {
      outcome: 'win',
      multiplier: 2,
      details: {
        point: 5,
        rolls: [5, 6, 5],
        rawValues: [[2, 3], [3, 3], [1, 4]],
        dice: [[2, 3], [3, 3], [1, 4]],
        totalBet: 10,
        payout: 20,
      },
    });
    assert.deepEqual(result.renderPayload.interpretation.rolls, [5, 6, 5]);
    assert.equal(result.renderPayload.interpretation.point, 5);
    assert.deepEqual(result.renderPayload.interpretation.dice, [[2, 3], [3, 3], [1, 4]]);
    assert.deepEqual(drawCalls, Array.from({ length: 6 }, () => [1, 6]));
    assert.equal(playCalls.length, 1);
    assert.equal(playCalls[0].bet, 10);
    assert.match(playCalls[0].options.roundId, /^dice-/);
    assert.deepEqual(remainingFaces(), [1, 4]);
  });

  test('gameResult conserve l’enveloppe de la PR #303', () => {
    const { result } = playDice([[1, 1]]);
    assert.deepEqual(Object.keys(result.gameResult).sort(), ['details', 'multiplier', 'outcome']);
    assert.equal(result.renderPayload.interpretation.totalBet, 10);
    assert.equal(result.renderPayload.interpretation.payout, 0);
  });
});
