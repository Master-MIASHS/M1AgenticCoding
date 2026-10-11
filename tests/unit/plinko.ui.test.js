// ---------------------------------------------------------------------------
// Unit tests - Plinko UI (src/game-ui/plinko/)
// ---------------------------------------------------------------------------
// Groupe 3. The mock stands in for the G2 orchestrator: it must return exactly
// the shape of start(bets) (skill jeux-g2 § 2), with the landing slot index in
// renderPayload.raw like the real plinko rules (#128). The layout helpers are
// visual only: they draw a path that ends in the slot already drawn.
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mockStart, plinkoMockPaytable } from '../../src/game-ui/plinko/plinko.mock.js';
import { ballPath, ballPosition } from '../../src/game-ui/plinko/plinko.layout.js';

const ROWS = plinkoMockPaytable.length - 1;

describe('plinko mock - start(bets)', () => {
  it('returns the instant-game shape with the landing slot in renderPayload.raw', async () => {
    const res = await mockStart([{ type: 'slot', amount: 10 }]);

    assert.equal(typeof res.sessionId, 'string');
    assert.deepEqual(res.availableActions, []);
    assert.equal(res.terminal, true);
    assert.ok(Number.isInteger(res.renderPayload.raw));
    assert.ok(res.renderPayload.raw >= 0 && res.renderPayload.raw <= ROWS);
  });

  it('returns a gameResult consistent with the mock paytable for several rounds', async () => {
    for (let i = 0; i < 4; i += 1) {
      const { renderPayload, gameResult } = await mockStart([{ type: 'slot', amount: 5 }]);

      assert.deepEqual(Object.keys(gameResult).sort(), ['details', 'multiplier', 'outcome']);
      assert.equal(gameResult.multiplier, plinkoMockPaytable[renderPayload.raw]);
      // outcome follows the multiplier, stake included (contract § 2.2)
      const expected = gameResult.multiplier > 1 ? 'win' : gameResult.multiplier === 1 ? 'push' : 'loss';
      assert.equal(gameResult.outcome, expected);
    }
  });

  it('rejects any bet type other than slot', async () => {
    await assert.rejects(() => mockStart([{ type: 'red', amount: 5 }]));
  });
});

describe('plinko layout - visual path only', () => {
  it('ends every path in the slot that was drawn', () => {
    for (let slot = 0; slot <= ROWS; slot += 1) {
      const path = ballPath(slot, ROWS);
      assert.equal(path.length, ROWS);
      assert.equal(ballPosition(path, ROWS).x, slot);
    }
  });

  it('starts at the center of the board', () => {
    assert.deepEqual(ballPosition(ballPath(3, ROWS), 0), { x: ROWS / 2, y: 0 });
  });

  it('moves half a slot sideways at each bounce', () => {
    const path = ballPath(5, ROWS);
    for (let step = 1; step <= ROWS; step += 1) {
      const dx = ballPosition(path, step).x - ballPosition(path, step - 1).x;
      assert.equal(Math.abs(dx), 0.5);
    }
  });

  it('refuses a slot outside the board', () => {
    assert.throws(() => ballPath(ROWS + 1, ROWS), RangeError);
    assert.throws(() => ballPath(-1, ROWS), RangeError);
  });
});
