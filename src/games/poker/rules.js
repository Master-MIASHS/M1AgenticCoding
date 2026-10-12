import { draw as drawCards, remaining } from '../deck.js';
import { bestPokerHand, comparePokerHands } from '../cardUtils.js';
import { applyBot, applyPlayer, isOver } from './engine.js';

const PLAYERS = Object.freeze(['player', 'ai']);

function otherPlayer(player) {
  return player === 'player' ? 'ai' : 'player';
}

function validateCards(cards, count, name) {
  if (!Array.isArray(cards) || cards.length !== count) {
    throw new TypeError(`poker: ${name} must contain exactly ${count} cards`);
  }
}

function validateChips(chips, name) {
  if (typeof chips !== 'number' || !Number.isFinite(chips) || chips < 0) {
    throw new TypeError(`poker: ${name} must be a non-negative finite number`);
  }
}

function cardKey(card) {
  return `${card.rank}:${card.suit}`;
}

function validateUniqueCards(playerHand, aiHand, deck) {
  const allCards = [...playerHand, ...aiHand, ...deck.cards.slice(deck.cursor)];
  const seen = new Set();
  for (const card of allCards) {
    const key = cardKey(card);
    if (seen.has(key)) {
      throw new TypeError(`poker: duplicate card ${key}`);
    }
    seen.add(key);
  }
}

function contribution(state, player) {
  return player === 'player' ? state.playerContribution : state.aiContribution;
}

function chips(state, player) {
  return player === 'player' ? state.playerChips : state.aiChips;
}

function copyState(state) {
  return {
    ...state,
    playerHand: state.playerHand.map((card) => ({ ...card })),
    aiHand: state.aiHand.map((card) => ({ ...card })),
    communityCards: state.communityCards.map((card) => ({ ...card })),
    shoe: state.shoe,
    pendingActions: [...state.pendingActions],
    availableActions: [...state.availableActions],
  };
}

function effectiveActions(state, actor) {
  const actions = availableActions(state, actor);
  if (chips(state, otherPlayer(actor)) === 0) {
    return actions.filter((action) => action !== 'raise');
  }
  return actions;
}

function terminalResult(state, winner, details = {}, showdown = false) {
  const matchedBet = Math.min(state.totalBet, state.aiTotalBet);
  const settledBet = showdown ? matchedBet : state.totalBet;
  const settledPot = showdown
    ? Math.min(state.pot, matchedBet * 2)
    : state.pot;
  const playerAward = winner === 'player'
    ? settledPot
    : winner === 'tie'
      ? settledPot / 2
      : 0;
  const outcome = winner === 'player' ? 'win' : winner === 'tie' ? 'push' : 'loss';
  const multiplier = winner === 'player'
    ? playerAward / settledBet
    : winner === 'tie'
      ? 1
      : 0;

  return {
    outcome,
    multiplier,
    details: {
      winner,
      pot: settledPot,
      totalBet: settledBet,
      playerAward,
      communityCards: state.communityCards.map((card) => ({ ...card })),
      playerCards: state.playerHand.map((card) => ({ ...card })),
      ...details,
    },
  };
}

function runout(state) {
  let next = copyState(state);
  while (next.communityCards.length < 5) {
    const count = next.communityCards.length === 0 ? 3 : 1;
    if (remaining(next.shoe) < count) {
      throw new RangeError('poker: not enough cards remain for the community board');
    }
    const dealt = drawCards(next.shoe, count);
    next.shoe = dealt.shoe;
    next.communityCards.push(...dealt.cards);
    next.stage = next.communityCards.length === 3 ? 'flop'
      : next.communityCards.length === 4 ? 'turn'
        : 'river';
  }
  return resolveShowdown(next);
}

/**
 * Deals the next street and sets the bot to speak first. Also used by draw()
 * so that the bot's opening turn is played in the same action() (#413).
 *
 * @param {object} state a state whose betting round is complete.
 * @returns {object} the next active state, or a terminal result (showdown).
 */
export function advanceStreet(state) {
  if (state.stage === 'river') {
    return resolveShowdown(state);
  }
  const next = copyState(state);
  const count = next.stage === 'preflop' ? 3 : 1;
  if (remaining(next.shoe) < count) {
    throw new RangeError('poker: not enough cards remain for the community board');
  }
  const dealt = drawCards(next.shoe, count);
  next.shoe = dealt.shoe;
  next.communityCards.push(...dealt.cards);
  next.stage = next.communityCards.length === 3 ? 'flop'
    : next.communityCards.length === 4 ? 'turn'
      : 'river';
  next.playerContribution = 0;
  next.aiContribution = 0;
  next.currentBet = 0;
  next.minRaise = next.raiseStep;
  next.pendingActions = [];

  if (next.playerChips === 0 || next.aiChips === 0) {
    return runout(next);
  }
  next.pendingActions = ['ai', 'player'];
  next.toAct = 'ai';
  next.availableActions = effectiveActions(next, next.toAct);
  next.roundComplete = false;
  next.needsDraw = true;
  return next;
}

