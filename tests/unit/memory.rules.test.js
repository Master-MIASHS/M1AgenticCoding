import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { memoryRules } from '../../src/games/memory/rules.js';

const SYMBOLS = [
  'chip',
  'card',
  'dice',
  'roulette-wheel',
  'slot-machine',
  'horseshoe',
  'bell',
  'jackpot',
];
const PAYTABLE = Object.fromEntries(
  Array.from({ length: 9 }, (_, index) => [String(index + 8), 20 - index])
);
const CONFIG = { paytable: PAYTABLE };

function makeBoard(symbols = SYMBOLS.flatMap((symbol) => [symbol, symbol])) {
  return symbols.map((symbol) => ({ symbol }));
}

function revealPair(session, first, second) {
  return memoryRules.step(memoryRules.step(session, `reveal-${first}`), `reveal-${second}`);
}

describe('memoryRules.start', () => {
  it('starts with 16 hidden cards, eight pairs, and indexed reveal actions', () => {
    const session = memoryRules.start(makeBoard(), { config: CONFIG });

    assert.equal(session.board.length, 16);
    assert.deepEqual(session.matched, Array(16).fill(false));
    assert.deepEqual(session.revealed, []);
    assert.equal(session.turnsUsed, 0);
    assert.equal(session.needsDraw, true);
    assert.deepEqual(session.availableActions, Array.from({ length: 16 }, (_, i) => `reveal-${i}`));
  });

  it('rejects an invalid board and a missing or incomplete paytable', () => {
    assert.throws(() => memoryRules.start(makeBoard().slice(0, 15), { config: CONFIG }), TypeError);
    assert.throws(() => memoryRules.start(makeBoard(), {}), /memory: config\.paytable is required/);
    assert.throws(
      () => memoryRules.start(makeBoard(), { config: { paytable: { 8: 2 } } }),
      /memory: paytable must define multipliers for 8 through 16 turns/
    );
  });
});

