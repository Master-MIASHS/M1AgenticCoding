// ---------------------------------------------------------------------------
// Tests d'intégration G5 - branchement des jeux sur la page de jeu
// ---------------------------------------------------------------------------
// Chaîne testée : start(bets) de gameRuntime -> tirage du vrai Core ->
// règles G2 -> coreService.play() -> réponse au format attendu par l'UI G3.
// Seul play() est espionné, pour vérifier qu'il est appelé une fois par manche
// avec la mise et un gameResult cohérent.
// ---------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../../src/services/coreService.js';
import { createGameStart, PLAYABLE_GAMES } from '../../../src/pages/Game/gameRuntime.js';
import { PROVISIONAL_GAME_CONFIGS } from '../../../src/config/gamesProvisional.config.js';

/** Vrai Core, play() espionné. */
function spyCore() {
  const playCalls = [];
  const core = {
    ...coreService,
    play: (gameId, bet, gameResult) => {
      playCalls.push({ gameId, bet, gameResult });
      return coreService.play(gameId, bet, gameResult);
    },
  };
  return { core, playCalls };
}

const OUTCOMES = ['win', 'loss', 'push'];

describe('G5 - gameRuntime : jeux branchés sur le Core', () => {
  test('seuls les jeux ayant règles, tirage et UI sont branchés', () => {
    assert.deepEqual([...PLAYABLE_GAMES].sort(), ['roulette', 'slots']);
    for (const id of ['wheel', 'plinko', 'dice', 'inconnu', '__proto__']) {
      assert.equal(createGameStart(id), undefined, `${id} reste en démonstration`);
    }
  });

  test('slots : 30 manches réelles, symboles tirés par le Core, un play() par manche', async () => {
    const { core, playCalls } = spyCore();
    const start = createGameStart('slots', core);
    const known = PROVISIONAL_GAME_CONFIGS.slots.symbols.bands.map((b) => b.symbol);

    for (let i = 0; i < 30; i += 1) {
      const res = await start([{ type: 'mise', amount: 10 }]);
      assert.equal(res.terminal, true);
      assert.equal(res.renderPayload.raw.symbols.length, 3);
      for (const s of res.renderPayload.raw.symbols) assert.ok(known.includes(s), `symbole ${s}`);
      assert.ok(OUTCOMES.includes(res.gameResult.outcome));
      const triple = new Set(res.renderPayload.raw.symbols).size === 1;
      assert.equal(res.gameResult.outcome, triple ? 'win' : 'loss');
    }
    assert.equal(playCalls.length, 30);
    assert.ok(playCalls.every((c) => c.gameId === 'slots' && c.bet === 10));
  });

  test('roulette : numéro 0-36 tiré par le Core, couleur fournie à l\'UI, gain cohérent', async () => {
    const { core, playCalls } = spyCore();
    const start = createGameStart('roulette', core);
    const { layout } = PROVISIONAL_GAME_CONFIGS.roulette;

    for (let i = 0; i < 30; i += 1) {
      const res = await start([{ type: 'red', amount: 5 }]);
      const n = res.renderPayload.number;
      assert.ok(Number.isInteger(n) && n >= 0 && n <= 36);
      assert.equal(res.renderPayload.raw, n);
      const expectedColor = layout.red.includes(n) ? 'red' : n === 0 ? 'green' : 'black';
      assert.equal(res.renderPayload.color, expectedColor);
      assert.equal(res.gameResult.outcome, expectedColor === 'red' ? 'win' : 'loss');
    }
    assert.equal(playCalls.length, 30);
  });

  test('roulette : les 4 paris de l\'UI G3 existent dans la config', async () => {
    const start = createGameStart('roulette', spyCore().core);
    for (const type of ['red', 'black', 'even', 'odd']) {
      const res = await start([{ type, amount: 1 }]);
      assert.equal(res.terminal, true, type);
    }
  });

  test('une mise supérieure au solde est refusée sans tirage ni play()', async () => {
    const { core, playCalls } = spyCore();
    const start = createGameStart('slots', core);
    const tooMuch = coreService.getBalance() + 1;
    await assert.rejects(start([{ type: 'mise', amount: tooMuch }]), RangeError);
    assert.equal(playCalls.length, 0);
  });
});
