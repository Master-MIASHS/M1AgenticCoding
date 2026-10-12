// ---------------------------------------------------------------------------
// Unit tests - Baccarat UI mock (src/game-ui/baccarat/baccarat.mock.js)
// ---------------------------------------------------------------------------
// Groupe 3. The mock stands in for the G2 orchestrator of an instant game:
// start([{ type: 'player' | 'banker' | 'tie', amount }]) returns the settled
// round, with the hands in gameResult.details and renderPayload.view like the
// G2 rules (#391): the shuffled deck is never sent.
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mockStart } from '../../src/game-ui/baccarat/baccarat.mock.js';

const isCard = (c) => typeof c.rank === 'string' && typeof c.suit === 'string';

describe('baccarat mock - start(bets)', () => {
  it('returns the instant-game shape with the hands in details', async () => {
    const res = await mockStart([{ type: 'player', amount: 10 }]);

    assert.equal(typeof res.sessionId, 'string');
    assert.deepEqual(res.availableActions, []);
    assert.equal(res.terminal, true);
    assert.equal(res.renderPayload.raw, undefined);
    assert.deepEqual(res.renderPayload.view.playerHand, res.gameResult.details.playerHand);
    assert.equal(res.renderPayload.view.winner, res.gameResult.details.winner);
    const { details } = res.gameResult;
    assert.ok(details.playerHand.length >= 2 && details.playerHand.length <= 3);
    assert.ok(details.bankerHand.length >= 2 && details.bankerHand.length <= 3);
    assert.ok([...details.playerHand, ...details.bankerHand].every(isCard));
    assert.ok(['player', 'banker', 'tie'].includes(details.winner));
  });

  it('keeps outcome consistent with the multiplier for every bet type (contract § 2.2)', async () => {
    for (const type of ['player', 'banker', 'tie', 'player', 'banker', 'tie']) {
      const { gameResult } = await mockStart([{ type, amount: 5 }]);
      assert.deepEqual(Object.keys(gameResult).sort(), ['details', 'multiplier', 'outcome']);
      const { multiplier, outcome } = gameResult;
      const expected = multiplier > 1 ? 'win' : multiplier === 1 ? 'push' : 'loss';
      assert.equal(outcome, expected);
    }
  });

  it('rejects an unknown bet type', async () => {
    await assert.rejects(() => mockStart([{ type: 'pair', amount: 5 }]));
  });
});
