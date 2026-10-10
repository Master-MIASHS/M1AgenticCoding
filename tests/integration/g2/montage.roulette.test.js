// ---------------------------------------------------------------------------
// Tests d'intégration G2 - montage des VRAIES règles de la roulette (#191)
// sur l'orchestrateur et le vrai mock du Core (issue #68)
// ---------------------------------------------------------------------------
// Chaîne testée : start(bets) -> draw(core) = core.tirageEntier(0, 36) ->
// rules.resolve() -> gameResult -> coreService.play() (vrai mock G1) ->
// réponse pour G3.
//
// tirageEntier() est remplacé par une séquence contrôlée de nombres entiers,
// comme les rendra la primitive du Core (contrat § 4.1, PR #115). Tout le
// reste est le vrai code : orchestrateur, règles et mock du Core.
// ---------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../../src/services/coreService.js';
import { createGame } from '../../../src/games/_template/createGame.js';
import * as rouletteRules from '../../../src/games/roulette/rules.js';
import { draw as rouletteDraw } from '../../../src/games/roulette/index.js';

// Solde du mock d'état G1 (src/core/state.js) au moment de l'écriture.
const START_BALANCE = coreService.getState().balance;

/**
 * European roulette red numbers. Test fixture data only: in the real game
 * this layout comes from the admin configuration, never from the source.
 */
const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACKS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

// Configuration de test : paytable injectée (règle 4, aucun gain en dur).
const CONFIG = {
  bets: {
    'straight-17': { match: [17], multiplier: 36 },
    red: { match: REDS, multiplier: 2 },
    black: { match: BLACKS, multiplier: 2 },
    zero: { match: [0], multiplier: 2 },
  },
};

/**
 * Core de test : vrai mock coreService, tirageEntier() contrôlé, play() espionné.
 *
 * @param {number[]} numbers - nombres à tirer dans l'ordre, un par spin.
 */
function makeTestCore(numbers) {
  const queue = [...numbers];
  const drawCalls = [];
  const playCalls = [];
  const core = {
    ...coreService,
    tirageEntier: (min, max) => {
      drawCalls.push([min, max]);
      if (queue.length === 0) {
        throw new Error(`fixture tirageEntier(): plus de tirage disponible (appel n°${drawCalls.length})`);
      }
      return queue.shift();
    },
    play: (gameId, bet, gameResult) => {
      playCalls.push({ gameId, bet, gameResult });
      return coreService.play(gameId, bet, gameResult);
    },
  };
  return { core, drawCalls, playCalls };
}

/**
 * Crée la partie de roulette sur l'orchestrateur, avec le tirage du jeu.
 *
 * @param {object} core - Core de test.
 */
function makeGame(core) {
  return createGame({
    id: 'roulette',
    rules: rouletteRules,
    config: CONFIG,
    core,
    draw: rouletteDraw,
  });
}

describe('G2 - montage roulette (#191) : orchestrateur + règles + draw + Core', () => {
  test('spin gagnant : draw -> resolve -> un seul play(), solde réglé par le Core', () => {
    const { core, drawCalls, playCalls } = makeTestCore([17]);
    const game = makeGame(core);

    const res = game.start([{ type: 'straight-17', amount: 10 }]);

    assert.equal(res.terminal, true);
    assert.deepEqual(drawCalls, [[0, 36]], 'un seul tirage, bornes 0..36 incluses');
    assert.equal(res.renderPayload.raw, 17, 'G3 reçoit le nombre tiré pour l\'animation');
    assert.equal(res.renderPayload.interpretation.color, 'black', 'G3 lit la couleur dans interpretation (décision #191)');
    assert.equal(res.gameResult.outcome, 'win');
    assert.equal(res.gameResult.multiplier, 36);
    assert.equal(res.gameResult.details.totalBet, 10);
    assert.equal(playCalls.length, 1);
    assert.equal(playCalls[0].bet, 10);
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE + 350);
  });

  test('spin perdant : outcome loss et perte de la mise entière', () => {
    // 17 n'est pas rouge dans le layout européen : la mise rouge perd.
    const { core, playCalls } = makeTestCore([17]);
    const game = makeGame(core);

    const res = game.start([{ type: 'red', amount: 10 }]);

    assert.equal(res.terminal, true);
    assert.equal(res.gameResult.outcome, 'loss');
    assert.equal(res.gameResult.multiplier, 0);
    assert.equal(playCalls[0].bet, 10);
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE - 10);
  });

  test('mises multiples : un seul play(), mise totale et multiplicateur agrégé', () => {
    // Sur 17 : red perd (10), straight gagne 360 -> payout 360 / totalBet 20.
    const { core, playCalls } = makeTestCore([17]);
    const game = makeGame(core);

    const res = game.start([
      { type: 'red', amount: 10 },
      { type: 'straight-17', amount: 10 },
    ]);

    assert.equal(playCalls.length, 1);
    assert.equal(playCalls[0].bet, 20, 'le Core règle la mise totale');
    assert.equal(res.gameResult.outcome, 'win');
    assert.equal(res.gameResult.multiplier, 18);
    assert.equal(res.gameResult.details.bets.length, 2, 'détail par mise dans details');
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE + 340);
  });

  test('le 0 se règle sur la config, pas en dur : `zero` gagne, `red` perd', () => {
    // Le 0 n'est dans aucun match sauf celui configuré pour lui (#191) :
    // c'est la paytable admin qui décide, pas le code des règles.
    const { core, playCalls } = makeTestCore([0]);
    const game = makeGame(core);

    const res = game.start([
      { type: 'zero', amount: 10 },
      { type: 'red', amount: 10 },
    ]);

    assert.equal(res.gameResult.outcome, 'push', 'gain du zero (20) compensant la mise rouge perdue (20)');
    assert.equal(res.gameResult.multiplier, 1, '10 x 2 reversés sur 20 misés');
    assert.equal(res.gameResult.details.bets[0].won, true, 'la mise zero gagne sur 0');
    assert.equal(res.gameResult.details.bets[1].won, false, 'la mise rouge perd sur 0');
    assert.equal(playCalls[0].bet, 20);
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE + 0);
  });

  test('le VRAI Core tire le nombre via draw + tirageEntier (invariants)', () => {
    // Sans fixture : vrai RNG du Core. On vérifie des invariants, jamais un
    // tirage précis (contrat § 4.1).
    const game = createGame({
      id: 'roulette',
      rules: rouletteRules,
      config: CONFIG,
      draw: rouletteDraw,
    });

    for (let i = 0; i < 20; i += 1) {
      const res = game.start([{ type: 'red', amount: 1 }]);
      const raw = res.renderPayload.raw;
      assert.ok(Number.isInteger(raw) && raw >= 0 && raw <= 36, `entier 0..36, reçu ${raw}`);
      const won = REDS.includes(raw);
      assert.equal(res.gameResult.outcome, won ? 'win' : 'loss');
      assert.equal(res.gameResult.multiplier, won ? 2 : 0);
      const expectedColor = raw === 0 ? 'green' : won ? 'red' : 'black';
      assert.equal(
        res.renderPayload.interpretation.color,
        expectedColor,
        `couleur #191 pour ${raw}`,
      );
    }
  });
});
