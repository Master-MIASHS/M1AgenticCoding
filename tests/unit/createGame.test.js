// Unit tests for the generic orchestration template (Groupe 2):
// createGame({ id, rules }) + mockRules. Architecture/contract tests, not
// business tests. Contract: G2 v0.5 (#68), § 2.2, § 3, § 4.3 and § 5.1.

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

test('single-step: start() rolls once, settles once and is terminal', () => {
  const core = makeRecordingCore([0.1]);
  const game = createGame({ id: 'mock-single', rules: singleStepRules, core });

  const res = game.start({ type: 'red', amount: 10 });

  assert.deepEqual(core.log, ['roll', 'play']);
  assert.equal(res.terminal, true);
  assert.equal(typeof res.sessionId, 'string');
  assert.deepEqual(res.availableActions, []);
  assert.deepEqual(res.gameResult, {
    outcome: 'win',
    multiplier: 2,
    details: { rawValue: 0.1 },
  });
  assert.equal(res.renderPayload.gameId, 'mock-single');
  assert.equal(res.renderPayload.phase, 'result');
  assert.equal(res.renderPayload.raw.value, 0.1);
  assert.deepEqual(res.renderPayload.economy, { newBalance: 0, xpGained: 1, leveledUp: false });
  assert.throws(() => game.action(res.sessionId, 'hit'), /unknown or finished session/);
});

test('playRound() still plays an instant game in one call', () => {
  const core = makeRecordingCore([0.9]);
  const { gameResult, economy, draws } = createGame({
    id: 'mock-single',
    rules: singleStepRules,
    core,
  }).playRound({ type: 'red', amount: 10 });

  assert.equal(draws, 1);
  assert.equal(gameResult.outcome, 'loss');
  assert.equal(gameResult.multiplier, 0);
  assert.equal(economy.xpGained, 1);
  assert.throws(
    () => createGame({ id: 'mock-multi', rules: multiStepRules, core }).playRound({ type: 'x', amount: 1 }),
    TypeError
  );
});

test('bets are always normalized to an array for the rules; play() gets the total bet', () => {
  // Single bet given as a plain object (NOT an array) -> play() receives the
  // total bet as a number (contract: economy.play(gameId, bet, gameResult)).
  const core = makeRecordingCore([0.9]);
  createGame({ id: 'mock-single', rules: singleStepRules, core }).start({
    type: 'red',
    amount: 10,
  });
  assert.equal(core.playCalls.length, 1);
  assert.equal(core.playCalls[0].bets, 10);

  // Multiple bets: rules get the array, play() gets the sum.
  const spy = {
    resolve(raw, { bets }) {
      spy.receivedBets = bets;
      return singleStepRules.resolve(raw, { bets });
    },
  };
  const core2 = makeRecordingCore([0.9]);
  createGame({ id: 'mock-single', rules: spy, core: core2 }).start([
    { type: 'red', amount: 10 },
    { type: 'black', amount: 5 },
  ]);
  assert.deepEqual(spy.receivedBets, [
    { type: 'red', amount: 10 },
    { type: 'black', amount: 5 },
  ]);
  assert.equal(core2.playCalls[0].bets, 15);
});

test('multi-step: start() then action(), step(session, action, raw), play() once at the end', () => {
  const core = makeRecordingCore([0.2, 0.3]);
  const game = createGame({ id: 'mock-multi', rules: multiStepRules, core });

  const started = game.start([{ type: 'main', amount: 20 }]);
  assert.equal(started.terminal, false);
  assert.deepEqual(started.availableActions, ['draw']);
  assert.equal(started.gameResult, undefined);
  assert.equal(started.renderPayload.phase, 'playing');
  assert.deepEqual(core.log, ['roll']);

  const end = game.action(started.sessionId, 'draw');
  assert.equal(end.terminal, true);
  assert.equal(end.sessionId, started.sessionId);
  assert.deepEqual(end.availableActions, []);
  assert.deepEqual(end.gameResult, {
    outcome: 'win', // 0.2 + 0.3 < 1.2
    multiplier: 1.5,
    details: { action: 'draw', firstDraw: 0.2, secondDraw: 0.3 },
  });

  // Two draws (start + action), then exactly one play, in this order.
  assert.deepEqual(core.log, ['roll', 'roll', 'play']);
  assert.equal(core.playCalls[0].bets, 20);
  assert.throws(() => game.action(started.sessionId, 'draw'), /unknown or finished session/);
});

