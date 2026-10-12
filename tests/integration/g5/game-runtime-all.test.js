// ---------------------------------------------------------------------------
// Tests d'intégration G5 - les 13 jeux branchés via createGameRuntime
// ---------------------------------------------------------------------------
// Pour chaque jeu : plusieurs manches avec le vrai Core, UNE instance par jeu
// (start + action), un seul play() par manche, solde vérifié par différence,
// mise supérieure au solde refusée sans tirage ni play().
// ---------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import '../../helpers/unlock-all-games.js';
import * as coreService from '../../../src/services/coreService.js';
import { createGameRuntime, PLAYABLE_GAMES } from '../../../src/pages/Game/gameRuntime.js';

// Type de mise envoyé par chaque UI G3 (jamais d'autre valeur côté UI).
const UI_BET_TYPE = {
  slots: 'mise', scratch: 'mise', dice: 'pass', wheel: 'red', roulette: 'red', plinko: 'slot',
  baccarat: 'player', blackjack: 'main', 'video-poker': 'main', memory: 'main', quiz: 'main',
  bingo: 'main', poker: 'small-blind',
};
const PREFERRED = ['fold', 'draw', 'stand', 'stop', 'continue', 'next'];
const DRAW_FUNCTIONS = ['roll', 'tirageEntier', 'tirageAvecPoids', 'melanger', 'choisirAction'];

function spyCore() {
  const playCalls = [];
  let draws = 0;
  const core = { ...coreService };
  for (const name of DRAW_FUNCTIONS) {
    core[name] = (...args) => {
      draws += 1;
      return coreService[name](...args);
    };
  }
  core.play = (...args) => {
    playCalls.push(args);
    return coreService.play(...args);
  };
  return { core, playCalls, draws: () => draws };
}

async function playRound(runtime, gameId, amount) {
  let res = await runtime.start([{ type: UI_BET_TYPE[gameId], amount }]);
  let steps = 0;
  while (!res.terminal) {
    assert.equal(typeof runtime.action, 'function', `${gameId} : multi-étapes, action fourni`);
    const choice = PREFERRED.find((a) => res.availableActions.includes(a)) ?? res.availableActions[0];
    res = await runtime.action(res.sessionId, choice);
    steps += 1;
    assert.ok(steps < 100, `${gameId} : la manche doit se terminer`);
  }
  return res;
}

describe('G5 - gameRuntime : les 13 jeux sur le vrai Core', () => {
  test('les 13 jeux sont branchés', () => {
    assert.equal(PLAYABLE_GAMES.length, 13);
    assert.ok(PLAYABLE_GAMES.includes('baccarat') && PLAYABLE_GAMES.includes('poker'));
    assert.equal(createGameRuntime('inconnu'), undefined);
  });

  for (const gameId of PLAYABLE_GAMES) {
    test(`${gameId} : 5 manches, un play() par manche, solde par différence`, async () => {
      const { core, playCalls } = spyCore();
      const runtime = createGameRuntime(gameId, core);
      const amount = gameId === 'poker' ? runtime.config.smallBlind : 10;

      for (let round = 1; round <= 5; round += 1) {
        const before = coreService.getBalance();
        const res = await playRound(runtime, gameId, amount);
        assert.equal(playCalls.length, round, 'un seul play() par manche');
        const [id, stake, gameResult] = playCalls[round - 1];
        assert.equal(id, gameId);
        const expected = before - stake + Math.round(stake * gameResult.multiplier * 100) / 100;
        assert.ok(Math.abs(coreService.getBalance() - expected) < 0.011, 'solde par différence');
        assert.ok(Math.abs(res.renderPayload.economy.newBalance - expected) < 0.011);
        assert.ok(['win', 'loss', 'push'].includes(res.gameResult.outcome));
      }
    });

    test(`${gameId} : une mise supérieure au solde est refusée sans tirage ni play()`, async () => {
      const { core, playCalls, draws } = spyCore();
      const runtime = createGameRuntime(gameId, core);
      const before = coreService.getBalance();
      await assert.rejects(runtime.start([{ type: UI_BET_TYPE[gameId], amount: before + 1 }]));
      assert.equal(playCalls.length, 0);
      assert.equal(draws(), 0, 'aucun tirage');
      assert.equal(coreService.getBalance(), before);
    });
  }

  test('roue et plinko : la config des règles est celle exposée à l\'UI', () => {
    const wheel = createGameRuntime('wheel');
    assert.ok(wheel.config.segments.length >= 2);
    assert.deepEqual(Object.keys(wheel.config.paytable).sort(), ['black', 'gold', 'red']);
    const plinko = createGameRuntime('plinko');
    assert.equal(plinko.config.paytable.length, plinko.config.weights.length);
  });

  test('onRoundSettled est appelé après chaque start/action, même en cas d\'erreur', async () => {
    let calls = 0;
    const runtime = createGameRuntime('slots', undefined, () => { calls += 1; });
    await runtime.start([{ type: 'mise', amount: 1 }]);
    await assert.rejects(runtime.start([{ type: 'mise', amount: 1e9 }]));
    assert.equal(calls, 2);
  });
});
