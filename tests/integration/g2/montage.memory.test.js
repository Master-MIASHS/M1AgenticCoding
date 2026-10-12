// ---------------------------------------------------------------------------
// Tests d'intégration G2 - montage memory (#68, #218)
// Chaîne testée : start -> reveal -> memoryRules -> gameResult ->
// coreService.play() (vrai Core G1) -> réponse pour G3.
// La combinaison de cartes est figée via une fixture de core.melanger ; le
// SOLDE, lui, est réglé par le Core : le test vérifie le règlement par
// différence,   newBalance = balanceAvant + mise × (multiplicateur - 1).
//
// Pas de cas « vrai mélange » ici : les symboles sont masqués à l'écran, un
// plateau réellement aléatoire n'est donc pas résolvable de façon honnête
// (contrairement à videoPoker/quiz/bingo). Le règlement réel du Core est déjà
// exercé par le scénario déterministe ci-dessous, qui traverse une partie
// gagnante complète.
// ---------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../../src/services/coreService.js';
import { createGame } from '../../../src/games/_template/createGame.js';
import { drawMemory } from '../../../src/games/memory/draw.js';
import { memoryRules } from '../../../src/games/memory/rules.js';

import '../../helpers/unlock-all-games.js';
const SYMBOLS = [
  'chip',
  'card',
  'dice',
  'roulette-wheel',
  'slot-machine',
  'horseshoe',
  'bell',
  'jackpot',
];
const PAYTABLE = Object.fromEntries(
  Array.from({ length: 9 }, (_, index) => [String(index + 8), 20 - index])
);

function playMemoryPerfect() {
  const core = {
    ...coreService,
    melanger: () => SYMBOLS.flatMap((symbol) => [{ symbol }, { symbol }]),
  };
  const balanceBefore = coreService.getState().balance;
  const game = createGame({
    id: 'memory',
    rules: memoryRules,
    config: { paytable: PAYTABLE },
    core,
    draw: drawMemory,
  });
  let res = game.start({ type: 'main', amount: 10 });
  for (let pair = 0; pair < 8; pair += 1) {
    res = game.action(res.sessionId, `reveal-${pair * 2}`);
    res = game.action(res.sessionId, `reveal-${pair * 2 + 1}`);
  }
  return { res, balanceBefore };
}

describe('G2 - montage memory : orchestrateur + règles + Core', () => {
  test('toutes les paires en 8 tours : gagné ×20, le solde suit le Core par différence', () => {
    const { res, balanceBefore } = playMemoryPerfect();

    assert.equal(res.terminal, true);
    assert.equal(res.gameResult.outcome, 'win');
    assert.equal(res.gameResult.multiplier, PAYTABLE[8]);
    assert.equal(res.renderPayload.economy.newBalance, balanceBefore + 10 * (PAYTABLE[8] - 1));
  });
});