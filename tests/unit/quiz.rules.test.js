import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as quizRules from '../../src/games/quiz/rules.js';

const PAYTABLE = { 1: 1.5, 2: 2, 3: 3, 4: 5, 5: 10 };
const BETS = [{ type: 'main', amount: 10 }];

function questions(count = 5) {
  return Array.from({ length: count }, (_, index) => ({
    id: `q${index + 1}`,
    question: `Question ${index + 1}?`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: index % 4,
  }));
}

function start(raw = questions(), config = { paytable: PAYTABLE }) {
  return quizRules.start(raw, { bets: BETS, config });
}

describe('quiz rules start', () => {
  it('starts a five-question round with answer actions and no correct answer in the view', () => {
    const session = start();

    assert.equal(session.needsDraw, true);
    assert.deepEqual(session.availableActions, ['answer-0', 'answer-1', 'answer-2', 'answer-3']);
    assert.deepEqual(quizRules.view({ phase: 'playing', session }), {
      questionId: 'q1',
      question: 'Question 1?',
      options: ['A', 'B', 'C', 'D'],
      questionNumber: 1,
      totalQuestions: 5,
      answered: false,
    });
    assert.equal(JSON.stringify(quizRules.view({ phase: 'playing', session })).includes('correctIndex'), false);
  });

  it('rejects an invalid bank, fewer than five questions, invalid bets, or missing paytable entries', () => {
    assert.throws(() => start(questions(4)), /at least 5 questions/);
    assert.throws(() => start([{ ...questions()[0], id: '' }, ...questions().slice(1)]), /valid question/);
    assert.throws(() => start([questions()[0], ...questions().slice(0, 4)]), /unique/);
    assert.throws(() => quizRules.start(questions(), { bets: [{ type: 'main', amount: 0 }], config: { paytable: PAYTABLE } }), /positive/);
    assert.throws(() => start(questions(), { paytable: { ...PAYTABLE, 3: undefined } }), /paytable\.3/);
  });

  it('validates all questions and copies the selected questions', () => {
    const bank = questions();
    const session = start(bank);
    bank[0].options[0] = 'changed';

    assert.equal(session.questions[0].options[0], 'A');
    assert.throws(
      () => start([questions()[0], { ...questions()[1], correctIndex: 4 }, ...questions().slice(2)]),
      /valid question/
    );
  });
});

describe('quiz rules step', () => {
  it('reveals the correction only after an answer and advances with next', () => {
    const initial = start();
    const answered = quizRules.step(initial, 'answer-0');

    assert.equal(answered.correctAnswers, 1);
    assert.deepEqual(answered.availableActions, ['next', 'stop']);
    assert.deepEqual(quizRules.view({ phase: 'playing', session: answered }), {
      questionId: 'q1',
      question: 'Question 1?',
      options: ['A', 'B', 'C', 'D'],
      questionNumber: 1,
      totalQuestions: 5,
      answered: true,
      selectedIndex: 0,
      correctIndex: 0,
      isCorrect: true,
    });

    const next = quizRules.step(answered, 'next');
    assert.equal(next.questionIndex, 1);
    assert.deepEqual(next.availableActions, ['answer-0', 'answer-1', 'answer-2', 'answer-3']);
    assert.equal(quizRules.view({ phase: 'playing', session: next }).correctIndex, undefined);
  });

  it('ends on a wrong answer with loss and reveals the correction only in the terminal view', () => {
    const initial = start();
    const result = quizRules.step(initial, 'answer-1');

    assert.equal(result.needsDraw, undefined);
    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
    assert.equal(result.details.correctAnswers, 0);
    assert.equal(quizRules.view({ phase: 'result', gameResult: result }).correctIndex, 0);
    assert.equal(quizRules.view({ phase: 'result', gameResult: result }).selectedIndex, 1);
  });

  it('allows cash-out only after a correct answer, paying the multiplier for the score', () => {
    const initial = start();
    assert.throws(() => quizRules.step(initial, 'stop'), /unsupported action/);

    const answered = quizRules.step(initial, 'answer-0');
    const result = quizRules.step(answered, 'stop');
    assert.deepEqual(result, {
      outcome: 'win',
      multiplier: PAYTABLE[1],
      details: {
        questionId: 'q1',
        question: 'Question 1?',
        options: ['A', 'B', 'C', 'D'],
        selectedIndex: 0,
        correctIndex: 0,
        correctAnswers: 1,
        questionsAnswered: 1,
        totalQuestions: 5,
      },
    });
  });

  it('finishes automatically after five correct answers using paytable[5]', () => {
    let state = start();
    for (let index = 0; index < 5; index += 1) {
      state = quizRules.step(state, `answer-${index % 4}`);
      if (index < 4) state = quizRules.step(state, 'next');
    }

    assert.equal(state.outcome, 'win');
    assert.equal(state.multiplier, PAYTABLE[5]);
    assert.equal(state.details.correctAnswers, 5);
    assert.equal(state.details.questionsAnswered, 5);
  });

  it('rejects unsupported actions and does not mutate the input session', () => {
    const initial = start();
    const snapshot = structuredClone(initial);

    assert.throws(() => quizRules.step(initial, 'answer-4'), /unsupported action/);
    assert.deepEqual(initial, snapshot);
  });
});
