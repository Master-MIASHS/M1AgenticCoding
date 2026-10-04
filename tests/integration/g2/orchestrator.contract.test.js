// ---------------------------------------------------------------------------
// Tests d'intégration G2 - orchestrateur + règles + mock du Core (issue #68)
// ---------------------------------------------------------------------------
// Ces tests sont écrits à partir du CONTRAT G2 v0.3 (issue #68), pas du code
// actuel de l'orchestrateur. Ils servent de tests d'acceptation pour la
// prochaine PR de createGame() (#22) : ils échouent sur l'ancienne version
// (PR #81, fermée) et doivent passer une fois les écarts du § 8 corrigés.
//
// Core utilisé : le VRAI mock exposé par src/services/coreService.js
// (notamment play() de core/economy.js), avec une seule exception :
// roll() est remplacé par une fixture déterministe (critère d'acceptation de
// #68 : aucun Math.random(), aucun appel au vrai RNG).
//
// Règles utilisées : règles factices minimales, conformes au § 3. Elles
// seront remplacées par src/games/dice/rules.js dès la fusion de #24.
//
// Points volontairement NON testés car encore OUVERTS dans le contrat :
//   - contenu du renderPayload (§ 5.2) : on vérifie seulement sa présence ;
//   - forme exacte de l'ouverture de manche start() côté règles (§ 3.2) ;
//   - source de la config admin (§ 6) : on vérifie seulement sa transmission.
// ---------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../../src/services/coreService.js';
import { createGame } from '../../../src/games/_template/createGame.js';
import { makeFixtureRoll, ROLLS } from '../../fixtures/g2/rolls.js';

const OUTCOMES = ['win', 'loss', 'push'];

/**
 * Core de test : vrai mock coreService, roll() remplacé par une fixture,
 * play() espionné (on enregistre les arguments puis on appelle le vrai play()).
 */
