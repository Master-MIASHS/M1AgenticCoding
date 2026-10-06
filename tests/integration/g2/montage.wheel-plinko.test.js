// ---------------------------------------------------------------------------
// Tests d'intégration G2 - montage des VRAIES règles wheel / plinko (#26, #128)
// sur l'orchestrateur et le vrai mock du Core (issue #68)
// ---------------------------------------------------------------------------
// Chaîne testée : start(bets) -> roll() (fixture) -> rules.resolve() ->
// gameResult -> coreService.play() (vrai mock G1) -> réponse pour G3.
//
// roll() est remplacé par des tirages déjà mis en forme (segment, index de
// case), comme les rendront tirageAvecPoids / tirageEntier (§ 4.1, PR #115).
// Les tests marqués `todo` documentent un écart connu entre le contrat et le
// code : ils ne font pas échouer la suite, mais leur échec reste visible.
// Ils devront passer une fois l'écart corrigé, et perdre alors leur `todo`.
// ---------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../../src/services/coreService.js';
import { createGame } from '../../../src/games/_template/createGame.js';
import * as wheelRules from '../../../src/games/wheel/rules.js';
import * as plinkoRules from '../../../src/games/plinko/rules.js';
import { makeFixtureDraw } from '../../fixtures/g2/rolls.js';

// Solde du mock d'état G1 (src/core/state.js) au moment de l'écriture.
const START_BALANCE = coreService.getState().balance;

// Configurations de test : la forme est celle proposée par les règles
// (§ 6 encore ouvert), les valeurs sont arbitraires et propres au test.
const WHEEL_CONFIG = {
  bets: {
    red: { match: { color: 'red' }, multiplier: 2 },
    blue: { match: { color: 'blue' }, multiplier: 3 },
  },
};
const PLINKO_CONFIG = { paytable: [0, 0.5, 1, 2, 5] };

/** Core de test : vrai mock coreService, roll() remplacé, play() espionné. */
function makeTestCore(draws) {
  const fixture = makeFixtureDraw(draws);
  const playCalls = [];
  const core = {
    ...coreService,
    roll: fixture.roll,
    play: (gameId, bet, gameResult) => {
      playCalls.push({ gameId, bet, gameResult });
      return coreService.play(gameId, bet, gameResult);
    },
  };
  return { core, rollCalls: fixture.calls, playCalls };
}

describe('G2 - montage wheel (#26) : orchestrateur + règles + Core', () => {
  test('mise simple gagnante : gameResult conforme et solde réglé par le Core', () => {
    const segment = { id: 's3', color: 'red', label: 'x2' };
    const { core, playCalls } = makeTestCore([segment]);
    const game = createGame({ id: 'wheel', rules: wheelRules, config: WHEEL_CONFIG, core });

    const res = game.start([{ type: 'red', amount: 10 }]);

    assert.equal(res.terminal, true);
    assert.equal(res.gameResult.outcome, 'win');
    assert.equal(res.gameResult.multiplier, 2);
    assert.equal('payout' in res.gameResult, false, 'pas de payout au premier niveau (§ 2.2)');
    assert.deepEqual(res.renderPayload.raw, segment, 'G3 reçoit le segment tiré pour l\'animation');
    assert.equal(playCalls.length, 1);
    assert.equal(playCalls[0].bet, 10);
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE + 10);
  });

  test('mises multiples (option A, #73) : un seul play(), mise totale et multiplicateur agrégé', () => {
    const { core, playCalls } = makeTestCore([{ id: 's1', color: 'red' }]);
    const game = createGame({ id: 'wheel', rules: wheelRules, config: WHEEL_CONFIG, core });

    const res = game.start([
      { type: 'red', amount: 10 },
      { type: 'blue', amount: 5 },
    ]);

    // 10 x 2 reversés sur 15 misés -> multiplier 20 / 15, gain net 5.
    assert.equal(playCalls.length, 1);
    assert.equal(playCalls[0].bet, 15);
    assert.equal(res.gameResult.outcome, 'win');
    assert.ok(Math.abs(res.gameResult.multiplier - 20 / 15) < 1e-12);
    assert.equal(res.gameResult.details.bets.length, 2, 'détail par mise dans details');
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE + 5);
  });

  test(
    'écart 8 : le vrai roll() du Core peut alimenter les règles de la roue',
    {
      todo:
        'écart 8 (#68) : mécanisme draw fusionné (#141) ; reste le draw de la roue ' +
        '(@camseveyrat, config selon #122) et tirageAvecPoids exposé (#115)',
    },
    () => {
      const game = createGame({ id: 'wheel', rules: wheelRules, config: WHEEL_CONFIG });
      assert.doesNotThrow(() => game.start([{ type: 'red', amount: 10 }]));
    }
  );
});

describe('G2 - montage plinko (#26) : orchestrateur + règles + Core', () => {
  for (const { slot, outcome, delta } of [
    { slot: 3, outcome: 'win', delta: 10 },
    { slot: 2, outcome: 'push', delta: 0 },
    { slot: 0, outcome: 'loss', delta: -10 },
  ]) {
    test(`case ${slot} -> ${outcome}, solde ${delta >= 0 ? '+' : ''}${delta}`, () => {
      const { core, rollCalls, playCalls } = makeTestCore([slot]);
      const game = createGame({ id: 'plinko', rules: plinkoRules, config: PLINKO_CONFIG, core });

      const res = game.start([{ type: 'slot', amount: 10 }]);

      assert.equal(rollCalls.length, 1);
      assert.equal(res.gameResult.outcome, outcome);
      assert.equal(res.gameResult.details.slot, slot);
      assert.equal(playCalls[0].bet, 10);
      assert.equal(res.renderPayload.economy.newBalance, START_BALANCE + delta);
    });
  }

  test('écart 9 (résolu, #135) : un multiplicateur fractionnaire se règle sans erreur', () => {
    // Mise 1 sur la case 1 (x0,5) : les règles disent `loss` (multiplier < 1),
    // ce que le Core accepte ; 0,5 jeton reversé, arrondi au centième (#135).
    const { core } = makeTestCore([1]);
    const game = createGame({ id: 'plinko', rules: plinkoRules, config: PLINKO_CONFIG, core });
    const res = game.start([{ type: 'slot', amount: 1 }]);
    assert.equal(res.gameResult.outcome, 'loss');
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE - 0.5);
  });
});