function completeBettingRound(state) {
  return advanceStreet(state);
}

/**
 * Starts a two-player hand from the initial draw and the createGame context.
 *
 * @param {{ playerHand: object[], aiHand: object[], shoe: object }} raw initial draw.
 * @param {{ bets: Array<{ type: string, amount: number }>, config: object, balance: number }} context
 * @returns {object} an active session or a terminal game result.
 */
export function start(raw, { bets, config, balance } = {}) {
  const { playerHand, aiHand, shoe } = raw ?? {};
  const { smallBlind, bigBlind, botStack, raiseStep } = config ?? {};
  validateCards(playerHand, 2, 'playerHand');
  validateCards(aiHand, 2, 'aiHand');
  validateChips(balance, 'balance');
  validateChips(smallBlind, 'smallBlind');
  validateChips(bigBlind, 'bigBlind');
  validateChips(botStack, 'botStack');
  validateChips(raiseStep, 'raiseStep');
  if (
    smallBlind <= 0 ||
    bigBlind < smallBlind ||
    botStack <= 0 ||
    raiseStep <= 0
  ) {
    throw new TypeError('poker: config requires 0 < smallBlind <= bigBlind and positive botStack/raiseStep');
  }
  if (
    !Array.isArray(bets) ||
    bets.length === 0 ||
    bets.some((bet) => !bet || typeof bet.amount !== 'number' || !Number.isFinite(bet.amount))
  ) {
    throw new TypeError('poker: bets must be a non-empty array of { type, amount } entries');
  }
  const openingBet = bets.reduce((total, bet) => total + bet.amount, 0);
  if (openingBet !== smallBlind) {
    throw new RangeError('poker: opening bet must equal the configured smallBlind');
  }
  if (
    shoe === null ||
    typeof shoe !== 'object' ||
    !Array.isArray(shoe.cards) ||
    !Number.isInteger(shoe.cursor) ||
    shoe.cursor < 0 ||
    shoe.cursor > shoe.cards.length
  ) {
    throw new TypeError('poker: raw.shoe must be a valid shoe');
  }
  validateUniqueCards(playerHand, aiHand, shoe);

  const playerContribution = smallBlind;
  const aiContribution = Math.min(botStack, bigBlind);
  const state = {
    stage: 'preflop',
    terminal: false,
    playerHand: playerHand.map((card) => ({ ...card })),
    aiHand: aiHand.map((card) => ({ ...card })),
    communityCards: [],
    shoe,
    playerChips: balance - playerContribution,
    aiChips: botStack - aiContribution,
    playerContribution,
    aiContribution,
    totalBet: playerContribution,
    aiTotalBet: aiContribution,
    pot: playerContribution + aiContribution,
    currentBet: Math.max(playerContribution, aiContribution),
    raiseStep,
    minRaise: raiseStep,
    smallBlind,
    bigBlind,
    toAct: 'player',
    pendingActions: ['player', 'ai'],
    availableActions: [],
    roundComplete: false,
    needsDraw: true,
  };
  if (state.playerChips === 0 || state.aiChips === 0) {
    return runout(state);
  }
  state.availableActions = effectiveActions(state, 'player');
  return state;
}

/**
 * Returns the legal actions for the current betting state.
 *
 * @param {object} state
 * @param {'player' | 'ai'} [actor=state.toAct]
 * @returns {string[]}
 */
export function availableActions(state, actor = state.toAct) {
  if (!PLAYERS.includes(actor)) {
    throw new TypeError('poker: actor must be player or ai');
  }
  const due = Math.max(0, state.currentBet - contribution(state, actor));
  const actorChips = chips(state, actor);
  const opponentChips = chips(state, otherPlayer(actor));
  const actions = ['fold'];
  if (due === 0) {
    actions.push('check');
  } else {
    actions.push('call');
  }
  if (
    opponentChips > 0 &&
    actorChips > due &&
    actorChips - due >= state.raiseStep
  ) {
    actions.push('raise');
  }
  return actions;
}

/**
 * Applies a player action and deterministically replays the bot decisions
 * prepared by draw().
 *
 * @param {object} state
 * @param {string} action player action.
 * @param {{ aiActions: object[] }} raw draw prepared by draw().
 * @returns {object} next active session or terminal game result.
 */
