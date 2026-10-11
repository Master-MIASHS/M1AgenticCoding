import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as bingoRules from '../../src/games/bingo/rules.js';

const PAYTABLE = { win: 4 };
const CONFIG = { botCount: 3, paytable: PAYTABLE };
const BETS = [{ type: 'main', amount: 10 }];
const BALLS = Array.from({ length: 75 }, (_, index) => index + 1);

function makeGrid(offset = 0) {
  const columns = [
    Array.from({ length: 5 }, (_, index) => 1 + offset + index),
    Array.from({ length: 5 }, (_, index) => 16 + offset + index),
    Array.from({ length: 4 }, (_, index) => 31 + offset + index),
    Array.from({ length: 5 }, (_, index) => 46 + offset + index),
    Array.from({ length: 5 }, (_, index) => 61 + offset + index),
  ];
  return Array.from({ length: 5 }, (_, row) =>
    columns.map((column, col) => (row === 2 && col === 2 ? null : column[row - Number(col === 2 && row > 2)]))
  );
}

function orderBalls(first) {
  return [...first, ...BALLS.filter((ball) => !first.includes(ball))];
}

function makeRaw({ balls = BALLS, player = makeGrid(), bots = [1, 2, 3].map((index) => makeGrid(index)) } = {}) {
  return { balls, grids: { player, bots } };
}

function start(raw = makeRaw(), config = CONFIG, bets = BETS) {
  return bingoRules.start(raw, { bets, config });
}

function finishWith(state, count) {
  for (let index = 0; index < count; index += 1) {
    state = bingoRules.step(state, 'next');
  }
  return state;
}

describe('bingo rules start', () => {
  it('starts with one next action, a free center, and no bot grids exposed', () => {
    const session = start();
    const view = bingoRules.view({ phase: 'playing', session });

    assert.equal(session.needsDraw, true);
    assert.deepEqual(session.availableActions, ['next']);
    assert.deepEqual(view.drawnBalls, []);
    assert.equal(view.playerGrid[2][2].free, true);
    assert.equal(view.playerGrid[2][2].marked, true);
    assert.deepEqual(view.bots, [
      { id: 'bot-1', remaining: 4 },
      { id: 'bot-2', remaining: 4 },
      { id: 'bot-3', remaining: 4 },
    ]);
    assert.equal(JSON.stringify(view).includes('botGrid'), false);
  });

  it('rejects invalid grids, ball sequences, bets, and missing paytable values', () => {
    const raw = makeRaw();
    const badGrid = makeGrid();
    badGrid[0][0] = 16;

    assert.throws(() => start({ ...raw, grids: { ...raw.grids, player: badGrid } }), /grid/);
    assert.throws(() => start({ ...raw, balls: [1, ...BALLS.slice(1, -1), 1] }), /balls/);
    assert.throws(() => start(raw, { paytable: {} }), /paytable\.win/);
    assert.throws(() => start(raw, { ...CONFIG, botCount: undefined }), /botCount/);
    assert.throws(() => start(raw, { ...CONFIG, botCount: 0 }), /botCount/);
    assert.throws(() => start(raw, { ...CONFIG, paytable: { win: 1 } }), /greater than 1/);
    assert.throws(() => start(raw, CONFIG, [...BETS, ...BETS]), /exactly one/);
  });
});

describe('bingo rules step', () => {
  it('draws exactly one ball per next action and returns a fresh session', () => {
    const initial = start();
    const next = bingoRules.step(initial, 'next');

    assert.equal(initial.drawnBalls.length, 0);
    assert.deepEqual(next.drawnBalls, [1]);
    assert.equal(next.drawIndex, 1);
    assert.equal(next.needsDraw, true);
    assert.deepEqual(next.availableActions, ['next']);
    assert.equal(bingoRules.view({ phase: 'playing', session: next }).playerGrid[0][0].marked, true);
    assert.throws(() => bingoRules.step(next, 'unknown'), /unsupported action/);
  });

  it('wins when the player alone completes a row and reveals bot grids only at the end', () => {
    const state = finishWith(start(), 5);

    assert.equal(state.outcome, 'win');
    assert.equal(state.multiplier, PAYTABLE.win);
    assert.deepEqual(state.details.winnerIds, ['player']);
    const view = bingoRules.view({ phase: 'result', gameResult: state });
    assert.equal(view.bots[0].grid.length, 5);
    assert.deepEqual(view.winnerIds, ['player']);
  });

  it('loses when only a bot completes a row', () => {
    const botRow = [6, 21, 35, 51, 66];
    const state = finishWith(start(makeRaw({ balls: orderBalls(botRow) })), 5);

    assert.equal(state.outcome, 'loss');
    assert.equal(state.multiplier, 0);
    assert.deepEqual(state.details.winnerIds, ['bot-1', 'bot-2', 'bot-3']);
  });

  it('returns a push when the player and a bot win on the same draw', () => {
    const simultaneousRow = [1, 16, 31, 46, 61];
    const state = finishWith(
      start(makeRaw({ balls: orderBalls(simultaneousRow), bots: [makeGrid(), makeGrid(2), makeGrid(3)] })),
      simultaneousRow.length
    );

    assert.equal(state.outcome, 'push');
    assert.equal(state.multiplier, 1);
    assert.deepEqual(state.details.winnerIds, ['player', 'bot-1']);
  });

  it('always ends by the 75th draw because every completed grid contains winning lines', () => {
    let state = start();
    let drawCount = 0;
    while (state.needsDraw === true) {
      state = bingoRules.step(state, 'next');
      drawCount += 1;
      assert.ok(drawCount <= 75);
    }

    assert.equal(state.details.drawnBalls.length, drawCount);
    assert.ok(['win', 'loss', 'push'].includes(state.outcome));
  });

});
