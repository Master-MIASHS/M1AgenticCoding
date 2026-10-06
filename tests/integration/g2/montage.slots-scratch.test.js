// ---------------------------------------------------------------------------
// Tests d'intégration G2 - montage des VRAIES règles slots / scratch (#31)
// sur l'orchestrateur et le vrai mock du Core (issue #68)
// ---------------------------------------------------------------------------
// Chaîne testée : start(bets) -> roll() (fixture) -> rules.resolve() ->
// gameResult -> coreService.play() (vrai Core G1) -> réponse pour G3.
//
// Scratch lit directement le float public de roll() (`raw.value`). Slots
// attend trois rouleaux (`raw.values`) alors que roll() n'en renvoie qu'un :
// la fixture joue ici la forme qu'un `draw` de jeu devra produire (écart 8,
// #68), puis un test relève le VRAI Core avec un draw maison.
//
// Les tables de gains et la distribution des symboles sont INJECTÉES via
// `config` (règle absolue 4) : les valeurs ci-dessous sont arbitraires et
// propres au test, seule la forme compte encore (point ouvert #122).
//
// Chaque partie n'appelle play() qu'UNE fois (§ 4.3), et outcome / multiplier
// vont toujours ensemble côté Core (win > 1, loss < 1, push = 1).
// ---------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../../src/services/coreService.js';
import { createGame } from '../../../src/games/_template/createGame.js';
import * as slotsRules from '../../../src/games/slots/rules.js';
import * as scratchRules from '../../../src/games/scratch/rules.js';
import { makeFixtureRoll, makeFixtureDraw } from '../../fixtures/g2/rolls.js';

// Solde du mock d'état G1 (src/core/state.js) au moment de l'écriture.
const START_BALANCE = coreService.getState().balance;
const MISE = { type: 'mise', amount: 10 };

// Deux symboles par rouleau : A sous 0,5, B au-dessus. Les huit combinaisons
// sont présentes pour ne pas lever "no payout for combination".
const SLOTS_CONFIG = {
  symbols: {
    bands: [
      { max: 0.5, symbol: 'A' },
      { max: 1, symbol: 'B' },
    ],
  },
  payouts: {
    AAA: { outcome: 'win', multiplier: 5 },
    BBB: { outcome: 'win', multiplier: 2 },
    ABA: { outcome: 'push', multiplier: 1 },
    AAB: { outcome: 'loss', multiplier: 0 },
    ABB: { outcome: 'loss', multiplier: 0 },
    BAA: { outcome: 'loss', multiplier: 0 },
    BAB: { outcome: 'loss', multiplier: 0 },
    BBA: { outcome: 'loss', multiplier: 0 },
  },
};

const SCRATCH_CONFIG = {
  payouts: {
    bands: [
      { max: 0.4, symbol: 'brebis', outcome: 'loss', multiplier: 0 },
      { max: 0.8, symbol: 'trèfle', outcome: 'win', multiplier: 2 },
      { max: 1, symbol: 'couronne', outcome: 'win', multiplier: 5 },
    ],
  },
};

/**
 * Core de test : vrai mock coreService, roll() remplacé par la fixture,
 * play() espionné pour vérifier l'appel unique (§ 4.3).
 *
 * @param {{ roll: Function, calls: any[] }} fixture fixture de tirage
 * @returns {{ core: object, rollCalls: any[], playCalls: any[] }}
 */
