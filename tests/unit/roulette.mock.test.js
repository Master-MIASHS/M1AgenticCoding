// ---------------------------------------------------------------------------
// Unit tests - Roulette UI mock (src/game-ui/roulette/roulette.mock.js)
// ---------------------------------------------------------------------------
// Groupe 3. The mock stands in for the G2 orchestrator until the roulette
// rules are delivered: it must return exactly the shape of start(bets)
// (skill jeux-g2 § 2) and a gameResult that follows the contract (§ 2.2).
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mockStart } from '../../src/game-ui/roulette/roulette.mock.js';

const BET_TYPES = ['red', 'black', 'even', 'odd'];

describe('roulette mock - start(bets)', () => {
  it('returns the instant-game shape of the G2 orchestrator', async () => {
    const res = await mockStart([{ type: 'red', amount: 10 }]);

    assert.equal(typeof res.sessionId, 'string');
    assert.deepEqual(res.availableActions, []);
    assert.equal(res.terminal, true);
    assert.equal(typeof res.renderPayload.number, 'number');
    assert.ok(['red', 'black', 'green'].includes(res.renderPayload.color));
  });

  it('returns a gameResult { outcome, multiplier, details } for every bet type', async () => {
    for (const type of BET_TYPES) {
      const { gameResult } = await mockStart([{ type, amount: 5 }]);

      assert.deepEqual(Object.keys(gameResult).sort(), ['details', 'multiplier', 'outcome']);
      assert.ok(['win', 'loss'].includes(gameResult.outcome));
      // multiplier includes the stake: 0 on a loss, > 1 on a win (contract § 2.2)
      if (gameResult.outcome === 'loss') assert.equal(gameResult.multiplier, 0);
      else assert.ok(gameResult.multiplier > 1);
    }
  });

  it('rejects an unknown bet type instead of inventing a result', async () => {
    await assert.rejects(() => mockStart([{ type: 'straight-17', amount: 5 }]));
  });

  it('rejects the old start(bet, choice) signature', async () => {
    await assert.rejects(() => mockStart(10, 'red'));
  });
});
