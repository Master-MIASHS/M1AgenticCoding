// ---------------------------------------------------------------------------
// Tests d'intégration G2 - montage des VRAIES règles du baccarat (#220)
// sur l'orchestrateur et le vrai mock du Core (issue #68)
// ---------------------------------------------------------------------------
// Chaîne testée : start(bets) -> draw(core) = melanger(buildDeck(deckCount)).slice(0,6)
// -> rules.resolve() -> gameResult -> coreService.play() (vrai mock G1) ->
// réponse pour G3. La taille du sabot vient de config.deckCount (règle 4),
// 1 paquet par défaut.
//
// melanger() est remplacé par un mélange contrôlé (les cartes voulues en tête
// du paquet, le reste ensuite), pour obtenir des mains connues. Tout le reste
// est le vrai code : orchestrateur, règles, deck.js et mock du Core.
//
// La table des gains est INJECTÉE via `config` (règle absolue 4) : les valeurs
// ci-dessous sont arbitraires et propres au test, seule la forme compte encore
// (point ouvert #122).
//
// Chaque partie n'appelle play() qu'UNE fois (§ 4.3), et outcome / multiplier
// vont toujours ensemble côté Core (win > 1, loss < 1, push = 1).
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../../src/services/coreService.js';
import { createGame } from '../../../src/games/_template/createGame.js';
import * as baccaratRules from '../../../src/games/baccarat/rules.js';
import { draw as drawBaccarat } from '../../../src/games/baccarat/index.js';

const CONFIG = { paytable: { player: 2, banker: 1.95, tie: 9 } };
const BET_PLAYER = [{ type: 'player', amount: 10 }];

/**
 * Builds a card from a string rank and a string suit.
 *
 * @param {string} rank - '2'..'10' | 'J' | 'Q' | 'K' | 'A'
 * @param {string} suit - 'hearts' | 'diamonds' | 'clubs' | 'spades'
 * @returns {{ rank: string, suit: string }}
 */
function card(rank, suit) {
  return { rank, suit };
}

/**
 * Wraps the real Core mock: melanger() puts the chosen cards first (the rest
 * follows), play() records the settlement while delegating to the real Core.
 *
 * @param {Array<{ rank: string, suit: string }>} first - cards wanted at the head.
 * @returns {{ core: object, shuffleCalls: number[], playCalls: object[] }}
 */
function makeTestCore(first) {
  const shuffleCalls = [];
  const playCalls = [];
  const isChosen = (c) => first.some((f) => f.rank === c.rank && f.suit === c.suit);
  const core = {
    ...coreService,
    melanger: (list) => {
      shuffleCalls.push(list.length);
      const head = first.map((f) => list.find((c) => c.rank === f.rank && c.suit === f.suit));
      return [...head, ...list.filter((c) => !isChosen(c))];
    },
    play: (gameId, bet, gameResult, options) => {
      playCalls.push({
        gameId,
        bet,
        gameResult,
        options,
        balanceBefore: coreService.getState().balance,
      });
      return coreService.play(gameId, bet, gameResult, options);
    },
  };
  return { core, shuffleCalls, playCalls };
}

/**
 * Wraps the real Core mock, recording play() calls only (real randomness).
 *
 * @returns {{ core: object, playCalls: object[] }}
 */
function makeSpyCore() {
  const playCalls = [];
  const core = {
    ...coreService,
    play: (gameId, bet, gameResult, options) => {
      playCalls.push({
        gameId,
        bet,
        gameResult,
        options,
        balanceBefore: coreService.getState().balance,
      });
      return coreService.play(gameId, bet, gameResult, options);
    },
  };
  return { core, playCalls };
}

/**
 * Builds the real baccarat game on the given Core.
 *
 * @param {object} core - Core facade.
 * @returns {object} the createGame instance.
 */
function makeGame(core) {
  return createGame({
    id: 'baccarat',
    rules: baccaratRules,
    config: CONFIG,
    core,
    draw: drawBaccarat,
  });
}

