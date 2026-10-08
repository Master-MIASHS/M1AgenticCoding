// ---------------------------------------------------------------------------
// Tests d'intégration G2 - montage des VRAIES règles slots / scratch (#31)
// sur l'orchestrateur et le vrai mock du Core (issue #68)
// ---------------------------------------------------------------------------
// Chaîne testée : start(bets) -> tirage -> rules.resolve() ->
// gameResult -> coreService.play() (vrai Core G1) -> réponse pour G3.
//
// Scratch lit directement le float public de roll() (`raw.value`). Slots a
// besoin de trois symboles : son propre draw (src/games/slots/draw.js,
// écart 8, #68) les tire via core.tirageAvecPoids() — un test le monte sur le
// VRAI Core, les autres rejouent des tirages préparés via la fixture.
//
// Les tables de gains et la distribution des symboles sont INJECTÉES via
// `config` (règle absolue 4) : les valeurs ci-dessous sont arbitraires et
// propres au test, seule la forme compte encore (point ouvert #122).
//
// Chaque partie n'appelle play() qu'UNE fois (§ 4.3), et outcome / multiplier
// vont toujours ensemble côté Core (win > 1, loss < 1, push = 1) : les règles
// déduisent l'outcome du multiplicateur, jamais de la config.
// ---------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../../src/services/coreService.js';
import { createGame } from '../../../src/games/_template/createGame.js';
import * as slotsRules from '../../../src/games/slots/rules.js';
import * as scratchRules from '../../../src/games/scratch/rules.js';
import { drawSlots } from '../../../src/games/slots/draw.js';
import { makeFixtureRoll, makeFixtureDraw } from '../../fixtures/g2/rolls.js';

// Solde du mock d'état G1 (src/core/state.js) au moment de l'écriture.
const START_BALANCE = coreService.getState().balance;
const MISE = { type: 'mise', amount: 10 };

// Deux symboles par rouleau : A sous 0,5, B au-dessus. Les huit combinaisons
// sont présentes pour ne pas lever "no payout for combination". Seul le
// multiplicateur est porté par la config : l'outcome en est déduit.
const SLOTS_CONFIG = {
  symbols: {
    bands: [
      { max: 0.5, symbol: 'A' },
      { max: 1, symbol: 'B' },
    ],
  },
  paytable: {
    AAA: { multiplier: 5 },
    BBB: { multiplier: 2 },
    ABA: { multiplier: 1 },
    AAB: { multiplier: 0 },
    ABB: { multiplier: 0 },
    BAA: { multiplier: 0 },
    BAB: { multiplier: 0 },
    BBA: { multiplier: 0 },
  },
};