test('step() receives the session, the player action and the raw draw, in this order', () => {
  const calls = [];
  const rules = {
    start(raw) {
      return { needsDraw: true, opening: raw.value, availableActions: ['hit', 'stand'] };
    },
    step(session, action, raw) {
      calls.push({ session, action, raw });
      return action === 'hit'
        ? { ...session, needsDraw: true }
        : { outcome: 'push', multiplier: 1, details: {} };
    },
  };
  const game = createGame({ id: 'mock-multi', rules, core: makeRecordingCore([0.1, 0.4, 0.7]) });

  const { sessionId } = game.start({ type: 'main', amount: 5 });
  const afterHit = game.action(sessionId, 'hit');
  assert.equal(afterHit.terminal, false);
  assert.deepEqual(afterHit.availableActions, ['hit', 'stand']);
  game.action(sessionId, 'stand');

  assert.equal(calls.length, 2);
  assert.equal(calls[0].session.opening, 0.1);
  assert.equal(calls[0].action, 'hit');
  assert.equal(calls[0].raw.value, 0.4);
  assert.equal(calls[1].action, 'stand');
  assert.equal(calls[1].raw.value, 0.7);
});

test('sessions are independent and kept by G2 (G3 only holds the id)', () => {
  const game = createGame({
    id: 'mock-multi',
    rules: multiStepRules,
    core: makeRecordingCore([0.1, 0.9, 0.2, 0.2]),
  });
  const a = game.start({ type: 'main', amount: 10 });
  const b = game.start({ type: 'main', amount: 10 });
  assert.notEqual(a.sessionId, b.sessionId);

  // a: 0.1 + 0.2 < 1.2 -> win ; b: 0.9 + 0.2 < 1.2 -> win, but each keeps its own first draw.
  assert.equal(game.action(b.sessionId, 'draw').gameResult.details.firstDraw, 0.9);
  assert.equal(game.action(a.sessionId, 'draw').gameResult.details.firstDraw, 0.1);
});

test('action() rejects an unknown session or an empty action before any draw', () => {
  const core = makeRecordingCore([0.5]);
  const game = createGame({ id: 'mock-multi', rules: multiStepRules, core });
  assert.throws(() => game.action('nope', 'draw'), /unknown or finished session/);
  const { sessionId } = game.start({ type: 'main', amount: 1 });
  assert.throws(() => game.action(sessionId, ''), TypeError);
  assert.deepEqual(core.log, ['roll']);
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

  // 2) Same raw draws => same results: nothing inside rules is random.
  const playOnce = (coreInstance) =>
    createGame({ id: 'mock-single', rules: singleStepRules, core: coreInstance }).start({
      type: 'red',
      amount: 10,
    });
  const a = playOnce(makeRecordingCore([0.1]));
  const b = playOnce(makeRecordingCore([0.1]));
  assert.deepEqual(a.gameResult, b.gameResult);
});

test('a session stuck on needsDraw cannot run forever', () => {
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
    core: makeRecordingCore([0.5]),
  });
  const { sessionId } = game.start({ type: 'red', amount: 1 });
  assert.throws(() => {
    for (let i = 0; i < 200; i += 1) game.action(sessionId, 'hit');
  }, /beyond 100 steps/);
});

test('invalid bets are rejected before any roll or play', () => {
  const core = makeRecordingCore([0.5]);
  const game = createGame({ id: 'mock-single', rules: singleStepRules, core });
  assert.throws(() => game.start([]), TypeError);
  assert.throws(() => game.start({ type: 'red' }), TypeError);
  assert.deepEqual(core.log, []);
});

test('config is forwarded as-is to resolve() and start()', () => {
  const config = { paytable: { red: 2 } };

  // Multi-step: start() receives the config reference.
  let seen;
  createGame({
    id: 'mock-multi',
    rules: {
      start(raw, ctx) {
        seen = ctx.config;
        return { needsDraw: true };
      },
      step() {
        return { outcome: 'push', multiplier: 1, details: {} };
      },
    },
    config,
    core: makeRecordingCore([0.5]),
  }).start({ type: 'red', amount: 1 });
  assert.equal(seen, config); // same reference

  // Single-step: resolve() receives bets AND config.
  let single;
  createGame({
    id: 'mock-single',
    rules: {
      resolve(raw, ctx) {
        single = ctx;
        return { outcome: 'push', multiplier: 1, details: {} };
      },
    },
    config,
    core: makeRecordingCore([0.5]),
  }).start({ type: 'red', amount: 1 });
  assert.equal(single.config, config);
  assert.deepEqual(single.bets, [{ type: 'red', amount: 1 }]);
});

