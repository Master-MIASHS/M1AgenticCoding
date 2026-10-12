import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildDeck, remaining } from '../../src/games/deck.js';
import { rules, start, step } from '../../src/games/poker/rules.js';
import { draw, drawInitial } from '../../src/games/poker/draw.js';

const CONFIG = {
  smallBlind: 1,
  bigBlind: 2,
  botStack: 20,
  raiseStep: 2,
};

function createState(core) {
  return start(drawInitial(core), {
    bets: [{ type: 'small-blind', amount: CONFIG.smallBlind }],
    config: CONFIG,
    balance: 100,
  });
}

test('shuffles one official deck through Core and deals from a shoe', () => {
  let shuffledInput;
  const core = {
    melanger(cards) {
      shuffledInput = cards;
      return cards;
    },
  };

  const dealt = drawInitial(core);

  assert.equal(shuffledInput.length, 52);
  assert.deepEqual(dealt.playerHand, [shuffledInput[0], shuffledInput[2]]);
  assert.deepEqual(dealt.aiHand, [shuffledInput[1], shuffledInput[3]]);
  assert.equal(dealt.shoe.cursor, 4);
  assert.equal(remaining(dealt.shoe), 48);
});

test('requires the Core shuffle function for the initial deal', () => {
  assert.throws(() => drawInitial({}), /core\.melanger is required/);
});

test('returns immutable bot decisions for replay after a player action', () => {
  const decisions = [];
  const core = {
    melanger(cards) {
      return cards;
    },
    choisirAction(payload) {
      decisions.push(payload);
      return { type: 'check' };
    },
  };
  const session = createState(core);
  const snapshot = structuredClone(session);

  const raw = draw(core, { session, action: 'call' });

  // The bot's preflop check, then its opening check on the flop (#413).
  assert.deepEqual(raw.aiActions, [{ type: 'check' }, { type: 'check' }]);
  assert.equal(decisions.length, 2);
  assert.ok(decisions[0].aiHandStrength >= 0 && decisions[0].aiHandStrength <= 1);
  assert.equal('playerHand' in decisions[0], false);
  assert.deepEqual(session, snapshot);
});

test('orders bot decisions before and after the player action on later streets', () => {
  // preflop check, flop opening check, call of the raise, turn opening check
  const queue = [{ type: 'check' }, { type: 'check' }, { type: 'call' }, { type: 'check' }];
  const core = {
    melanger(cards) {
      return cards;
    },
    choisirAction() {
      return queue.shift();
    },
  };
  const session = createState(core);
  const afterPreflop = step(
    session,
    'call',
    draw(core, { session, action: 'call' }),
  );

  assert.equal(afterPreflop.stage, 'flop');
  assert.equal(afterPreflop.toAct, 'player');
  const raw = draw(core, { session: afterPreflop, action: 'raise' });
  assert.deepEqual(raw.aiActions, [{ type: 'call' }, { type: 'check' }]);

  const next = step(afterPreflop, 'raise', raw);
  assert.equal(next.stage, 'turn');
  assert.equal(next.toAct, 'player');
  assert.equal(next.totalBet, 4);
  assert.equal(next.aiTotalBet, 4);
  assert.deepEqual(queue, []);
});

test('rejects unavailable player actions before asking the bot to act', () => {
  let botCalls = 0;
  const core = {
    melanger(cards) {
      return cards;
    },
    choisirAction() {
      botCalls += 1;
      return { type: 'check' };
    },
  };
  const session = createState(core);

  assert.throws(() => draw(core, { session, action: 'raise-10' }), /not available/);
  assert.equal(botCalls, 0);
});
