// ---------------------------------------------------------------------------
// Unit tests - Quiz UI mock (src/game-ui/quiz/quiz.mock.js)
// ---------------------------------------------------------------------------
// Groupe 3. The mock stands in for the G2 orchestrator of a multi-step game:
// start(bets), action(sessionId, 'answer-<i>'), then 'next' or 'stop' after a
// right answer (rules #302). The correct answer only appears in
// renderPayload.view once the player has answered.
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mockStart, mockAction } from '../../src/game-ui/quiz/quiz.mock.js';

const BET = [{ type: 'main', amount: 10 }];
// Correct answers of the 5 demo questions of the mock.
const CORRECT = [1, 2, 2, 3, 1];

describe('quiz mock - multi-step shape', () => {
  it('opens on question 1 with 4 answers and no correct answer in the view', async () => {
    const res = await mockStart(BET);

    assert.equal(res.terminal, false);
    const { view } = res.renderPayload;
    assert.equal(view.questionNumber, 1);
    assert.equal(view.totalQuestions, 5);
    assert.equal(view.options.length, 4);
    assert.equal(view.answered, false);
    assert.equal(view.correctIndex, undefined);
    assert.deepEqual(res.availableActions, ['answer-0', 'answer-1', 'answer-2', 'answer-3']);
  });

  it('reveals the correction after a right answer and offers next / stop', async () => {
    const opened = await mockStart(BET);
    const res = await mockAction(opened.sessionId, `answer-${CORRECT[0]}`);

    assert.equal(res.terminal, false);
    assert.equal(res.renderPayload.view.isCorrect, true);
    assert.equal(res.renderPayload.view.correctIndex, CORRECT[0]);
    assert.deepEqual(res.availableActions, ['next', 'stop']);

    const next = await mockAction(opened.sessionId, 'next');
    assert.equal(next.renderPayload.view.questionNumber, 2);
    assert.equal(next.renderPayload.view.correctIndex, undefined);
  });

  it('ends on a wrong answer with a loss and shows the correct answer', async () => {
    const opened = await mockStart(BET);
    const wrong = (CORRECT[0] + 1) % 4;
    const res = await mockAction(opened.sessionId, `answer-${wrong}`);

    assert.equal(res.terminal, true);
    assert.equal(res.gameResult.outcome, 'loss');
    assert.equal(res.gameResult.multiplier, 0);
    assert.equal(res.renderPayload.view.correctIndex, CORRECT[0]);
  });

  it('cashes out with stop, outcome consistent with the multiplier (contract § 2.2)', async () => {
    const opened = await mockStart(BET);
    await mockAction(opened.sessionId, `answer-${CORRECT[0]}`);
    const res = await mockAction(opened.sessionId, 'stop');

    assert.equal(res.terminal, true);
    assert.deepEqual(Object.keys(res.gameResult).sort(), ['details', 'multiplier', 'outcome']);
    const expected = res.gameResult.multiplier > 1 ? 'win' : res.gameResult.multiplier === 1 ? 'push' : 'loss';
    assert.equal(res.gameResult.outcome, expected);
  });

  it('rejects stop before any answer and actions on a finished session', async () => {
    const opened = await mockStart(BET);
    await assert.rejects(() => mockAction(opened.sessionId, 'stop'));
    await mockAction(opened.sessionId, `answer-${(CORRECT[0] + 1) % 4}`);
    await assert.rejects(() => mockAction(opened.sessionId, 'next'));
  });
});
