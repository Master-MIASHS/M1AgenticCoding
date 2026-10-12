// ---------------------------------------------------------------------------
// Tests d'intégration G2 - montage vidéo poker (#24, #68)
// Chaîne testée : start -> (hold) -> draw -> videoPokerRules -> gameResult ->
// coreService.play() (vrai Core G1) -> réponse pour G3.
// La combinatorie est figée via une fixture de core.melanger ; le SOLDE, lui,
// est réglé par le Core : chaque test vérifie le règlement par différence,
//   newBalance = balanceAvant + mise × (multiplicateur - 1)   (mise incluse)
// ---------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../../src/services/coreService.js';
import { createGame } from '../../../src/games/_template/createGame.js';
import { RANKS, SUITS } from '../../../src/games/cardUtils.js';
import { drawVideoPoker } from '../../../src/games/video-poker/draw.js';
import { videoPokerRules } from '../../../src/games/video-poker/rules.js';

const PAYTABLE = {
  10: 250,
  9: 50,
  8: 25,
  7: 9,
  6: 6,
  5: 4,
  4: 3,
  3: 2,
  2: 1,
};

function makeDeckWithHand(hand) {
  const handKeys = new Set(hand.map(({ rank, suit }) => `${rank}:${suit}`));
  const remaining = SUITS.flatMap((suit) =>
    RANKS.filter((rank) => !handKeys.has(`${rank}:${suit}`)).map((rank) => ({ rank, suit }))
  );
  return [...hand.map((card) => ({ ...card })), ...remaining];
}

function playVideoPokerFixture(hand) {
  const core = { ...coreService, melanger: () => makeDeckWithHand(hand) };
  const balanceBefore = coreService.getState().balance;
  const game = createGame({
    id: 'video-poker',
    rules: videoPokerRules,
    config: { paytable: PAYTABLE },
    core,
    draw: drawVideoPoker,
  });
  let res = game.start({ type: 'main', amount: 1 });
  for (let index = 0; index < 5; index += 1) {
    res = game.action(res.sessionId, `hold-${index}`);
  }
  res = game.action(res.sessionId, 'draw');
  return { res, balanceBefore };
}

describe('G2 - montage vidéo poker : orchestrateur + règles + Core', () => {
  test('quinte flush royale : gagné ×250, le solde suit le Core par différence', () => {
    const royalFlush = ['10', 'J', 'Q', 'K', 'A'].map((rank) => ({ rank, suit: 'hearts' }));
    const { res, balanceBefore } = playVideoPokerFixture(royalFlush);

    assert.equal(res.terminal, true);
    assert.equal(res.gameResult.outcome, 'win');
    assert.equal(res.gameResult.multiplier, 250);
    assert.equal(res.renderPayload.economy.newBalance, balanceBefore + 1 * (250 - 1));
  });

  test('paire d’As (jacks or better) : la mise est rendue (push ×1)', () => {
    const pairOfAces = [
      { rank: 'A', suit: 'hearts' },
      { rank: 'A', suit: 'spades' },
      { rank: '2', suit: 'clubs' },
      { rank: '4', suit: 'diamonds' },
      { rank: '9', suit: 'hearts' },
    ];
    const { res, balanceBefore } = playVideoPokerFixture(pairOfAces);

    assert.equal(res.terminal, true);
    assert.equal(res.gameResult.outcome, 'push');
    assert.equal(res.gameResult.multiplier, 1);
    assert.equal(res.renderPayload.economy.newBalance, balanceBefore);
  });

  test('main sans paire : perdu, la mise est retenue', () => {
    const noPair = [
      { rank: '2', suit: 'hearts' },
      { rank: '4', suit: 'spades' },
      { rank: '6', suit: 'clubs' },
      { rank: '9', suit: 'diamonds' },
      { rank: 'Q', suit: 'hearts' },
    ];
    const { res, balanceBefore } = playVideoPokerFixture(noPair);

    assert.equal(res.terminal, true);
    assert.equal(res.gameResult.outcome, 'loss');
    assert.equal(res.gameResult.multiplier, 0);
    assert.equal(res.renderPayload.economy.newBalance, balanceBefore - 1);
  });

  test('le VRAI Core règle n’importe quel tirage (aucune fixture)', () => {
    const balanceBefore = coreService.getState().balance;
    const game = createGame({
      id: 'video-poker',
      rules: videoPokerRules,
      config: { paytable: PAYTABLE },
      core: coreService,
      draw: drawVideoPoker,
    });
    const opened = game.start({ type: 'main', amount: 1 });
    const res = game.action(opened.sessionId, 'draw');

    assert.equal(res.terminal, true);
    assert.ok(['win', 'push', 'loss'].includes(res.gameResult.outcome));
    assert.equal(
      res.renderPayload.economy.newBalance,
      balanceBefore + 1 * (res.gameResult.multiplier - 1)
    );
  });
});