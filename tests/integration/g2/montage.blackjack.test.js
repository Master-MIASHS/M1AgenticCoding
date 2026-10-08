// ---------------------------------------------------------------------------
// Tests d'intégration G2 - montage des VRAIES règles du blackjack (#189)
// sur l'orchestrateur et le vrai mock du Core (issue #68)
// ---------------------------------------------------------------------------
// Chaîne testée : start(bets) -> draw(core) = melanger(buildDeck(1)) ->
// rules.start() -> action('hit' | 'stand' | 'double') -> rules.step() ->
// gameResult -> coreService.play() (vrai mock G1) -> réponse pour G3.
//
// melanger() est remplacé par un mélange contrôlé (les cartes voulues en tête
// du paquet, le reste ensuite), pour obtenir des mains connues. Tout le reste
// est le vrai code : orchestrateur, règles, deck.js et mock du Core.
// ---------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../../src/services/coreService.js';
import { createGame } from '../../../src/games/_template/createGame.js';
import * as blackjackRules from '../../../src/games/blackjack/rules.js';
import { draw as blackjackDraw } from '../../../src/games/blackjack/index.js';

// Solde du mock d'état G1 (src/core/state.js) au moment de l'écriture.
const START_BALANCE = coreService.getState().balance;

// Configuration de test : forme de #189 (§ 6 encore ouvert, #122).
const CONFIG = { paytable: { blackjack: 2.5, win: 2 } };
const BETS = [{ type: 'main', amount: 10 }];

/**
 * Builds a card from a string rank and a string suit.
 *
 * @param {string} rank
 * @param {string} suit
 * @returns {{ rank: string, suit: string }}
 */
function card(rank, suit) {
  return { rank, suit };
}

/**
 * Core de test : vrai mock coreService, melanger() contrôlé, play() espionné.
 * Le mélange met `first` en tête du paquet reçu, dans cet ordre, puis le reste.
 *
 * @param {Array<{ rank: string, suit: string }>} first - cartes à distribuer en premier.
 */
function makeTestCore(first) {
  const shuffleCalls = [];
  const playCalls = [];
  const core = {
    ...coreService,
    melanger: (list) => {
      shuffleCalls.push(list.length);
      const isFirst = (c) => first.some((f) => f.rank === c.rank && f.suit === c.suit);
      const head = first.map((f) => list.find((c) => c.rank === f.rank && c.suit === f.suit));
      return [...head, ...list.filter((c) => !isFirst(c))];
    },
    play: (gameId, bet, gameResult) => {
      playCalls.push({ gameId, bet, gameResult });
      return coreService.play(gameId, bet, gameResult);
    },
  };
  return { core, shuffleCalls, playCalls };
}

/**
 * Crée la partie de blackjack sur l'orchestrateur, avec le tirage du jeu.
 *
 * @param {object} core - Core de test.
 */
function makeGame(core) {
  return createGame({
    id: 'blackjack',
    rules: blackjackRules,
    config: CONFIG,
    core,
    draw: blackjackDraw,
  });
}

describe('G2 - montage blackjack (#189) : orchestrateur + règles + deck.js + Core', () => {
  test('manche complète (stand gagnant) : un seul mélange, un seul play(), solde réglé', () => {
    // Joueur 10 + 8 = 18 ; croupier 10 + 7 = 17, il reste ; 18 > 17 -> win.
    const { core, shuffleCalls, playCalls } = makeTestCore([
      card('10', 'hearts'),
      card('10', 'spades'),
      card('8', 'diamonds'),
      card('7', 'clubs'),
    ]);
    const game = makeGame(core);

    const opened = game.start(BETS);
    assert.equal(opened.terminal, false);
    assert.deepEqual(opened.availableActions, ['hit', 'stand', 'double']);

    const res = game.action(opened.sessionId, 'stand');
    assert.equal(res.terminal, true);
    assert.equal(res.gameResult.outcome, 'win');
    assert.equal(res.gameResult.multiplier, 2);
    assert.equal(
      shuffleCalls.length,
      1,
      'un seul mélange par manche, aucun hasard pendant les actions'
    );
    assert.equal(shuffleCalls[0], 52, 'un paquet neuf de 1 jeu');
    assert.equal(playCalls.length, 1);
    assert.equal(playCalls[0].bet, 10);
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE + 10);
  });

  test('G3 ne reçoit jamais la carte cachée du croupier ni le paquet pendant la manche', () => {
    const hidden = card('7', 'clubs');
    const { core } = makeTestCore([
      card('10', 'hearts'),
      card('10', 'spades'),
      card('8', 'diamonds'),
      hidden,
    ]);
    const opened = makeGame(core).start(BETS);

    assert.deepEqual(opened.renderPayload.view.dealerHand, [card('10', 'spades')]);
    assert.equal('raw' in opened.renderPayload, false, 'le paquet mélangé ne part pas à G3');
    const text = JSON.stringify(opened);
    assert.ok(!text.includes('"clubs"'), 'aucune trace de la carte cachée');
  });

  test('double : la mise doublée est réglée par le Core (details.totalBet, #166)', () => {
    // Joueur 5 + 6 = 11, double -> 10 = 21 ; croupier 9 + 8 = 17, reste -> win.
    const { core, playCalls } = makeTestCore([
      card('5', 'hearts'),
      card('9', 'spades'),
      card('6', 'diamonds'),
      card('8', 'clubs'),
      card('10', 'hearts'),
    ]);
    const game = makeGame(core);

    const opened = game.start(BETS);
    const res = game.action(opened.sessionId, 'double');
    assert.equal(res.gameResult.outcome, 'win');
    assert.equal(res.gameResult.details.totalBet, 20);
    assert.equal(playCalls[0].bet, 20, 'le Core règle la mise doublée');
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE + 20);
  });

  test('blackjack naturel : manche réglée dès la distribution, gain 3:2', () => {
    const { core, playCalls } = makeTestCore([
      card('A', 'hearts'),
      card('9', 'spades'),
      card('K', 'diamonds'),
      card('8', 'clubs'),
    ]);
    const res = makeGame(core).start(BETS);

    assert.equal(res.terminal, true);
    assert.equal(res.gameResult.outcome, 'win');
    assert.equal(res.gameResult.multiplier, 2.5);
    assert.equal(playCalls.length, 1);
    assert.equal(res.renderPayload.economy.newBalance, START_BALANCE + 15);
  });
});