export function step(state, action, raw) {
  if (!state?.needsDraw || isOver(state)) {
    throw new TypeError('poker: cannot act after the hand is over');
  }
  if (typeof action !== 'string') {
    throw new TypeError('poker: action must be a string');
  }
  if (!Array.isArray(raw?.aiActions)) {
    throw new TypeError('poker: raw.aiActions must be an array');
  }

  let next = copyState(state);
  let aiIndex = 0;
  const replayBot = () => {
    if (aiIndex >= raw.aiActions.length) {
      throw new TypeError('poker: raw.aiActions is missing a required bot decision');
    }
    const before = next.aiContribution;
    next = applyBot(next, raw.aiActions[aiIndex]);
    next.aiTotalBet += next.aiContribution - before;
    aiIndex += 1;
  };

  while (next.toAct === 'ai' && !next.roundComplete && !isOver(next)) {
    replayBot();
  }

  if (next.roundComplete || isOver(next) || next.toAct !== 'player') {
    throw new TypeError('poker: player action is not expected in this state');
  }
  if (!effectiveActions(next, 'player').includes(action)) {
    throw new TypeError(`poker: ${action} is not available to player`);
  }

  next = applyPlayer(next, action);
  if (isOver(next)) {
    return terminalResult(next, next.winner, { folded: 'player' });
  }

  const replayBots = () => {
    while (next.toAct === 'ai' && !next.roundComplete && !isOver(next)) {
      replayBot();
    }
  };
  const assertAllReplayed = () => {
    if (aiIndex !== raw.aiActions.length) {
      throw new TypeError('poker: raw.aiActions contains an unused bot decision');
    }
  };

  replayBots();
  // A completed round opens the next street; the bot's opening turn is
  // replayed here too, so that the session always waits for the player (#413).
  for (;;) {
    if (isOver(next)) {
      assertAllReplayed();
      return terminalResult(next, next.winner, { folded: 'ai' });
    }
    if (!next.roundComplete) break;
    next = completeBettingRound(next);
    if ('outcome' in next) {
      assertAllReplayed();
      return next;
    }
    replayBots();
  }
  assertAllReplayed();

  next.needsDraw = true;
  next.availableActions = effectiveActions(next, next.toAct);
  return next;
}

/**
 * Reveals the final hands, compares the best five-card combinations, and
 * distributes the pot (an odd tied chip goes to the button).
 *
 * @param {object} state with five community cards.
 * @returns {object} a new terminal showdown state.
 */
export function resolveShowdown(state) {
  if (!Array.isArray(state.communityCards) || state.communityCards.length !== 5) {
    throw new TypeError('poker: showdown requires five community cards');
  }
  const playerEvaluation = bestPokerHand([...state.playerHand, ...state.communityCards]);
  const aiEvaluation = bestPokerHand([...state.aiHand, ...state.communityCards]);
  const comparison = comparePokerHands(playerEvaluation, aiEvaluation);
  const winner = comparison > 0 ? 'player' : comparison < 0 ? 'ai' : 'tie';
  return terminalResult(state, winner, {
    playerHand: playerEvaluation,
    aiHand: aiEvaluation,
    playerCards: state.playerHand.map((card) => ({ ...card })),
    aiCards: state.aiHand.map((card) => ({ ...card })),
  }, true);
}

/**
 * Creates a render-safe state: the AI hand is hidden until showdown and the
 * draw pile is never exposed to the UI.
 *
 * @param {object} state
 * @returns {object}
 */
export function view({ phase, session, gameResult } = {}) {
  if (gameResult !== undefined) {
    const details = gameResult.details;
    const result = {
      phase: phase ?? 'result',
      outcome: gameResult.outcome,
      winner: details.winner,
      playerHand: details.playerCards ?? [],
      communityCards: details.communityCards ?? [],
      totalBet: details.totalBet,
    };
    if (details.aiCards !== undefined) {
      result.aiHand = details.aiCards;
    }
    return result;
  }

  if (session === undefined) {
    throw new TypeError('poker: a session is required for the playing view');
  }
  return {
    phase: phase ?? 'playing',
    stage: session.stage,
    playerHand: session.playerHand.map((card) => ({ ...card })),
    communityCards: session.communityCards.map((card) => ({ ...card })),
    pot: session.pot,
    currentBet: session.currentBet,
    raiseStep: session.raiseStep,
    playerChips: session.playerChips,
    botChips: session.aiChips,
    playerContribution: session.playerContribution,
    botContribution: session.aiContribution,
    availableActions: [...session.availableActions],
  };
}

export const rules = Object.freeze({ start, step, view, availableActions, resolveShowdown });
