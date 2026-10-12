// ---------------------------------------------------------------------------
// Unit tests - Blackjack UI mock (src/game-ui/blackjack/blackjack.mock.js)
// ---------------------------------------------------------------------------
// Groupe 3. The mock stands in for the G2 orchestrator of a multi-step game:
// start(bets) then action(sessionId, playerAction) until terminal: true
// (skill jeux-g2 § 1 and § 2), with what G3 may display in renderPayload.view
// like the real blackjack rules (#203): never the dealer's hidden card.
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mockStart, mockAction } from '../../src/game-ui/blackjack/blackjack.mock.js';

const BET = [{ type: 'main', amount: 10 }];

// The mock alternates two scenarios: a normal deal, then a natural blackjack.
async function openNormalRound() {
  for (let i = 0; i < 2; i += 1) {
    const res = await mockStart(BET);
    if (!res.terminal) return res;
  }
  throw new Error('no running round');
}

describe('blackjack mock - multi-step shape', () => {
  it('opens a round with a session, actions and a view that hides the dealer card', async () => {
    const res = await openNormalRound();

    assert.equal(typeof res.sessionId, 'string');
    assert.equal(res.terminal, false);
    assert.deepEqual(res.availableActions, ['hit', 'stand', 'double']);
    assert.equal(res.gameResult, undefined);
    const { view } = res.renderPayload;
    assert.equal(view.dealerHand.length, 1);
    assert.equal(view.dealerHiddenCards, 1);
    assert.equal(view.dealerTotal, undefined);
    assert.ok(view.playerHand.every((card) => typeof card.rank === 'string' && typeof card.suit === 'string'));
  });

  it('plays hit then stand to a terminal result with the full hands', async () => {
    const opened = await openNormalRound();
    const afterHit = await mockAction(opened.sessionId, 'hit');
    assert.equal(afterHit.terminal, false);
    assert.deepEqual(afterHit.availableActions, ['hit', 'stand']);

    const end = await mockAction(opened.sessionId, 'stand');
    assert.equal(end.terminal, true);
    assert.deepEqual(end.availableActions, []);
    assert.deepEqual(Object.keys(end.gameResult).sort(), ['details', 'multiplier', 'outcome']);
    assert.equal(end.renderPayload.view.phase, 'result');
    assert.ok(end.renderPayload.view.dealerHand.length >= 2);
    assert.equal(end.gameResult.details.totalBet, 10);
  });

  it('reports the doubled stake in details.totalBet after double', async () => {
    const opened = await openNormalRound();
    const end = await mockAction(opened.sessionId, 'double');
    assert.equal(end.terminal, true);
    assert.equal(end.gameResult.details.totalBet, 20);
  });

  it('keeps outcome consistent with the multiplier, stake included (contract § 2.2)', async () => {
    for (let i = 0; i < 4; i += 1) {
      const res = await mockStart(BET);
      const end = res.terminal ? res : await mockAction(res.sessionId, 'stand');
      const { outcome, multiplier } = end.gameResult;
      const expected = multiplier > 1 ? 'win' : multiplier === 1 ? 'push' : 'loss';
      assert.equal(outcome, expected);
    }
  });

  it('rejects an action that is not available or a finished session', async () => {
    const opened = await openNormalRound();
    await assert.rejects(() => mockAction(opened.sessionId, 'split'));
    await mockAction(opened.sessionId, 'stand');
    await assert.rejects(() => mockAction(opened.sessionId, 'hit'));
  });
});
