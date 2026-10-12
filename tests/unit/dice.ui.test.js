// ---------------------------------------------------------------------------
// Unit tests - Dice UI mock (src/game-ui/dice/dice.mock.js)
// ---------------------------------------------------------------------------
// Groupe 3. The mock stands in for the G2 orchestrator: it must return exactly
// the shape of start(bets) (skill jeux-g2 § 2), with the round in
// gameResult.details = { point, rolls, dice } like the final rules (#342,
// classic craps: several rolls are possible after the point).
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mockStart } from '../../src/game-ui/dice/dice.mock.js';

describe('dice mock - start(bets)', () => {
  it('returns the instant-game shape of the G2 orchestrator', async () => {
    const res = await mockStart([{ type: 'pass', amount: 10 }]);

    assert.equal(typeof res.sessionId, 'string');
    assert.deepEqual(res.availableActions, []);
    assert.equal(res.terminal, true);
  });

  it('returns a gameResult { outcome, multiplier, details: { point, rolls, dice } } for several rounds', async () => {
    for (let i = 0; i < 4; i += 1) {
      const { gameResult } = await mockStart([{ type: 'pass', amount: 5 }]);
      const { rolls, point, dice } = gameResult.details;

      assert.deepEqual(Object.keys(gameResult).sort(), ['details', 'multiplier', 'outcome']);
      assert.ok(rolls.length >= 1);
      assert.ok(rolls.every((total) => Number.isInteger(total) && total >= 2 && total <= 12));
      // one pair of faces per roll, each face in 1..6, matching the total
      assert.equal(dice.length, rolls.length);
      dice.forEach(([a, b], i) => {
        assert.ok([a, b].every((face) => Number.isInteger(face) && face >= 1 && face <= 6));
        assert.equal(a + b, rolls[i]);
      });
      // more than one roll only when a point was established
      assert.equal(rolls.length > 1, point !== null);
      // outcome follows the multiplier, stake included (contract § 2.2)
      const expected = gameResult.multiplier > 1 ? 'win' : gameResult.multiplier === 1 ? 'push' : 'loss';
      assert.equal(gameResult.outcome, expected);
    }
  });

  it('rejects the old start(bet) signature', async () => {
    await assert.rejects(() => mockStart(10));
  });
});