const SCRATCH_CONFIG = {
  paytable: {
    bands: [
      { max: 0.4, symbol: 'brebis', multiplier: 0 },
      { max: 0.8, symbol: 'trèfle', multiplier: 2 },
      { max: 1, symbol: 'couronne', multiplier: 5 },
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
    const raw = { gameId: 'slots', symbols: ['A', 'A', 'A'], nonce: 1 };
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
    const raw = { gameId: 'slots', symbols: ['A', 'A', 'B'], nonce: 1 };
    const { core } = makeTestCore(makeFixtureDraw([raw]));
    const game = createGame({ id: 'slots', rules: slotsRules, config: SLOTS_CONFIG, core });

    const res = game.start([MISE]);

    assert.equal(res.gameResult.outcome, 'loss');
    assert.equal(res.gameResult.multiplier, 0);
    assert.equal(res.gameResult.details.combination, 'AAB');
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE - 10);
  });

  test('combinaison en égalité : la mise est rendue', () => {
    const raw = { gameId: 'slots', symbols: ['A', 'B', 'A'], nonce: 1 };
    const { core } = makeTestCore(makeFixtureDraw([raw]));
    const game = createGame({ id: 'slots', rules: slotsRules, config: SLOTS_CONFIG, core });

    const res = game.start([MISE]);

    assert.equal(res.gameResult.outcome, 'push');
    assert.equal(res.gameResult.multiplier, 1);
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE);
  });

  test('G3 reçoit les rouleaux tirés et leur interprétation', () => {
    const symbols = ['B', 'B', 'B'];
    const raw = { gameId: 'slots', symbols, nonce: 1 };
    const { core, rollCalls } = makeTestCore(makeFixtureDraw([raw]));
    const game = createGame({ id: 'slots', rules: slotsRules, config: SLOTS_CONFIG, core });

    const res = game.start([MISE]);

    assert.equal(rollCalls.length, 1, 'un seul tirage par partie');
    assert.deepEqual(res.renderPayload.raw.symbols, symbols, 'les rouleaux partent tels quels à G3');
    assert.equal(res.renderPayload.interpretation.combination, 'BBB');
    assert.deepEqual(
      res.renderPayload.interpretation,
      res.gameResult.details,
      'l\'interprétation de G3 est celle du gameResult'
    );
  });

  test('gameResult au format du contrat : { outcome, multiplier, details }', () => {
    const raw = { gameId: 'slots', symbols: ['A', 'A', 'A'], nonce: 1 };
    const { core } = makeTestCore(makeFixtureDraw([raw]));
    const game = createGame({ id: 'slots', rules: slotsRules, config: SLOTS_CONFIG, core });

    const { gameResult } = game.start([MISE]);

    assert.deepEqual(Object.keys(gameResult).sort(), ['details', 'multiplier', 'outcome']);
    assert.deepEqual(Object.keys(gameResult.details).sort(), [
      'combination',
      'stake',
      'symbols',
    ]);
  });

  test('un outcome de config en contradiction avec le multiplicateur ne fait pas échouer play()', () => {
    // Relecture #216 : l'outcome vient du multiplicateur, la config ne porte
    // que ce dernier — economy.js n'a donc jamais de paire incohérente à rejeter.
    const incoherent = {
      symbols: SLOTS_CONFIG.symbols,
      paytable: { AAA: { outcome: 'loss', multiplier: 5 } },
    };
    const raw = { gameId: 'slots', symbols: ['A', 'A', 'A'], nonce: 1 };
    const { core, playCalls } = makeTestCore(makeFixtureDraw([raw]));
    const game = createGame({ id: 'slots', rules: slotsRules, config: incoherent, core });

    const res = game.start([MISE]);

    assert.equal(res.gameResult.outcome, 'win', 'outcome déduit du multiplicateur 5');
    assert.equal(playCalls.length, 1, 'play() est appelé sans lever d\'erreur');
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE + 40);
  });

  test('le VRAI Core tire les trois rouleaux via tirageAvecPoids (draw du jeu, écart 8)', () => {
    // Aucun draw maison : le draw officiel du jeu demande ses trois symboles
    // à core.tirageAvecPoids(), avec la distribution configurée en poids.
    const game = createGame({
      id: 'slots',
      rules: slotsRules,
      config: SLOTS_CONFIG,
      draw: drawSlots,
    });

    for (let i = 0; i < 20; i += 1) {
      const res = game.start([MISE]);
      const { symbols } = res.renderPayload.raw;

      assert.equal(symbols.length, 3, 'trois rouleaux');
      assert.ok(
        symbols.every((symbol) => symbol === 'A' || symbol === 'B'),
        'chaque symbole vient de la distribution configurée'
      );
      const combination = symbols.join('');
      const payout = SLOTS_CONFIG.paytable[combination];
      assert.equal(res.gameResult.multiplier, payout.multiplier);
      assert.equal(
        res.gameResult.outcome,
        payout.multiplier > 1 ? 'win' : payout.multiplier < 1 ? 'loss' : 'push',
        'outcome toujours déduit du multiplicateur'
      );
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
      const band = SCRATCH_CONFIG.paytable.bands.find((candidate) => value < candidate.max);
      assert.equal(res.gameResult.multiplier, band.multiplier);
      assert.equal(
        res.gameResult.outcome,
        band.multiplier > 1 ? 'win' : band.multiplier < 1 ? 'loss' : 'push',
        'outcome toujours déduit du multiplicateur'
      );
      assert.equal(
        res.renderPayload.economy.newBalance,
        START_BALANCE + 10 * (band.multiplier - 1)
      );
    }
  });
});