describe('memoryRules.step', () => {
  it('keeps matching cards revealed and counts one completed turn', () => {
    const session = memoryRules.start(makeBoard(), { config: CONFIG });
    const firstCard = memoryRules.step(session, 'reveal-0');
    const matched = memoryRules.step(firstCard, 'reveal-1');

    assert.deepEqual(matched.matched.slice(0, 2), [true, true]);
    assert.deepEqual(matched.revealed, []);
    assert.equal(matched.turnsUsed, 1);
    assert.equal(matched.pairsFound, 1);
    assert.equal(matched.needsDraw, true);
    assert.ok(matched.availableActions.includes('reveal-2'));
  });

  it('requires continue after a mismatch before allowing another reveal', () => {
    const board = makeBoard([
      'chip', 'card', 'chip', 'card',
      'dice', 'dice', 'roulette-wheel', 'roulette-wheel',
      'slot-machine', 'slot-machine', 'horseshoe', 'horseshoe',
      'bell', 'bell', 'jackpot', 'jackpot',
    ]);
    const session = memoryRules.start(board, { config: CONFIG });
    const mismatch = revealPair(session, 0, 1);

    assert.deepEqual(mismatch.revealed, [0, 1]);
    assert.equal(mismatch.turnsUsed, 1);
    assert.deepEqual(mismatch.availableActions, ['continue']);
    assert.throws(() => memoryRules.step(mismatch, 'reveal-2'), /memory: unsupported action/);

    const continued = memoryRules.step(mismatch, 'continue');
    assert.deepEqual(continued.revealed, []);
    assert.equal(continued.pendingMismatch, false);
    assert.ok(continued.availableActions.includes('reveal-0'));
  });

  it('rejects revealing the same or a matched card twice', () => {
    const session = memoryRules.start(makeBoard(), { config: CONFIG });
    const oneRevealed = memoryRules.step(session, 'reveal-0');
    assert.throws(() => memoryRules.step(oneRevealed, 'reveal-0'), /memory: unsupported action/);

    const matched = revealPair(session, 0, 1);
    assert.throws(() => memoryRules.step(matched, 'reveal-0'), /memory: unsupported action/);
  });

  it('settles a win using the configured multiplier for the number of turns', () => {
    let session = memoryRules.start(makeBoard(), { config: CONFIG });
    let result;
    for (let pair = 0; pair < 8; pair += 1) {
      result = revealPair(session, pair * 2, pair * 2 + 1);
      if (pair < 7) session = result;
    }

    assert.equal(result.outcome, 'win');
    assert.equal(result.multiplier, PAYTABLE[8]);
    assert.equal(result.details.turnsUsed, 8);
    assert.equal(result.details.pairsFound, 8);
    assert.equal(result.details.success, true);
  });

  it('uses the configured payout for a successful game taking nine turns', () => {
    const board = makeBoard([
      'chip', 'card', 'chip', 'card',
      'dice', 'dice', 'roulette-wheel', 'roulette-wheel',
      'slot-machine', 'slot-machine', 'horseshoe', 'horseshoe',
      'bell', 'bell', 'jackpot', 'jackpot',
    ]);
    let session = memoryRules.start(board, { config: CONFIG });
    const mismatch = revealPair(session, 0, 1);
    session = memoryRules.step(mismatch, 'continue');
    let result = revealPair(session, 0, 2);
    result = revealPair(result, 1, 3);
    for (let pair = 0; pair < 6; pair += 1) {
      result = revealPair(result, 4 + pair * 2, 5 + pair * 2);
    }

    assert.equal(result.details.turnsUsed, 9);
    assert.equal(result.multiplier, PAYTABLE[9]);
    assert.equal(result.details.success, true);
  });

  it('allows the final pair to complete on the sixteenth turn', () => {
    const board = makeBoard([
      'chip', 'card', 'chip', 'card',
      'dice', 'dice', 'roulette-wheel', 'roulette-wheel',
      'slot-machine', 'slot-machine', 'horseshoe', 'horseshoe',
      'bell', 'bell', 'jackpot', 'jackpot',
    ]);
    let session = memoryRules.start(board, { config: CONFIG });
    for (let turn = 0; turn < 8; turn += 1) {
      const mismatch = revealPair(session, 0, 1);
      session = memoryRules.step(mismatch, 'continue');
    }
    let result = revealPair(session, 0, 2);
    result = revealPair(result, 1, 3);
    for (let pair = 0; pair < 6; pair += 1) {
      result = revealPair(result, 4 + pair * 2, 5 + pair * 2);
    }

    assert.equal(result.details.turnsUsed, 16);
    assert.equal(result.details.success, true);
    assert.equal(result.multiplier, PAYTABLE[16]);
  });

  it('settles a loss after 16 mismatched turns and the final continue action', () => {
    const board = makeBoard([
      'chip', 'card', 'chip', 'card',
      'dice', 'roulette-wheel', 'dice', 'roulette-wheel',
      'slot-machine', 'horseshoe', 'slot-machine', 'horseshoe',
      'bell', 'jackpot', 'bell', 'jackpot',
    ]);
    let session = memoryRules.start(board, { config: CONFIG });
    let result;

    for (let turn = 0; turn < 16; turn += 1) {
      const mismatch = revealPair(session, 0, 1);
      if (turn < 15) {
        session = memoryRules.step(mismatch, 'continue');
      } else {
        result = memoryRules.step(mismatch, 'continue');
      }
    }

    assert.equal(result.outcome, 'loss');
    assert.equal(result.multiplier, 0);
    assert.equal(result.details.turnsUsed, 16);
    assert.equal(result.details.success, false);
  });

  it('hides unmatched symbols from the rendering view and reveals them after settlement', () => {
    const session = memoryRules.start(makeBoard(), { config: CONFIG });
    const firstCard = memoryRules.step(session, 'reveal-0');
    const view = memoryRules.view({ phase: 'playing', session: firstCard });

    assert.equal(view.cards[0].symbol, 'chip');
    assert.equal(view.cards[1].symbol, null);
    assert.equal('board' in view, false);
    assert.equal('paytable' in view, false);
  });
});
