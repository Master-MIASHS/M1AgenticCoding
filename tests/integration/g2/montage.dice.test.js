// ---------------------------------------------------------------------------
// Tests d'intégration G2 - montage des VRAIES règles des dés (#24, #140)
// sur l'orchestrateur et le vrai mock du Core (issue #68)
// ---------------------------------------------------------------------------
// Chaîne testée : start(bets) -> roll() (fixture) -> diceRules.resolve() ->
// gameResult -> coreService.play() (vrai Core G1, #135) -> réponse pour G3.
//
// Les règles fusionnées par #140 lisent encore un float par lancer (brut de
// roll()) : la fixture rejoue donc des { value } (0 -> total 2, 0.5 -> 7,
// 0.99 -> 12). Le brut [d1, d2] du contrat (§ 4.1) reste à faire dans #159.
// ---------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../../src/services/coreService.js';
import { createGame } from '../../../src/games/_template/createGame.js';
import { diceRules } from '../../../src/games/dice/rules.js';
import { makeFixtureRoll } from '../../fixtures/g2/rolls.js';

// play() est persistant (#131, #218) : le solde est lu juste avant de jouer,
// et chaque test vérifie le gain par différence.
function playDice(rollValue) {
  const fixture = makeFixtureRoll([rollValue]);
  const core = { ...coreService, roll: fixture.roll };
  const balanceBefore = coreService.getState().balance;
  const res = createGame({ id: 'dice', rules: diceRules, core }).start([{ type: 'pass', amount: 10 }]);
  return { res, balanceBefore };
}

describe('G2 - montage dés (#24) : orchestrateur + règles + Core', () => {
  test('premier lancer 2 : perdu, la mise est retenue', () => {
    const { res, balanceBefore } = playDice(0);
    assert.equal(res.terminal, true);
    assert.equal(res.gameResult.outcome, 'loss');
    assert.equal(res.renderPayload.economy.newBalance, balanceBefore - 10);
  });

  test('premier lancer 7 : gagné 1:1, la partie se règle sans erreur', () => {
    const { res, balanceBefore } = playDice(0.5);
    assert.equal(res.gameResult.outcome, 'win');
    assert.equal(res.gameResult.multiplier, 2, 'mise incluse (§ 2.2)');
    assert.equal(res.renderPayload.economy.newBalance, balanceBefore + 10);
  });

  test('premier lancer 12 : égalité, la mise est rendue', () => {
    const { res, balanceBefore } = playDice(0.99);
    assert.equal(res.gameResult.outcome, 'push');
    assert.equal(res.gameResult.multiplier, 1, 'mise incluse (§ 2.2)');
    assert.equal(res.renderPayload.economy.newBalance, balanceBefore);
  });

  test('gameResult au format du contrat : { outcome, multiplier, details }', () => {
    const { gameResult } = playDice(0).res;
    assert.deepEqual(Object.keys(gameResult).sort(), ['details', 'multiplier', 'outcome']);
  });

  test('G3 lit le déroulé de la manche dans renderPayload.interpretation (#159)', () => {
    const { res } = playDice(0.5);
    assert.deepEqual(res.renderPayload.interpretation.rolls, [7]);
    assert.equal(res.renderPayload.interpretation.point, null);
  });
});
