import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createGame } from '../../../src/games/_template/createGame.js';
import { drawMemory } from '../../../src/games/memory/draw.js';
import { memoryRules } from '../../../src/games/memory/rules.js';

const SYMBOLS = [
  'chip',
  'card',
  'dice',
  'roulette-wheel',
  'slot-machine',
  'horseshoe',
  'bell',
  'jackpot',
];
const PAYTABLE = Object.fromEntries(
  Array.from({ length: 9 }, (_, index) => [String(index + 8), 20 - index])
);

describe('Memory createGame integration', () => {
  it('uses one shuffled board, hides unmatched symbols, and settles a completed game once', () => {
    const shuffledBoard = SYMBOLS.flatMap((symbol) => [{ symbol }, { symbol }]);
    const shuffledInputs = [];
    const settlements = [];
    const game = createGame({
      id: 'memory',
      rules: memoryRules,
      config: { paytable: PAYTABLE },
      core: {
        melanger(cards) {
          shuffledInputs.push(cards);
          return shuffledBoard;
        },
        play(gameId, bet, gameResult) {
          settlements.push({ gameId, bet, gameResult });
          return { newBalance: 110, xpGained: 10, leveledUp: false };
        },
      },
      draw: drawMemory,
    });

    let response = game.start({ type: 'main', amount: 10 });
    assert.equal(shuffledInputs.length, 1);
    assert.equal(shuffledInputs[0].length, 16);
    assert.deepEqual(response.availableActions, Array.from({ length: 16 }, (_, i) => `reveal-${i}`));
    assert.equal(response.renderPayload.view.cards[0].symbol, null);
    assert.equal('raw' in response.renderPayload, false);

    for (let pair = 0; pair < 8; pair += 1) {
      response = game.action(response.sessionId, `reveal-${pair * 2}`);
      assert.equal(response.renderPayload.view.cards[pair * 2].symbol, SYMBOLS[pair]);
      assert.equal(response.renderPayload.view.cards[pair * 2 + 1].symbol, null);
      assert.equal(
        response.renderPayload.view.cards.some(({ symbol }) => symbol === SYMBOLS[pair + 1]),
        false
      );
      response = game.action(response.sessionId, `reveal-${pair * 2 + 1}`);
      if (pair < 7) {
        assert.equal(response.terminal, false);
      }
    }

    assert.equal(response.terminal, true);
    assert.equal(response.gameResult.outcome, 'win');
    assert.equal(response.gameResult.multiplier, PAYTABLE[8]);
    assert.equal(settlements.length, 1);
    assert.equal(settlements[0].bet, 10);
    assert.deepEqual(response.renderPayload.view.cards.map(({ symbol }) => symbol), [
      ...SYMBOLS.flatMap((symbol) => [symbol, symbol]),
    ]);
    assert.equal(shuffledInputs.length, 1, 'actions must not request more randomness');
  });

  it('keeps a mismatched pair visible until G3 sends continue, without revealing other symbols', () => {
    const shuffledBoard = [
      'chip', 'card', 'chip', 'card',
      'dice', 'dice', 'roulette-wheel', 'roulette-wheel',
      'slot-machine', 'slot-machine', 'horseshoe', 'horseshoe',
      'bell', 'bell', 'jackpot', 'jackpot',
    ].map((symbol) => ({ symbol }));
    const game = createGame({
      id: 'memory',
      rules: memoryRules,
      config: { paytable: PAYTABLE },
      core: {
        melanger: () => shuffledBoard,
        play: () => ({ newBalance: 90, xpGained: 10, leveledUp: false }),
      },
      draw: drawMemory,
    });

    let response = game.start({ type: 'main', amount: 10 });
    response = game.action(response.sessionId, 'reveal-0');
    response = game.action(response.sessionId, 'reveal-1');

    assert.deepEqual(response.availableActions, ['continue']);
    assert.deepEqual(
      response.renderPayload.view.cards.slice(0, 4).map(({ symbol }) => symbol),
      ['chip', 'card', null, null]
    );
    assert.equal(response.renderPayload.view.pendingMismatch, true);

    response = game.action(response.sessionId, 'continue');
    assert.equal(response.terminal, false);
    assert.deepEqual(
      response.renderPayload.view.cards.slice(0, 4).map(({ symbol }) => symbol),
      [null, null, null, null]
    );
    assert.equal(response.renderPayload.view.pendingMismatch, false);
    assert.ok(response.availableActions.includes('reveal-0'));
  });
});
