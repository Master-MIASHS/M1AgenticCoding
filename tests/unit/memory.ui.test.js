// ---------------------------------------------------------------------------
// Unit tests - Memory UI mock (src/game-ui/memory/memory.mock.js)
// ---------------------------------------------------------------------------
// Groupe 3. The mock stands in for the G2 orchestrator of a multi-step game:
// start(bets), action(sessionId, 'reveal-<i>'), 'continue' after a missed pair
// (rules #300, interface validated in #274). Hidden cards never carry their
// symbol in renderPayload.view.
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mockStart, mockAction } from '../../src/game-ui/memory/memory.mock.js';

const BET = [{ type: 'main', amount: 10 }];

describe('memory mock - multi-step shape', () => {
  it('opens a hidden 4 x 4 board with one reveal action per card', async () => {
    const res = await mockStart(BET);

    assert.equal(res.terminal, false);
    const { view } = res.renderPayload;
    assert.equal(view.cards.length, 16);
    assert.ok(view.cards.every((c) => c.symbol === null && !c.revealed && !c.matched));
    assert.equal(view.maxTurns, 16);
    assert.deepEqual(res.availableActions, Array.from({ length: 16 }, (_, i) => `reveal-${i}`));
  });

  it('shows a missed pair, then only offers continue, which hides it again', async () => {
    const opened = await mockStart(BET);
    await mockAction(opened.sessionId, 'reveal-0');
    const missed = await mockAction(opened.sessionId, 'reveal-1');

    assert.equal(missed.renderPayload.view.pendingMismatch, true);
    assert.deepEqual(missed.availableActions, ['continue']);
    assert.notEqual(missed.renderPayload.view.cards[0].symbol, null);

    const after = await mockAction(opened.sessionId, 'continue');
    assert.equal(after.renderPayload.view.cards[0].symbol, null);
    assert.equal(after.renderPayload.view.turnsUsed, 1);
  });

  it('keeps a found pair face up and removes its reveal actions', async () => {
    const opened = await mockStart(BET);
    await mockAction(opened.sessionId, 'reveal-0');
    const res = await mockAction(opened.sessionId, 'reveal-9');

    assert.equal(res.renderPayload.view.pairsFound, 1);
    assert.ok(res.renderPayload.view.cards[0].matched && res.renderPayload.view.cards[9].matched);
    assert.ok(!res.availableActions.includes('reveal-0') && !res.availableActions.includes('reveal-9'));
  });

  it('rejects an action that is not available', async () => {
    const opened = await mockStart(BET);
    await assert.rejects(() => mockAction(opened.sessionId, 'continue'));
    await assert.rejects(() => mockAction(opened.sessionId, 'reveal-16'));
  });

  it('ends with the whole board revealed and a gameResult (contract § 2.2)', async () => {
    const opened = await mockStart(BET);
    const pairs = [[0, 9], [1, 8], [2, 11], [3, 10], [4, 13], [5, 14], [6, 15], [7, 12]];
    let res;
    for (const [a, b] of pairs) {
      await mockAction(opened.sessionId, `reveal-${a}`);
      res = await mockAction(opened.sessionId, `reveal-${b}`);
    }
    assert.equal(res.terminal, true);
    assert.ok(res.renderPayload.view.cards.every((c) => c.symbol !== null));
    assert.deepEqual(Object.keys(res.gameResult).sort(), ['details', 'multiplier', 'outcome']);
    const expected = res.gameResult.multiplier > 1 ? 'win' : res.gameResult.multiplier === 1 ? 'push' : 'loss';
    assert.equal(res.gameResult.outcome, expected);
  });
});