describe('montage baccarat - mains connues (mélange contrôlé)', () => {
  it('joueur gagne : un seul mélange, un seul play(), solde réglé', () => {
    const { core, shuffleCalls, playCalls } = makeTestCore([
      card('3', 'hearts'),
      card('A', 'spades'),
      card('3', 'diamonds'),
      card('K', 'clubs'),
      card('2', 'hearts'),
      card('7', 'clubs'),
    ]);
    const game = makeGame(core);

    const res = game.start(BET_PLAYER);

    assert.strictEqual(res.terminal, true);
    assert.strictEqual(res.gameResult.outcome, 'win');
    assert.strictEqual(res.gameResult.multiplier, 2);
    assert.strictEqual(res.renderPayload.gameId, 'baccarat');
    assert.strictEqual(res.renderPayload.phase, 'result');
    assert.strictEqual(shuffleCalls.length, 1);
    assert.strictEqual(shuffleCalls[0], 52);
    assert.strictEqual(playCalls.length, 1, 'un seul règlement par partie');
    assert.strictEqual(playCalls[0].bet, 10);
    assert.deepStrictEqual(playCalls[0].gameResult, res.gameResult);
    assert.strictEqual(
      res.renderPayload.economy.newBalance,
      playCalls[0].balanceBefore + 10,
      'mise 10 x multiplicateur 2 : +10 de gain net'
    );
  });

  it('banquier gagne : la commission de 5% vient de la config', () => {
    const { core, playCalls } = makeTestCore([
      card('3', 'hearts'),
      card('A', 'spades'),
      card('3', 'diamonds'),
      card('K', 'clubs'),
      card('9', 'hearts'),
      card('7', 'clubs'),
    ]);
    const game = makeGame(core);

    const res = game.start([{ type: 'banker', amount: 10 }]);

    assert.strictEqual(res.gameResult.outcome, 'win');
    assert.strictEqual(res.gameResult.multiplier, 1.95);
    assert.strictEqual(playCalls.length, 1);
    assert.strictEqual(
      res.renderPayload.economy.newBalance,
      playCalls[0].balanceBefore + 9.5,
      'mise 10 x multiplicateur 1.95 : +9,5 de gain net'
    );
  });

  it('égalité : la mise joueur est rendue (push)', () => {
    const { core, playCalls } = makeTestCore([
      card('4', 'hearts'),
      card('4', 'spades'),
      card('4', 'diamonds'),
      card('4', 'clubs'),
      card('7', 'hearts'),
      card('7', 'spades'),
    ]);
    const game = makeGame(core);

    const res = game.start(BET_PLAYER);

    assert.strictEqual(res.gameResult.details.winner, 'tie');
    assert.strictEqual(res.gameResult.outcome, 'push');
    assert.strictEqual(res.gameResult.multiplier, 1);
    assert.strictEqual(res.renderPayload.economy.newBalance, playCalls[0].balanceBefore);
  });

  it('G3 reçoit une view (§ 5.2), jamais le paquet entier ni le draw', () => {
    const dealt = [
      card('3', 'hearts'),
      card('A', 'spades'),
      card('3', 'diamonds'),
      card('K', 'clubs'),
      card('2', 'hearts'),
      card('7', 'clubs'),
    ];
    const { core } = makeTestCore(dealt);
    const game = makeGame(core);

    const res = game.start(BET_PLAYER);

    const view = res.renderPayload.view;
    assert.ok(view, 'la view est exposée pour les jeux de cartes');
    assert.strictEqual(view.phase, 'result');
    assert.deepStrictEqual(view.playerHand, [card('3', 'hearts'), card('3', 'diamonds')]);
    assert.deepStrictEqual(view.bankerHand, [
      card('A', 'spades'),
      card('K', 'clubs'),
      card('2', 'hearts'),
    ]);
    assert.strictEqual(view.playerTotal, 6);
    assert.strictEqual(view.bankerTotal, 2);
    assert.strictEqual(view.winner, 'player');
    assert.strictEqual(view.outcome, 'win');
    assert.ok(!('raw' in res.renderPayload), 'raw jamais exposé à G3');
    assert.ok(!('interpretation' in res.renderPayload), 'details jamais exposés à G3');
  });

  it('config.deckCount pilote la taille du sabot (règle 4)', () => {
    const { core, shuffleCalls } = makeTestCore([
      card('3', 'hearts'),
      card('A', 'spades'),
      card('3', 'diamonds'),
      card('K', 'clubs'),
      card('2', 'hearts'),
      card('7', 'clubs'),
    ]);
    const game = createGame({
      id: 'baccarat',
      rules: baccaratRules,
      config: { paytable: CONFIG.paytable, deckCount: 6 },
      core,
      draw: drawBaccarat,
    });

    game.start(BET_PLAYER);

    assert.strictEqual(shuffleCalls[0], 6 * 52, '6 paquets passent au Core');
  });

  it('rejette un config.deckCount invalide', () => {
    for (const deckCount of [0, -1, 1.5, '6']) {
      const { core } = makeTestCore([
        card('3', 'hearts'),
        card('A', 'spades'),
        card('3', 'diamonds'),
        card('K', 'clubs'),
        card('2', 'hearts'),
        card('7', 'clubs'),
      ]);
      const game = createGame({
        id: 'baccarat',
        rules: baccaratRules,
        config: { paytable: CONFIG.paytable, deckCount },
        core,
        draw: drawBaccarat,
      });
      assert.throws(() => game.start(BET_PLAYER), TypeError, `deckCount=${deckCount}`);
    }
  });
});

describe('montage baccarat - vrai Core sur 30 manches', () => {
  it('un play() par manche, outcome cohérent avec le multiplicateur', () => {
    const { core, playCalls } = makeSpyCore();
    const game = makeGame(core);

    for (let round = 0; round < 30; round += 1) {
      const callsBefore = playCalls.length;
      const balanceBefore = coreService.getState().balance;
      const res = game.start(BET_PLAYER);
      const { gameResult } = res;

      assert.strictEqual(playCalls.length, callsBefore + 1, `manche ${round}: un seul play()`);
      assert.ok(res.renderPayload.view, `manche ${round}: view exposée à G3`);
      assert.strictEqual(res.renderPayload.view.phase, 'result');
      assert.ok(
        res.renderPayload.view.playerHand.every(
          (c) => typeof c.rank === 'string' && typeof c.suit === 'string'
        )
      );
      assert.ok(!('raw' in res.renderPayload), `manche ${round}: raw jamais exposé à G3`);

      const { winner } = gameResult.details;
      const expected = winner === 'player' ? 2 : winner === 'tie' ? 1 : 0;
      assert.strictEqual(gameResult.multiplier, expected, `manche ${round}: winner ${winner}`);
      assert.strictEqual(gameResult.outcome, expected > 1 ? 'win' : expected < 1 ? 'loss' : 'push');
      assert.strictEqual(
        res.renderPayload.economy.newBalance,
        balanceBefore + 10 * (expected - 1),
        `manche ${round}: solde réglé`
      );
    }
  });
});
