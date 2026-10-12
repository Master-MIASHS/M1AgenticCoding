// ---------------------------------------------------------------------------
// Unit tests - Video poker UI mock (src/game-ui/video-poker/videoPoker.mock.js)
// ---------------------------------------------------------------------------
// Groupe 3. The mock stands in for the G2 orchestrator of a multi-step game:
// start(bets), action(sessionId, 'hold-<i>'), then action(sessionId, 'draw')
// (skill jeux-g2, rules #204), with renderPayload.view = { hand, held } during
// the round and { hand, held, result } at the end.
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mockStart, mockAction } from '../../src/game-ui/video-poker/videoPoker.mock.js';

const BET = [{ type: 'main', amount: 10 }];
const ACTIONS = ['hold-0', 'hold-1', 'hold-2', 'hold-3', 'hold-4', 'draw'];

describe('video poker mock - multi-step shape', () => {
  it('opens a round with five cards, nothing held and the hold / draw actions', async () => {
    const res = await mockStart(BET);

    assert.equal(typeof res.sessionId, 'string');
    assert.equal(res.terminal, false);
    assert.deepEqual(res.availableActions, ACTIONS);
    assert.equal(res.renderPayload.view.hand.length, 5);
    assert.deepEqual(res.renderPayload.view.held, [false, false, false, false, false]);
  });

  it('toggles a card with hold-<i> and keeps the held cards on draw', async () => {
    const opened = await mockStart(BET);
    const firstCard = opened.renderPayload.view.hand[0];

    let res = await mockAction(opened.sessionId, 'hold-0');
    assert.deepEqual(res.renderPayload.view.held, [true, false, false, false, false]);
    res = await mockAction(opened.sessionId, 'hold-1');
    res = await mockAction(opened.sessionId, 'hold-1');
    assert.deepEqual(res.renderPayload.view.held, [true, false, false, false, false]);

    const end = await mockAction(opened.sessionId, 'draw');
    assert.equal(end.terminal, true);
    assert.deepEqual(end.availableActions, []);
    assert.deepEqual(end.renderPayload.view.hand[0], firstCard);
    assert.equal(end.renderPayload.view.hand.length, 5);
    assert.deepEqual(Object.keys(end.gameResult).sort(), ['details', 'multiplier', 'outcome']);
    const { result } = end.renderPayload.view;
    assert.ok(Number.isInteger(result.category) && result.category >= 1 && result.category <= 10);
    // outcome follows the multiplier, stake included (contract § 2.2)
    const expected = result.multiplier > 1 ? 'win' : result.multiplier === 1 ? 'push' : 'loss';
    assert.equal(result.outcome, expected);
  });

  it('rejects an unknown action or a finished session', async () => {
    const opened = await mockStart(BET);
    await assert.rejects(() => mockAction(opened.sessionId, 'hold-5'));
    await mockAction(opened.sessionId, 'draw');
    await assert.rejects(() => mockAction(opened.sessionId, 'hold-0'));
  });
});
