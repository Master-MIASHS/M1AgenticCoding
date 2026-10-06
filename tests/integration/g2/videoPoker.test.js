import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createGame } from '../../../src/games/_template/createGame.js';
import { RANKS, SUITS } from '../../../src/games/cardUtils.js';
import { drawVideoPoker } from '../../../src/games/video-poker/draw.js';
import { videoPokerRules } from '../../../src/games/video-poker/rules.js';

const PAYTABLE = {
  10: 250,
  9: 50,
  8: 25,
  7: 9,
  6: 6,
  5: 4,
  4: 3,
  3: 2,
  2: 1,
};

function makeDeckWithHand(hand) {
  const handKeys = new Set(hand.map(({ rank, suit }) => `${rank}:${suit}`));
  const remaining = SUITS.flatMap((suit) =>
    RANKS.filter((rank) => !handKeys.has(`${rank}:${suit}`)).map((rank) => ({ rank, suit }))
  );
  return [...hand.map((card) => ({ ...card })), ...remaining];
}

describe('video poker createGame integration', () => {
  it('renders only the filtered view and settles exactly once after draw', () => {
    const shuffledDeck = makeDeckWithHand([
      { rank: '10', suit: 'hearts' },
      { rank: 'J', suit: 'hearts' },
      { rank: 'Q', suit: 'hearts' },
      { rank: 'K', suit: 'hearts' },
      { rank: 'A', suit: 'hearts' },
    ]);
    const playCalls = [];
    const shuffledDecks = [];
    const game = createGame({
      id: 'video-poker',
      rules: videoPokerRules,
      config: { paytable: PAYTABLE },
      core: {
        melanger(cards) {
          shuffledDecks.push(cards);
          return shuffledDeck;
        },
        play(gameId, bet, gameResult) {
          playCalls.push({ gameId, bet, gameResult });
          return { newBalance: 1240, xpGained: 10, leveledUp: false };
        },
      },
      draw: drawVideoPoker,
    });

    let response = game.start({ type: 'main', amount: 1 });
    assert.equal(shuffledDecks.length, 1);
    assert.equal(shuffledDecks[0].length, 52);
    assert.deepEqual(response.availableActions, [
      'hold-0',
      'hold-1',
      'hold-2',
      'hold-3',
      'hold-4',
      'draw',
    ]);
    assert.deepEqual(response.renderPayload.view.hand, shuffledDeck.slice(0, 5));
    assert.equal('raw' in response.renderPayload, false);
    assert.equal(JSON.stringify(response).includes(JSON.stringify(shuffledDeck[12])), false);

    for (let index = 0; index < 5; index += 1) {
      response = game.action(response.sessionId, `hold-${index}`);
      assert.deepEqual(
        response.renderPayload.view.held,
        Array.from({ length: 5 }, (_, position) => position <= index)
      );
      assert.equal('raw' in response.renderPayload, false);
    }
    const result = game.action(response.sessionId, 'draw');

    assert.equal(result.terminal, true);
    assert.deepEqual(result.renderPayload.view.result, {
      outcome: 'win',
      multiplier: 250,
      category: 10,
      tiebreakers: [14],
    });
    assert.deepEqual(playCalls, [
      { gameId: 'video-poker', bet: 1, gameResult: result.gameResult },
    ]);
    assert.equal(shuffledDecks.length, 1, 'actions must not request additional randomness');
    assert.equal(result.gameResult.multiplier, 250);
    assert.equal('raw' in result.renderPayload, false);
  });
});
