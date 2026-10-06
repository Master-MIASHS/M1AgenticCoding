// ---------------------------------------------------------------------------
// Unit tests - Wheel of Fortune UI (src/game-ui/wheel/)
// ---------------------------------------------------------------------------
// Groupe 3. The mock stands in for the G2 orchestrator: it must return exactly
// the shape of start(bets) (skill jeux-g2 § 2), with the drawn segment in
// renderPayload.raw like the real wheel rules (#128). The layout helpers are
// visual only: they place the drawn segment under the pointer.
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  mockStart,
  wheelMockSegments,
  wheelMockBetTypes,
} from '../../src/game-ui/wheel/wheel.mock.js';
import { segmentCenter, targetRotation } from '../../src/game-ui/wheel/wheel.layout.js';

describe('wheel mock - start(bets)', () => {
  it('returns the instant-game shape with the drawn segment in renderPayload.raw', async () => {
    const res = await mockStart([{ type: 'red', amount: 10 }]);

    assert.equal(typeof res.sessionId, 'string');
    assert.deepEqual(res.availableActions, []);
    assert.equal(res.terminal, true);
    assert.ok(wheelMockSegments.includes(res.renderPayload.raw));
  });

  it('returns a gameResult { outcome, multiplier, details } for every bet type', async () => {
    for (const type of wheelMockBetTypes) {
      const { gameResult } = await mockStart([{ type, amount: 5 }]);

      assert.deepEqual(Object.keys(gameResult).sort(), ['details', 'multiplier', 'outcome']);
      assert.ok(['win', 'loss'].includes(gameResult.outcome));
      // multiplier includes the stake: 0 on a loss, > 1 on a win (contract § 2.2)
      if (gameResult.outcome === 'loss') assert.equal(gameResult.multiplier, 0);
      else assert.ok(gameResult.multiplier > 1);
    }
  });

  it('rejects an unknown bet type instead of inventing a result', async () => {
    await assert.rejects(() => mockStart([{ type: 'purple', amount: 5 }]));
  });
});

describe('wheel layout - visual placement only', () => {
  it('places each segment center clockwise from the top', () => {
    assert.equal(segmentCenter(0, 8), 22.5);
    assert.equal(segmentCenter(7, 8), 337.5);
  });

  it('brings the center of the drawn segment under the pointer', () => {
    for (let index = 0; index < 8; index += 1) {
      const rotation = targetRotation(0, index, 8);
      const underPointer = (((segmentCenter(index, 8) + rotation) % 360) + 360) % 360;
      assert.equal(underPointer, 0);
    }
  });

  it('always turns forward by at least one full turn', () => {
    let rotation = 0;
    for (const index of [3, 3, 0, 7]) {
      const next = targetRotation(rotation, index, 8);
      assert.ok(next - rotation >= 360);
      rotation = next;
    }
  });
});