function makeTestCore(rollValues) {
  const fixture = makeFixtureRoll(rollValues);
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

/** Vérifie le format gameResult validé avec G1 (§ 2.2). */
function assertGameResult(gameResult) {
  assert.ok(gameResult, 'gameResult doit être présent');
  assert.ok(OUTCOMES.includes(gameResult.outcome), `outcome invalide : ${gameResult.outcome}`);
  assert.equal(typeof gameResult.multiplier, 'number', 'multiplier doit être un nombre');
  assert.equal(typeof gameResult.details, 'object', 'details doit être un objet');
  assert.notEqual(gameResult.details, null, 'details ne doit pas être null');
  assert.equal('payout' in gameResult, false, 'payout ne fait plus partie du contrat (§ 2.2)');
}

// --- Règles factices --------------------------------------------------------

/** Jeu instantané (§ 3.1) : resolve(raw, { bets, config }) -> gameResult. */
function makeInstantRules() {
  const calls = [];
  return {
    calls,
    resolve(raw, ctx) {
      calls.push({ raw, ctx });
      const win = raw.value < 0.5;
      return {
        outcome: win ? 'win' : 'loss',
        multiplier: win ? ctx.config.multipliers.win : 0,
        details: { value: raw.value },
      };
    },
  };
}

/**
 * Jeu multi-étapes (§ 3.2) : step(session, action, raw).
 * 'hit' demande un nouveau tirage (needsDraw), 'stand' termine la partie.
 */
function makeMultiStepRules() {
  const stepCalls = [];
  return {
    stepCalls,
    // Forme de start() côté règles encore OUVERTE (§ 3.2) : on accepte
    // n'importe quelle signature et on ne fait aucune assertion dessus.
    start() {
      return { cards: 1, availableActions: ['hit', 'stand'] };
    },
    step(session, action, raw) {
      stepCalls.push({ session, action, raw });
      if (action === 'hit') {
        return { ...session, cards: session.cards + 1, needsDraw: true };
      }
      return { outcome: 'push', multiplier: 1, details: { cards: session.cards } };
    },
  };
}

const CONFIG = { multipliers: { win: 2 }, probabilities: {} };

// --- Tests ------------------------------------------------------------------

describe('G2 - contrat orchestrateur (v0.3)', () => {
  test('§ 5.1 - createGame expose start() et action()', () => {
    const { core } = makeTestCore(ROLLS.single);
    const game = createGame({ id: 'dice', rules: makeInstantRules(), config: CONFIG, core });
    assert.equal(typeof game.start, 'function', 'start(bets) manquant (écart § 8 n°1)');
    assert.equal(typeof game.action, 'function', 'action(sessionId, playerAction) manquant (écart § 8 n°1)');
  });

  describe('jeu instantané : mise -> roll() -> resolve() -> gameResult -> play()', () => {
    test('§ 5.1 / § 2.2 - start(bets) renvoie terminal: true et un gameResult conforme', () => {
      const { core } = makeTestCore(ROLLS.single);
      const game = createGame({ id: 'dice', rules: makeInstantRules(), config: CONFIG, core });

      const res = game.start([{ type: 'under', amount: 10 }]);

      assert.equal(res.terminal, true);
      assert.ok(res.sessionId !== undefined, 'sessionId attendu (§ 5.1)');
      assert.equal(typeof res.renderPayload, 'object', 'renderPayload attendu à chaque étape (§ 5.1)');
      assert.deepEqual(res.availableActions, [], 'aucune action pour un jeu instantané (§ 5.3)');
      assertGameResult(res.gameResult);
    });

    test('§ 1 - un seul roll() pour un jeu instantané, fait par l\'orchestrateur', () => {
      const { core, rollCalls } = makeTestCore(ROLLS.single);
      const game = createGame({ id: 'dice', rules: makeInstantRules(), config: CONFIG, core });
      game.start([{ type: 'under', amount: 10 }]);
      assert.equal(rollCalls.length, 1);
      assert.equal(rollCalls[0].gameId, 'dice');
    });

    test('§ 2.1 - les règles reçoivent toujours bets sous forme de tableau', () => {
      const { core } = makeTestCore(ROLLS.single);
      const rules = makeInstantRules();
      const game = createGame({ id: 'dice', rules, config: CONFIG, core });
      game.start([{ type: 'under', amount: 10 }]);
      assert.ok(Array.isArray(rules.calls[0].ctx.bets));
      assert.deepEqual(rules.calls[0].ctx.bets, [{ type: 'under', amount: 10 }]);
    });

    test('§ 6 - la config est transmise aux règles : resolve(raw, { bets, config })', () => {
      const { core } = makeTestCore(ROLLS.single);
      const rules = makeInstantRules();
      const game = createGame({ id: 'dice', rules, config: CONFIG, core });
      game.start([{ type: 'under', amount: 10 }]);
      assert.deepEqual(rules.calls[0].ctx.config, CONFIG, 'config non transmise aux règles (écart § 8 n°6)');
      assert.equal(rules.calls[0].raw.value, ROLLS.single[0], 'les règles reçoivent le tirage brut de roll()');
    });

    test('§ 4.3 - play() est appelé une seule fois, avec la mise totale (un nombre)', () => {
      const { core, playCalls } = makeTestCore(ROLLS.single);
      const game = createGame({ id: 'roulette', rules: makeInstantRules(), config: CONFIG, core });

      const res = game.start([
        { type: 'red', amount: 10 },
        { type: 'straight-17', amount: 5 },
      ]);

      assert.equal(playCalls.length, 1, 'play() doit être appelé exactement une fois');
      assert.equal(playCalls[0].gameId, 'roulette');
      assert.equal(playCalls[0].bet, 15, 'play() doit recevoir la somme des mises, pas le tableau (écart § 8 n°4)');
      assert.deepEqual(playCalls[0].gameResult, res.gameResult);
    });
  });

  describe('jeu multi-étapes : start -> action(hit) -> action(stand)', () => {
    test('§ 5.1 - start(bets) renvoie terminal: false, un sessionId et les actions possibles', () => {
      const { core, playCalls } = makeTestCore(ROLLS.multiStep);
      const game = createGame({ id: 'blackjack', rules: makeMultiStepRules(), config: CONFIG, core });

      const res = game.start([{ type: 'main', amount: 20 }]);

      assert.equal(res.terminal, false);
      assert.ok(res.sessionId !== undefined, 'sessionId attendu (§ 5.1)');
      assert.equal(typeof res.renderPayload, 'object', 'renderPayload attendu à chaque étape (§ 5.1)');
      assert.ok(Array.isArray(res.availableActions) && res.availableActions.length > 0);
      assert.equal(res.gameResult, undefined, 'gameResult seulement quand terminal: true (§ 5.1)');
      assert.equal(playCalls.length, 0, 'play() ne doit pas être appelé avant la fin');
    });

    test('§ 3.2 - step(session, action, raw) reçoit l\'action du joueur et le tirage brut', () => {
      const { core } = makeTestCore(ROLLS.multiStep);
      const rules = makeMultiStepRules();
      const game = createGame({ id: 'blackjack', rules, config: CONFIG, core });

      const { sessionId } = game.start([{ type: 'main', amount: 20 }]);
      game.action(sessionId, 'hit');

      assert.ok(rules.stepCalls.length >= 1, 'step() doit être appelé (écart § 8 n°2)');
      const first = rules.stepCalls[0];
      assert.equal(first.action, 'hit', 'step() doit recevoir l\'action du joueur en 2e argument');
      assert.equal(typeof first.session, 'object', 'step() doit recevoir la session en 1er argument');
      assert.ok(first.raw && typeof first.raw.value === 'number', 'step() doit recevoir le tirage brut en 3e argument');
    });

    test('§ 3.2 / § 4.3 - partie complète : needsDraw géré, play() une seule fois à la fin', () => {
      const { core, rollCalls, playCalls } = makeTestCore(ROLLS.multiStep);
      const game = createGame({ id: 'blackjack', rules: makeMultiStepRules(), config: CONFIG, core });

      const started = game.start([{ type: 'main', amount: 20 }]);
      const afterHit = game.action(started.sessionId, 'hit');
      assert.equal(afterHit.terminal, false);
      assert.equal(playCalls.length, 0);

      const end = game.action(started.sessionId, 'stand');
      assert.equal(end.terminal, true);
      assertGameResult(end.gameResult);

      assert.equal(playCalls.length, 1, 'play() doit être appelé exactement une fois');
      assert.equal(playCalls[0].bet, 20, 'play() reçoit la mise totale');
      assert.ok(rollCalls.length <= ROLLS.multiStep.length, 'aucun tirage hors fixtures');
      for (const call of rollCalls) assert.equal(call.gameId, 'blackjack');
    });
  });
});
