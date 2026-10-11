import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createGame } from '../../../src/games/_template/createGame.js';
import { QUESTION_BANK } from '../../../src/games/quiz/questions.js';
import * as quizRules from '../../../src/games/quiz/rules.js';
import { draw as drawQuiz } from '../../../src/games/quiz/draw.js';

const CONFIG = { paytable: { 1: 1.5, 2: 2, 3: 3, 4: 5, 5: 10 } };

function makeCore() {
  const playCalls = [];
  const shuffled = [];
  const core = {
    melanger(items) {
      shuffled.push(items);
      return [...items];
    },
    play(gameId, bet, gameResult) {
      playCalls.push({ gameId, bet, gameResult });
      return { newBalance: 1000, xpGained: 10, leveledUp: false };
    },
  };
  return { core, playCalls, shuffled };
}

describe('G2 quiz integration', () => {
  it('shuffles once on start, hides answers, then settles exactly once after cash-out', () => {
    const { core, playCalls, shuffled } = makeCore();
    const game = createGame({ id: 'quiz', rules: quizRules, config: CONFIG, core, draw: drawQuiz });
    const opened = game.start({ type: 'main', amount: 10 });

    assert.equal(shuffled.length, 1);
    assert.deepEqual(shuffled[0], QUESTION_BANK);
    assert.equal(opened.terminal, false);
    assert.equal(opened.renderPayload.view.questionId, QUESTION_BANK[0].id);
    assert.equal('raw' in opened.renderPayload, false);
    assert.equal(JSON.stringify(opened).includes('correctIndex'), false);

    const answered = game.action(opened.sessionId, `answer-${QUESTION_BANK[0].correctIndex}`);
    assert.equal(answered.renderPayload.view.correctIndex, QUESTION_BANK[0].correctIndex);
    assert.deepEqual(answered.availableActions, ['next', 'stop']);
    assert.equal(playCalls.length, 0);

    const result = game.action(opened.sessionId, 'stop');
    assert.equal(result.terminal, true);
    assert.equal(result.gameResult.multiplier, CONFIG.paytable[1]);
    assert.equal(playCalls.length, 1);
    assert.equal(playCalls[0].bet, 10);
    assert.equal('raw' in result.renderPayload, false);
    assert.equal(shuffled.length, 1, 'actions do not request additional randomness');
  });

  it('settles a wrong answer as a loss without exposing the bank or settling twice', () => {
    const { core, playCalls } = makeCore();
    const game = createGame({ id: 'quiz', rules: quizRules, config: CONFIG, core, draw: drawQuiz });
    const opened = game.start({ type: 'main', amount: 10 });
    const wrongIndex = (QUESTION_BANK[0].correctIndex + 1) % 4;
    const result = game.action(opened.sessionId, `answer-${wrongIndex}`);

    assert.equal(result.terminal, true);
    assert.equal(result.gameResult.outcome, 'loss');
    assert.equal(result.gameResult.multiplier, 0);
    assert.equal(result.renderPayload.view.correctIndex, QUESTION_BANK[0].correctIndex);
    assert.equal(playCalls.length, 1);
    assert.throws(() => game.action(opened.sessionId, 'next'), /unknown or finished session/);
  });
});
