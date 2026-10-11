// ---------------------------------------------------------------------------
// Unit tests - Slots UI mock (src/game-ui/slots/slots.mock.js)
// ---------------------------------------------------------------------------
// Groupe 3. The mock stands in for the G2 orchestrator: it must return exactly
// the shape of start(bets) (skill jeux-g2 § 2), with the three drawn symbols
// in renderPayload.raw.symbols like the real slots rules (#216).
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mockStart } from '../../src/game-ui/slots/slots.mock.js';

describe('slots mock - start(bets)', () => {
  it('returns the instant-game shape with three reels in renderPayload.raw.symbols', async () => {
    const res = await mockStart([{ type: 'mise', amount: 10 }]);

    assert.equal(typeof res.sessionId, 'string');
    assert.deepEqual(res.availableActions, []);
    assert.equal(res.terminal, true);
    assert.equal(res.renderPayload.raw.symbols.length, 3);
    assert.ok(res.renderPayload.raw.symbols.every((s) => typeof s === 'string' && s.length > 0));
  });

  it('returns a gameResult shaped like the real rules for several rounds', async () => {
    for (let i = 0; i < 3; i += 1) {
      const { renderPayload, gameResult } = await mockStart([{ type: 'mise', amount: 20 }]);
      const { symbols } = renderPayload.raw;

      assert.deepEqual(Object.keys(gameResult).sort(), ['details', 'multiplier', 'outcome']);
      assert.deepEqual(gameResult.details, { symbols, combination: symbols.join(''), stake: 20 });
      // outcome follows the multiplier, stake included (contract § 2.2)
      const expected = gameResult.multiplier > 1 ? 'win' : gameResult.multiplier === 1 ? 'push' : 'loss';
      assert.equal(gameResult.outcome, expected);
    }
  });

  it('rejects the old start(bet) signature', async () => {
    await assert.rejects(() => mockStart(10));
  });
});