function makeTestCore(fixture) {
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

describe('G2 - montage slots (#31) : orchestrateur + règles + Core', () => {
  test('trois A : jackpot x5, solde réglé par le Core', () => {
    const raw = { gameId: 'slots', values: [0.1, 0.1, 0.1], nonce: 1 };
    const { core, playCalls } = makeTestCore(makeFixtureDraw([raw]));
    const game = createGame({ id: 'slots', rules: slotsRules, config: SLOTS_CONFIG, core });

    const res = game.start([MISE]);

    assert.equal(res.terminal, true);
    assert.equal(res.gameResult.outcome, 'win');
    assert.equal(res.gameResult.multiplier, 5);
    assert.equal('payout' in res.gameResult, false, 'pas de payout au premier niveau (§ 2.2)');
    assert.equal(playCalls.length, 1, 'une seule appelée à play() par partie (§ 4.3)');
    assert.equal(playCalls[0].bet, 10, 'play() reçoit la mise totale en nombre');
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE + 40);
  });

  test('combinaison perdante : la mise est retenue', () => {
    const raw = { gameId: 'slots', values: [0.1, 0.1, 0.9], nonce: 1 };
    const { core } = makeTestCore(makeFixtureDraw([raw]));
    const game = createGame({ id: 'slots', rules: slotsRules, config: SLOTS_CONFIG, core });

    const res = game.start([MISE]);

    assert.equal(res.gameResult.outcome, 'loss');
    assert.equal(res.gameResult.multiplier, 0);
    assert.equal(res.gameResult.details.combination, 'AAB');
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE - 10);
  });

  test('combinaison en égalité : la mise est rendue', () => {
    const raw = { gameId: 'slots', values: [0.1, 0.9, 0.1], nonce: 1 };
    const { core } = makeTestCore(makeFixtureDraw([raw]));
    const game = createGame({ id: 'slots', rules: slotsRules, config: SLOTS_CONFIG, core });

    const res = game.start([MISE]);

    assert.equal(res.gameResult.outcome, 'push');
    assert.equal(res.gameResult.multiplier, 1);
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE);
  });

  test('G3 reçoit les rouleaux tirés et leur interprétation', () => {
    const values = [0.9, 0.9, 0.9];
    const raw = { gameId: 'slots', values, nonce: 1 };
    const { core, rollCalls } = makeTestCore(makeFixtureDraw([raw]));
    const game = createGame({ id: 'slots', rules: slotsRules, config: SLOTS_CONFIG, core });

    const res = game.start([MISE]);

    assert.equal(rollCalls.length, 1, 'un seul tirage par partie');
    assert.deepEqual(res.renderPayload.raw.values, values, 'les rouleaux partent tels quels à G3');
    assert.equal(res.renderPayload.interpretation.combination, 'BBB');
    assert.deepEqual(
      res.renderPayload.interpretation,
      res.gameResult.details,
      'l\'interprétation de G3 est celle du gameResult'
    );
  });

  test('gameResult au format du contrat : { outcome, multiplier, details }', () => {
    const raw = { gameId: 'slots', values: [0.1, 0.1, 0.1], nonce: 1 };
    const { core } = makeTestCore(makeFixtureDraw([raw]));
    const game = createGame({ id: 'slots', rules: slotsRules, config: SLOTS_CONFIG, core });

    const { gameResult } = game.start([MISE]);

    assert.deepEqual(Object.keys(gameResult).sort(), ['details', 'multiplier', 'outcome']);
    assert.deepEqual(Object.keys(gameResult.details).sort(), [
      'combination',
      'reels',
      'stake',
      'symbols',
    ]);
  });

  test('le VRAI Core tire les trois rouleaux (draw maison, écart 8)', () => {
    // roll() ne renvoie qu'un float : le jeu devra produire les trois rouleaux
    // lui-même, via son draw (écart 8, #68) — la disposition des symboles
    // appartient encore à #122. Ici on ne vérifie que des invariants.
    const game = createGame({
      id: 'slots',
      rules: slotsRules,
      config: SLOTS_CONFIG,
      draw: (core) => ({
        gameId: 'slots',
        values: [core.roll('slots').value, core.roll('slots').value, core.roll('slots').value],
      }),
    });

    for (let i = 0; i < 20; i += 1) {
      const res = game.start([MISE]);
      const { values } = res.renderPayload.raw;

      assert.equal(values.length, 3, 'trois rouleaux');
      assert.ok(
        values.every((value) => value >= 0 && value < 1),
        'chaque rouleau est un float dans [0, 1)'
      );
      const combination = values.map((value) => (value < 0.5 ? 'A' : 'B')).join('');
      const payout = SLOTS_CONFIG.payouts[combination];
      assert.equal(res.gameResult.outcome, payout.outcome);
      assert.equal(res.gameResult.multiplier, payout.multiplier);
      assert.equal(
        res.renderPayload.economy.newBalance,
        START_BALANCE + 10 * (payout.multiplier - 1)
      );
    }
  });
});

