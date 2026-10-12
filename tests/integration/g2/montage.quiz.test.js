// ---------------------------------------------------------------------------
// Tests d'intégration G2 - montage quiz « risque ton argent » (#68, #218)
// Chaîne testée : start -> answer -> stop -> quizRules -> gameResult ->
// coreService.play() (vrai Core G1) -> réponse pour G3.
// Le banque de questions est figée via une fixture de core.melanger ; le
// SOLDE, lui, est réglé par le Core : chaque test vérifie le règlement par
// différence,   newBalance = balanceAvant + mise × (multiplicateur - 1).
// ---------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../../src/services/coreService.js';
import { createGame } from '../../../src/games/_template/createGame.js';
import { QUESTION_BANK } from '../../../src/games/quiz/questions.js';
import * as quizRules from '../../../src/games/quiz/rules.js';
import { draw as drawQuiz } from '../../../src/games/quiz/draw.js';

import '../../helpers/unlock-all-games.js';
const CONFIG = { paytable: { 1: 1.5, 2: 2, 3: 3, 4: 5, 5: 10 } };

function playQuiz(core) {
  const balanceBefore = coreService.getState().balance;
  const game = createGame({
    id: 'quiz',
    rules: quizRules,
    config: CONFIG,
    core,
    draw: drawQuiz,
  });
  const opened = game.start({ type: 'main', amount: 10 });
  return { game, opened, balanceBefore };
}

describe('G2 - montage quiz : orchestrateur + règles + Core', () => {
  test('bonne réponse puis stop : gagné ×1.5, le solde suit le Core par différence', () => {
    const core = { ...coreService, melanger: (items) => [...items] };
    const { game, opened, balanceBefore } = playQuiz(core);
    const answered = game.action(opened.sessionId, `answer-${QUESTION_BANK[0].correctIndex}`);
    assert.equal(answered.terminal, false);
    const res = game.action(opened.sessionId, 'stop');

    assert.equal(res.terminal, true);
    assert.equal(res.gameResult.outcome, 'win');
    assert.equal(res.gameResult.multiplier, CONFIG.paytable[1]);
    assert.equal(res.renderPayload.economy.newBalance, balanceBefore + 10 * (CONFIG.paytable[1] - 1));
  });

  test('mauvaise réponse : perdu, la mise est retenue', () => {
    const core = { ...coreService, melanger: (items) => [...items] };
    const wrongIndex = (QUESTION_BANK[0].correctIndex + 1) % 4;
    const { game, opened, balanceBefore } = playQuiz(core);
    const res = game.action(opened.sessionId, `answer-${wrongIndex}`);

    assert.equal(res.terminal, true);
    assert.equal(res.gameResult.outcome, 'loss');
    assert.equal(res.gameResult.multiplier, 0);
    assert.equal(res.renderPayload.economy.newBalance, balanceBefore - 10);
  });

  test('le VRAI Core règle une partie réelle, gagnée ou perdue (aucune fixture)', () => {
    const { game, opened, balanceBefore } = playQuiz(coreService);
    let res = game.action(opened.sessionId, 'answer-0');
    if (!res.terminal) {
      res = game.action(opened.sessionId, 'stop');
    }

    assert.equal(res.terminal, true);
    assert.ok(['win', 'loss', 'push'].includes(res.gameResult.outcome));
    assert.equal(
      res.renderPayload.economy.newBalance,
      balanceBefore + 10 * (res.gameResult.multiplier - 1)
    );
  });
});