test('draw(core, context) replaces roll() and its raw result reaches the rules (écart 8)', () => {
  const core = makeRecordingCore([0.5]);
  const drawCalls = [];
  const segment = { id: 's1', color: 'red' };
  let rawSeen;
  const config = { bets: {} };
  const res = createGame({
    id: 'wheel',
    rules: {
      resolve(raw) {
        rawSeen = raw;
        return { outcome: 'win', multiplier: 2, details: {} };
      },
    },
    config,
    core,
    draw(c, ctx) {
      drawCalls.push({ c, ctx });
      return segment;
    },
  }).start({ type: 'red', amount: 10 }, { spin: 1 });

  assert.equal(rawSeen, segment);
  assert.deepEqual(res.renderPayload.raw, segment);
  assert.equal(drawCalls.length, 1);
  assert.equal(drawCalls[0].c, core, 'draw receives the injected core');
  assert.equal(drawCalls[0].ctx.config, config);
  assert.deepEqual(drawCalls[0].ctx.bets, [{ type: 'red', amount: 10 }]);
  assert.deepEqual(drawCalls[0].ctx.params, { spin: 1 });
  assert.deepEqual(core.log, ['play'], 'the default roll() is not called when draw is given');
});

test('draw() also feeds action(), with the session and the player action', () => {
  const contexts = [];
  const game = createGame({
    id: 'mock-multi',
    rules: multiStepRules,
    core: makeRecordingCore([0.5]),
    draw(c, ctx) {
      contexts.push(ctx);
      return { value: 0.1 };
    },
  });
  const { sessionId } = game.start({ type: 'main', amount: 4 });
  game.action(sessionId, 'draw');

  assert.equal(contexts.length, 2);
  assert.equal(contexts[0].session, undefined);
  assert.equal(contexts[1].action, 'draw');
  assert.equal(contexts[1].session.firstDraw, 0.1);
  assert.deepEqual(contexts[1].bets, [{ type: 'main', amount: 4 }]);
});

test('createGame rejects a draw that is not a function', () => {
  assert.throws(() => createGame({ id: 'slots', rules: singleStepRules, draw: 42 }), TypeError);
});

test('a stake raised during the round (double) is settled through details.totalBet', () => {
  const core = makeRecordingCore([0.1, 0.2]);
  const rules = {
    start() {
      return { needsDraw: true, stake: 10, availableActions: ['double', 'stand'] };
    },
    step(session, action) {
      const stake = action === 'double' ? session.stake * 2 : session.stake;
      return { outcome: 'loss', multiplier: 0, details: { totalBet: stake } };
    },
  };
  const game = createGame({ id: 'mock-multi', rules, core });
  const { sessionId } = game.start({ type: 'main', amount: 10 });
  game.action(sessionId, 'double');
  assert.equal(core.playCalls[0].bets, 20, 'the doubled stake is lost, not only the opening bet');
});

test('details.totalBet below the opening bets is rejected before play()', () => {
  const core = makeRecordingCore([0.1]);
  const game = createGame({
    id: 'mock-single',
    rules: { resolve: () => ({ outcome: 'loss', multiplier: 0, details: { totalBet: 5 } }) },
    core,
  });
  assert.throws(() => game.start({ type: 'red', amount: 10 }), RangeError);
  assert.deepEqual(core.playCalls, []);
});

test('config stays undefined when not provided (no default value invented)', () => {
  let ctxSeen;
  createGame({
    id: 'mock-single',
    rules: {
      resolve(raw, ctx) {
        ctxSeen = ctx;
        return { outcome: 'push', multiplier: 1, details: {} };
      },
    },
    core: makeRecordingCore([0.5]),
  }).start({ type: 'red', amount: 1 });
  assert.equal(ctxSeen.config, undefined);
});