describe('G2 - montage scratch (#31) : orchestrateur + règles + Core', () => {
  test('grattage gagnant x2 : le sort doublé la mise', () => {
    const { core, rollCalls, playCalls } = makeTestCore(makeFixtureRoll([0.6]));
    const game = createGame({ id: 'scratch', rules: scratchRules, config: SCRATCH_CONFIG, core });

    const res = game.start([MISE]);

    assert.equal(rollCalls.length, 1, 'un seul tirage par partie');
    assert.equal(res.terminal, true);
    assert.equal(res.gameResult.outcome, 'win');
    assert.equal(res.gameResult.multiplier, 2);
    assert.equal(res.gameResult.details.symbol, 'trèfle');
    assert.equal(playCalls.length, 1, 'une seule appelée à play() par partie (§ 4.3)');
    assert.equal(playCalls[0].bet, 10);
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE + 10);
  });

  test('grattage perdant : la mise est retenue', () => {
    const { core } = makeTestCore(makeFixtureRoll([0.2]));
    const game = createGame({ id: 'scratch', rules: scratchRules, config: SCRATCH_CONFIG, core });

    const res = game.start([MISE]);

    assert.equal(res.gameResult.outcome, 'loss');
    assert.equal(res.gameResult.multiplier, 0);
    assert.equal(res.gameResult.details.symbol, 'brebis');
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE - 10);
  });

  test('grattage gagnant x5 : le sort le plus rare', () => {
    const { core } = makeTestCore(makeFixtureRoll([0.9]));
    const game = createGame({ id: 'scratch', rules: scratchRules, config: SCRATCH_CONFIG, core });

    const res = game.start([MISE]);

    assert.equal(res.gameResult.outcome, 'win');
    assert.equal(res.gameResult.multiplier, 5);
    assert.equal(res.gameResult.details.symbol, 'couronne');
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE + 40);
  });

  test('gameResult au format du contrat : { outcome, multiplier, details }', () => {
    const { core } = makeTestCore(makeFixtureRoll([0.6]));
    const game = createGame({ id: 'scratch', rules: scratchRules, config: SCRATCH_CONFIG, core });

    const { gameResult } = game.start([MISE]);

    assert.deepEqual(Object.keys(gameResult).sort(), ['details', 'multiplier', 'outcome']);
    assert.equal(gameResult.details.stake, 10, 'la mise suivie remonte dans details');
  });

  test('le VRAI Core sert de source de tirage (roll() par défaut)', () => {
    // Aucun draw() injecté : scratch tourne déjà avec le rng du Core (§ 4.1).
    const game = createGame({ id: 'scratch', rules: scratchRules, config: SCRATCH_CONFIG });

    for (let i = 0; i < 20; i += 1) {
      const res = game.start([MISE]);
      const { value } = res.renderPayload.raw;

      assert.ok(value >= 0 && value < 1, 'le brut est un float dans [0, 1)');
      const band = SCRATCH_CONFIG.payouts.bands.find((candidate) => value < candidate.max);
      assert.equal(res.gameResult.outcome, band.outcome);
      assert.equal(res.gameResult.multiplier, band.multiplier);
      assert.equal(
        res.renderPayload.economy.newBalance,
        START_BALANCE + 10 * (band.multiplier - 1)
      );
    }
  });
});
