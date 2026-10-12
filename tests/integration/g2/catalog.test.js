// ---------------------------------------------------------------------------
// Tests d'intégration G2 - catalogue des jeux (src/games/catalog.js)
// ---------------------------------------------------------------------------
// Pour CHAQUE jeu du catalogue : createGameFromCatalog() -> start() -> actions
// jusqu'à la fin -> vrai coreService.play() (persistant, #287). Le hasard est
// celui du vrai Core : on vérifie des invariants, jamais un tirage précis.
// C'est la preuve que l'application peut brancher n'importe quel jeu du
// catalogue avec sa seule config (contrat G2 § 5.4).
// ---------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as coreService from '../../../src/services/coreService.js';
import {
  GAME_CATALOG,
  CATALOG_GAME_IDS,
  INSTANT,
  MULTI_STEP,
  createGameFromCatalog,
  getGameDefinition,
} from '../../../src/games/catalog.js';
import { GAME_FIXTURES } from '../../fixtures/g2/configs.js';

// Action choisie quand plusieurs sont possibles : on va vers la fin de la
// manche. Le poker se couche : voir le test `todo` plus bas (actions du bot
// proposées au joueur au début d'une nouvelle rue).
const PREFERRED_ACTIONS = {
  poker: ['fold'],
  default: ['draw', 'stand', 'stop', 'continue', 'next'],
};

function pickAction(gameId, availableActions) {
  const preferred = PREFERRED_ACTIONS[gameId] ?? PREFERRED_ACTIONS.default;
  return preferred.find((action) => availableActions.includes(action)) ?? availableActions[0];
}

/** Joue une manche complète sur UNE instance et renvoie la réponse finale. */
function playOneRound(game, gameId, bets) {
  let response = game.start(bets);
  let steps = 0;
  while (!response.terminal) {
    assert.ok(response.availableActions.length > 0, `${gameId} : une manche en cours propose des actions`);
    response = game.action(response.sessionId, pickAction(gameId, response.availableActions));
    steps += 1;
    assert.ok(steps < 100, `${gameId} : la manche doit se terminer`);
  }
  return response;
}

describe('G2 - catalogue des jeux (contrat § 5.4)', () => {
  test('le catalogue couvre les 13 jeux dont les règles sont sur main', () => {
    assert.deepEqual([...CATALOG_GAME_IDS].sort(), [
      'baccarat', 'bingo', 'blackjack', 'dice', 'memory', 'plinko', 'poker',
      'quiz', 'roulette', 'scratch', 'slots', 'video-poker', 'wheel',
    ]);
  });

  test('chaque id existe dans le catalogue du Core (GAMES, niveaux de déblocage)', () => {
    for (const gameId of CATALOG_GAME_IDS) {
      assert.ok(Object.hasOwn(coreService.GAMES, gameId), `${gameId} absent de GAMES`);
    }
  });

  test('le type déclaré correspond à l’interface des règles', () => {
    for (const [gameId, { kind, rules }] of Object.entries(GAME_CATALOG)) {
      if (kind === INSTANT) {
        assert.equal(typeof rules.resolve, 'function', `${gameId} : resolve()`);
      } else {
        assert.equal(kind, MULTI_STEP);
        assert.equal(typeof rules.start, 'function', `${gameId} : start()`);
        assert.equal(typeof rules.step, 'function', `${gameId} : step()`);
        assert.equal(typeof rules.view, 'function', `${gameId} : view() (§ 5.2)`);
      }
    }
  });

  test('un jeu absent du catalogue est refusé, sans valeur inventée', () => {
    assert.equal(getGameDefinition('inconnu'), undefined);
    assert.throws(() => createGameFromCatalog('inconnu', {}), RangeError);
  });

  test('sans config, les règles refusent de jouer (règle 4)', () => {
    const game = createGameFromCatalog('dice');
    assert.throws(() => game.start(GAME_FIXTURES.dice.bets));
  });

  for (const gameId of CATALOG_GAME_IDS) {
    test(`${gameId} : une manche complète avec le vrai Core, réglée une fois`, () => {
      const { config, bets } = GAME_FIXTURES[gameId];
      const playCalls = [];
      const core = {
        ...coreService,
        play: (id, bet, gameResult, options) => {
          playCalls.push({ bet, options });
          return coreService.play(id, bet, gameResult, options);
        },
      };
      const game = createGameFromCatalog(gameId, { config, core });
      const balanceBefore = coreService.getState().balance;

      const end = playOneRound(game, gameId, bets);

      const { gameResult } = end;
      assert.deepEqual(Object.keys(gameResult).sort(), ['details', 'multiplier', 'outcome']);
      const { outcome, multiplier } = gameResult;
      assert.equal(outcome, multiplier > 1 ? 'win' : multiplier === 1 ? 'push' : 'loss');
      assert.equal(playCalls.length, 1, 'un seul play() par manche (§ 4.3)');
      assert.match(playCalls[0].options.roundId, new RegExp(`^${gameId}-`), 'roundId transmis (#218)');

      // Solde par différence (play() persistant) : mise réglée × (multiplicateur − 1).
      const stake = playCalls[0].bet;
      const expected = balanceBefore - stake + Math.round(stake * multiplier * 100) / 100;
      assert.ok(Math.abs(end.renderPayload.economy.newBalance - expected) < 0.011);

      if (GAME_CATALOG[gameId].kind === MULTI_STEP) {
        assert.ok('view' in end.renderPayload, 'jeu multi-étapes : G3 lit la view()');
        assert.equal('raw' in end.renderPayload, false, 'ni paquet ni tirage brut envoyés à G3');
      }
    });
  }

  test('poker : au début d’une nouvelle rue, les actions proposées sont celles du JOUEUR (#413)', () => {
    // Le joueur suit jusqu'au tapis ou à l'abattage ; à chaque étape, l'action
    // proposée doit être acceptée par action() (aucune erreur) et la session
    // en cours attend toujours le joueur.
    for (let round = 0; round < 60; round += 1) {
      const game = createGameFromCatalog('poker', { config: GAME_FIXTURES.poker.config });
      let response = game.start(GAME_FIXTURES.poker.bets);
      while (!response.terminal) {
        const choice = ['check', 'call'].find((a) => response.availableActions.includes(a)) ?? 'fold';
        response = game.action(response.sessionId, choice);
      }
    }
  });
});
