// Unit tests for the generic orchestration template (Groupe 2):
// createGame({ id, rules }) + mockRules. Architecture/contract tests, not
// business tests.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createGame } from '../../src/games/_template/createGame.js';
import { singleStepRules, multiStepRules } from '../../src/games/_template/mockRules.js';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Recording fake core: serves the given raw values in order (cycled) and
 * logs every call, so tests can verify WHO calls roll() / play() and HOW
 * OFTEN, plus the exact arguments of play().
 *
 * @param {number[]} drawValues
 */
function makeRecordingCore(drawValues) {
  const log = [];
  const playCalls = [];
  let i = 0;
  return {
    log,
    playCalls,
    roll(gameId) {
      const value = drawValues[i % drawValues.length];
      i += 1;
      log.push('roll');
      return { gameId, value, nonce: i };
    },
    play(gameId, bets, gameResult) {
      log.push('play');
      playCalls.push({ gameId, bets, gameResult });
      return { newBalance: 0, xpGained: 1, leveledUp: false };
    },
  };
}

test('createGame rejects an invalid configuration', () => {
  assert.throws(() => createGame({ id: '', rules: singleStepRules }), TypeError);
  assert.throws(() => createGame({ id: 'slots', rules: null }), TypeError);
  assert.throws(() => createGame({ id: 'slots', rules: {} }), TypeError);
  assert.throws(() => createGame({ id: 'slots', rules: { start() {} } }), TypeError);
});

test('single-step: one roll, one play, rules interpret the raw draw', () => {
  const core = makeRecordingCore([0.1]);
  const game = createGame({ id: 'mock-single', rules: singleStepRules, core });

  const { gameResult, draws } = game.playRound({ type: 'red', amount: 10 });

  assert.equal(draws, 1);
  assert.deepEqual(core.log, ['roll', 'play']);
  assert.equal(gameResult.terminal, true);
  assert.equal(gameResult.outcome, 'win');
  assert.equal(gameResult.payout, 20);
  assert.equal(gameResult.rawValue, 0.1);
});

test('bets are always normalized to an array of { type, amount }, even a single one', () => {
  // Single bet given as a plain object (NOT an array) -> play() receives a
  // one-element array.
  const core = makeRecordingCore([0.9]);
  createGame({ id: 'mock-single', rules: singleStepRules, core }).playRound({
    type: 'red',
    amount: 10,
  });
  assert.equal(core.playCalls.length, 1);
  assert.deepEqual(core.playCalls[0].bets, [{ type: 'red', amount: 10 }]);

  // Rules receive the normalized array too.
  const spy = {
    resolve(raw, { bets }) {
      spy.receivedBets = bets;
      return singleStepRules.resolve(raw, { bets });
    },
  };
  createGame({
    id: 'mock-single',
    rules: spy,
    core: makeRecordingCore([0.9]),
  }).playRound({ type: 'red', amount: 10 });
  assert.ok(Array.isArray(spy.receivedBets));
  assert.deepEqual(spy.receivedBets, [{ type: 'red', amount: 10 }]);

  // Multiple bets stay an array.
  const core2 = makeRecordingCore([0.9]);
  createGame({ id: 'mock-single', rules: singleStepRules, core: core2 }).playRound([
    { type: 'red', amount: 10 },
    { type: 'black', amount: 5 },
  ]);
  assert.deepEqual(core2.playCalls[0].bets, [
    { type: 'red', amount: 10 },
    { type: 'black', amount: 5 },
  ]);
});

test('multi-step: needsDraw loop draws again, play() only once at terminal: true', () => {
  const core = makeRecordingCore([0.2, 0.3]);
  const game = createGame({ id: 'mock-multi', rules: multiStepRules, core });

  const { gameResult, draws } = game.playRound([{ type: 'hit', amount: 20 }]);

  // Two draws (start + step), then exactly one play, in this order.
  assert.deepEqual(core.log, ['roll', 'roll', 'play']);
  assert.equal(draws, 2);
  assert.equal(gameResult.terminal, true);
  assert.equal(gameResult.needsDraw, undefined);
  assert.equal(gameResult.outcome, 'win'); // 0.2 + 0.3 < 1.2
  assert.equal(gameResult.payout, 30); // 20 * 1.5
  assert.equal(gameResult.firstDraw, 0.2);
  assert.equal(gameResult.secondDraw, 0.3);
});

test('rules never call randomness directly (roll() is only called by the orchestrator)', () => {
  // 1) The mock rules source must contain no direct randomness and no access
  //    to the Core / coreService facade.
  const rulesSource = readFileSync(
    join(here, '../../src/games/_template/mockRules.js'),
    'utf8'
  );
  // Strip comments so the header documentation cannot hide a real usage.
  const code = rulesSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.ok(!code.includes('Math.random'), 'mockRules must not use Math.random');
  assert.ok(!code.includes('coreService'), 'mockRules must not import coreService');
  assert.ok(!/from\s+['"]\.\.\/\.\.\/\.\.\//.test(code), 'mockRules must not import the Core');

  // 2) With a recording core, every draw of a round comes from the
  //    orchestrator: one roll() per draw, none hidden inside rules.
  const core = makeRecordingCore([0.1, 0.2, 0.3]);
  createGame({ id: 'mock-multi', rules: multiStepRules, core }).playRound({
    type: 'hit',
    amount: 10,
  });
  assert.deepEqual(core.log, ['roll', 'roll', 'play']);

  // 3) Same raw draws => same results: nothing inside rules is random.
  const playOnce = (coreInstance) =>
    createGame({ id: 'mock-single', rules: singleStepRules, core: coreInstance }).playRound({
      type: 'red',
      amount: 10,
    });
  const a = playOnce(makeRecordingCore([0.1]));
  const b = playOnce(makeRecordingCore([0.1]));
  assert.deepEqual(a.gameResult, b.gameResult);
});

test('a rules object stuck on needsDraw cannot loop forever', () => {
  const core = makeRecordingCore([0.5]);
  const game = createGame({
    id: 'mock-stuck',
    rules: {
      start() {
        return { needsDraw: true };
      },
      step() {
        return { needsDraw: true };
      },
    },
    core,
  });
  assert.throws(() => game.playRound({ type: 'red', amount: 1 }));
});

test('invalid bets are rejected before any roll or play', () => {
  const core = makeRecordingCore([0.5]);
  const game = createGame({ id: 'mock-single', rules: singleStepRules, core });
  assert.throws(() => game.playRound([]), TypeError);
  assert.throws(() => game.playRound({ type: 'red' }), TypeError);
  assert.deepEqual(core.log, []);
});
