// ---------------------------------------------------------------------------
// Tests d'intégration G2 - montage bingo contre les bots (#68, #218)
// Chaîne testée : start -> next x N -> bingoRules -> gameResult ->
// coreService.play() (vrai Core G1) -> réponse pour G3.
// Les grilles et l'ordre des boules sont figés via une fixture de
// core.melanger ; le SOLDE, lui, est réglé par le Core : chaque test vérifie
// le règlement par différence,  newBalance = balanceAvant + mise × (m-1).
// ---------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../../src/services/coreService.js';
import { createGame } from '../../../src/games/_template/createGame.js';
import * as bingoRules from '../../../src/games/bingo/rules.js';
import { draw as drawBingo } from '../../../src/games/bingo/draw.js';

const CONFIG = { botCount: 3, paytable: { win: 4 } };

// Fixture identique à montage de référence : les 4 grilles sont construites
// par rotation successive (boardIndex), toutes identiques en mode push.
function makeMelanger({ identicalBoards = false } = {}) {
  const shuffledInputs = [];
  return (values) => {
    shuffledInputs.push([...values]);
    if (values.length === 15) {
      const boardIndex = Math.floor((shuffledInputs.length - 2) / 5);
      const offset = identicalBoards ? 0 : boardIndex;
      return [...values.slice(offset), ...values.slice(0, offset)];
    }
    return [...values];
  };
}

function playBingo({ identicalBoards = false, melanger } = {}) {
  const core = { ...coreService, melanger: melanger ?? makeMelanger({ identicalBoards }) };
  const balanceBefore = coreService.getState().balance;
  const game = createGame({
    id: 'bingo',
    rules: bingoRules,
    config: CONFIG,
    core,
    draw: drawBingo,
  });
  let res = game.start([{ type: 'main', amount: 10 }]);
  for (let index = 0; index < 75 && !res.terminal; index += 1) {
    res = game.action(res.sessionId, 'next');
  }
  return { res, balanceBefore };
}

describe('G2 - montage bingo : orchestrateur + règles + Core', () => {
  test('victoire du joueur : gagné ×4, le solde suit le Core par différence', () => {
    const { res, balanceBefore } = playBingo();

    assert.equal(res.terminal, true);
    assert.equal(res.gameResult.outcome, 'win');
    assert.equal(res.gameResult.multiplier, CONFIG.paytable.win);
    assert.deepEqual(res.gameResult.details.winnerIds, ['player']);
    assert.equal(
      res.renderPayload.economy.newBalance,
      balanceBefore + 10 * (CONFIG.paytable.win - 1)
    );
  });

  test('le joueur et les bots terminent ensemble : push, la mise est rendue', () => {
    const { res, balanceBefore } = playBingo({ identicalBoards: true });

    assert.equal(res.terminal, true);
    assert.equal(res.gameResult.outcome, 'push');
    assert.equal(res.gameResult.multiplier, 1);
    assert.equal(res.renderPayload.economy.newBalance, balanceBefore);
  });

  test('le VRAI Core règle une partie réellement tirée (aucune fixture)', () => {
    const { res, balanceBefore } = playBingo({ melanger: coreService.melanger });

    assert.equal(res.terminal, true);
    assert.ok(['win', 'loss', 'push'].includes(res.gameResult.outcome));
    assert.equal(
      res.renderPayload.economy.newBalance,
      balanceBefore + 10 * (res.gameResult.multiplier - 1)
    );
  });
});