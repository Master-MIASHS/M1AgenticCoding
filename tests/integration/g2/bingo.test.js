import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createGame } from '../../../src/games/_template/createGame.js';
import * as bingoRules from '../../../src/games/bingo/rules.js';
import { draw as drawBingo } from '../../../src/games/bingo/draw.js';

const CONFIG = { botCount: 3, paytable: { win: 4 } };
const BALLS = Array.from({ length: 75 }, (_, index) => index + 1);

function makeCore({ identicalBoards = false } = {}) {
  const shuffledInputs = [];
  const playCalls = [];
  return {
    core: {
      melanger(values) {
        shuffledInputs.push([...values]);
        if (values.length === 15) {
          const boardIndex = Math.floor((shuffledInputs.length - 2) / 5);
          const offset = identicalBoards ? 0 : boardIndex;
          return [...values.slice(offset), ...values.slice(0, offset)];
        }
        return [...values];
      },
      play(gameId, bet, gameResult) {
        playCalls.push({ gameId, bet, gameResult });
        return { newBalance: 1030, xpGained: 10, leveledUp: false };
      },
    },
    shuffledInputs,
    playCalls,
  };
}

describe('G2 Bingo integration', () => {
  it('generates all boards and ball order once, hides bot grids, and settles once on a player win', () => {
    const { core, shuffledInputs, playCalls } = makeCore();
    const game = createGame({
      id: 'bingo',
      rules: bingoRules,
      config: CONFIG,
      core,
      draw: drawBingo,
    });
    const opened = game.start([{ type: 'main', amount: 10 }]);

    assert.equal(opened.terminal, false);
    assert.deepEqual(opened.availableActions, ['next']);
    assert.equal(shuffledInputs.length, 21);
    assert.deepEqual(shuffledInputs[0], BALLS);
    assert.deepEqual(opened.renderPayload.view.drawnBalls, []);
    assert.deepEqual(Object.keys(opened.renderPayload.view.bots[0]), ['id', 'remaining']);
    assert.equal('balls' in opened.renderPayload.view, false);
    assert.equal('raw' in opened.renderPayload, false);
    assert.equal(JSON.stringify(opened.renderPayload.view).includes('botGrid'), false);
    assert.equal(playCalls.length, 0);

    let result = opened;
    for (let index = 0; index < 75 && !result.terminal; index += 1) {
      result = game.action(opened.sessionId, 'next');
    }

    assert.equal(result.terminal, true);
    assert.equal(result.gameResult.outcome, 'win');
    assert.deepEqual(result.gameResult.details.winnerIds, ['player']);
    assert.equal(result.renderPayload.view.bots[0].grid.length, 5);
    assert.equal(playCalls.length, 1);
    assert.equal(playCalls[0].gameId, 'bingo');
    assert.equal(playCalls[0].bet, 10);
    assert.equal(playCalls[0].gameResult.multiplier, CONFIG.paytable.win);
    assert.equal(shuffledInputs.length, 21, 'actions reuse the prepared draw without more randomness');
  });

  it('settles simultaneous player and bot wins once as a push', () => {
    const { core, playCalls } = makeCore({ identicalBoards: true });
    const game = createGame({
      id: 'bingo',
      rules: bingoRules,
      config: CONFIG,
      core,
      draw: drawBingo,
    });
    const opened = game.start([{ type: 'main', amount: 10 }]);

    let result = opened;
    for (let index = 0; index < 75 && !result.terminal; index += 1) {
      result = game.action(opened.sessionId, 'next');
    }

    assert.equal(result.terminal, true);
    assert.equal(result.gameResult.outcome, 'push');
    assert.equal(result.gameResult.multiplier, 1);
    assert.deepEqual(result.gameResult.details.winnerIds, ['player', 'bot-1', 'bot-2', 'bot-3']);
    assert.equal(playCalls.length, 1);
    assert.throws(() => game.action(opened.sessionId, 'next'), /unknown or finished session/);
  });

  it('uses the configured bot count to generate and validate the boards', () => {
    const { core, shuffledInputs } = makeCore();
    const game = createGame({
      id: 'bingo',
      rules: bingoRules,
      config: { ...CONFIG, botCount: 2 },
      core,
      draw: drawBingo,
    });
    const opened = game.start([{ type: 'main', amount: 10 }]);

    assert.equal(shuffledInputs.length, 16);
    assert.equal(opened.renderPayload.view.bots.length, 2);
  });
});
