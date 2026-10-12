// ---------------------------------------------------------------------------
// Unit tests - Scratch UI mock (src/game-ui/scratch/scratch.mock.js)
// ---------------------------------------------------------------------------
// Groupe 3. The mock stands in for the G2 orchestrator: it must return exactly
// the shape of start(bets) (skill jeux-g2 § 2), with
// gameResult.details = { symbol, value, stake } like the real rules (#216).
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mockStart } from '../../src/game-ui/scratch/scratch.mock.js';

describe('scratch mock - start(bets)', () => {
  it('returns the instant-game shape of the G2 orchestrator', async () => {
    const res = await mockStart([{ type: 'mise', amount: 10 }]);

    assert.equal(typeof res.sessionId, 'string');
    assert.deepEqual(res.availableActions, []);
    assert.equal(res.terminal, true);
  });

  it('returns a gameResult shaped like the real rules for several tickets', async () => {
    for (let i = 0; i < 4; i += 1) {
      const { gameResult } = await mockStart([{ type: 'mise', amount: 15 }]);

      assert.deepEqual(Object.keys(gameResult).sort(), ['details', 'multiplier', 'outcome']);
      assert.deepEqual(Object.keys(gameResult.details).sort(), ['stake', 'symbol', 'value']);
      assert.equal(typeof gameResult.details.symbol, 'string');
      assert.equal(gameResult.details.stake, 15);
      // outcome follows the multiplier, stake included (contract § 2.2)
      const expected = gameResult.multiplier > 1 ? 'win' : gameResult.multiplier === 1 ? 'push' : 'loss';
      assert.equal(gameResult.outcome, expected);
    }
  });

  it('rejects the old start(bet) signature', async () => {
    await assert.rejects(() => mockStart(10));
  });
});
