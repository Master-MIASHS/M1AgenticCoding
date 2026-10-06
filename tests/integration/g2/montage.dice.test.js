// ---------------------------------------------------------------------------
// Tests d'intégration G2 - montage des VRAIES règles des dés (#24, #140)
// sur l'orchestrateur et le vrai mock du Core (issue #68)
// ---------------------------------------------------------------------------
// Chaîne testée : start(bets) -> roll() (fixture) -> diceRules.resolve() ->
// gameResult -> coreService.play() (vrai Core G1, #135) -> réponse pour G3.
//
// Les règles fusionnées par #140 lisent encore un float par lancer (brut de
// roll()) : la fixture rejoue donc des { value } (0 -> total 2, 0.5 -> 7,
// 0.99 -> 12). Les tests en `todo` documentent l'écart 10 (#159) : ils
// devront passer, et perdre leur `todo`, une fois les règles alignées.
// ---------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../../src/services/coreService.js';
import { createGame } from '../../../src/games/_template/createGame.js';
import { diceRules } from '../../../src/games/dice/rules.js';
import { makeFixtureRoll } from '../../fixtures/g2/rolls.js';

const START_BALANCE = coreService.getState().balance;
const TODO_ECART_10 = 'écart 10 (#159) : multiplier en gain net au lieu de « mise incluse »';

function playDice(rollValue) {
  const fixture = makeFixtureRoll([rollValue]);
  const core = { ...coreService, roll: fixture.roll };
  return createGame({ id: 'dice', rules: diceRules, core }).start([{ type: 'pass', amount: 10 }]);
}

describe('G2 - montage dés (#24) : orchestrateur + règles + Core', () => {
  test('premier lancer 2 : perdu, la mise est retenue', () => {
    const res = playDice(0);
    assert.equal(res.terminal, true);
    assert.equal(res.gameResult.outcome, 'loss');
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE - 10);
  });

  test('premier lancer 7 : gagné 1:1, la partie se règle sans erreur', { todo: TODO_ECART_10 }, () => {
    const res = playDice(0.5);
    assert.equal(res.gameResult.outcome, 'win');
    assert.equal(res.gameResult.multiplier, 2, 'mise incluse (§ 2.2)');
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE + 10);
  });

  test('premier lancer 12 : égalité, la mise est rendue', { todo: TODO_ECART_10 }, () => {
    const res = playDice(0.99);
    assert.equal(res.gameResult.outcome, 'push');
    assert.equal(res.gameResult.multiplier, 1, 'mise incluse (§ 2.2)');
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE);
  });

  test('gameResult au format du contrat : { outcome, multiplier, details }', { todo: TODO_ECART_10 }, () => {
    const { gameResult } = playDice(0);
    assert.deepEqual(Object.keys(gameResult).sort(), ['details', 'multiplier', 'outcome']);
  });
});
