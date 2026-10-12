// ---------------------------------------------------------------------------
// Unit tests - Bingo UI mock (src/game-ui/bingo/bingo.mock.js)
// ---------------------------------------------------------------------------
// Groupe 3. The mock stands in for the G2 orchestrator of a multi-step game:
// start(bets) then action(sessionId, 'next') for each ball (rules #310). During
// the round the bots only expose their progress, never their grid.
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mockStart, mockAction } from '../../src/game-ui/bingo/bingo.mock.js';

const BET = [{ type: 'main', amount: 10 }];

describe('bingo mock - multi-step shape', () => {
  it('opens with a 5 x 5 player grid, a free center, no ball and only next', async () => {
    const res = await mockStart(BET);

    assert.equal(res.terminal, false);
    assert.deepEqual(res.availableActions, ['next']);
    const { view } = res.renderPayload;
    assert.equal(view.playerGrid.length, 5);
    assert.ok(view.playerGrid.every((row) => row.length === 5));
    assert.equal(view.playerGrid[2][2].free, true);
    assert.deepEqual(view.drawnBalls, []);
    assert.equal(view.currentBall, null);
  });

  it('marks the drawn number and never sends the bot grids during the round', async () => {
    const opened = await mockStart(BET);
    const res = await mockAction(opened.sessionId, 'next');
    const { view } = res.renderPayload;

    assert.equal(view.drawnBalls.length, 1);
    const cell = view.playerGrid.flat().find((c) => c.number === view.currentBall);
    if (cell) assert.equal(cell.marked, true);
    assert.ok(view.bots.every((bot) => Number.isInteger(bot.remaining) && bot.grid === undefined));
  });

  it('ends with the winners, the revealed bot grids and a gameResult (contract § 2.2)', async () => {
    const opened = await mockStart(BET);
    let res = opened;
    while (!res.terminal) res = await mockAction(opened.sessionId, 'next');

    const { view } = res.renderPayload;
    assert.ok(view.winnerIds.length > 0);
    assert.ok(view.bots.every((bot) => Array.isArray(bot.grid)));
    assert.deepEqual(res.availableActions, []);
    assert.deepEqual(Object.keys(res.gameResult).sort(), ['details', 'multiplier', 'outcome']);
    const expected = res.gameResult.multiplier > 1 ? 'win' : res.gameResult.multiplier === 1 ? 'push' : 'loss';
    assert.equal(res.gameResult.outcome, expected);
  });

  it('rejects any action other than next, and a finished session', async () => {
    const opened = await mockStart(BET);
    await assert.rejects(() => mockAction(opened.sessionId, 'stop'));
    let res = opened;
    while (!res.terminal) res = await mockAction(opened.sessionId, 'next');
    await assert.rejects(() => mockAction(opened.sessionId, 'next'));
  });
});
