import { bestPokerHand } from '../cardUtils.js';

const PLAYERS = Object.freeze(['player', 'ai']);
const RANK_VALUES = Object.freeze({
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
});

function otherPlayer(player) {
  return player === 'player' ? 'ai' : 'player';
}

function chips(state, player) {
  return player === 'player' ? state.playerChips : state.aiChips;
}

function contribution(state, player) {
  return player === 'player' ? state.playerContribution : state.aiContribution;
}

function due(state, player) {
  return Math.max(0, state.currentBet - contribution(state, player));
}

function validateState(state) {
  if (state === null || typeof state !== 'object' || Array.isArray(state)) {
    throw new TypeError('poker engine: state must be an object');
  }
  for (const field of [
    'playerChips',
    'aiChips',
    'playerContribution',
    'aiContribution',
    'pot',
    'currentBet',
    'raiseStep',
    'totalBet',
  ]) {
    const value = state[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new TypeError(`poker engine: ${field} must be a non-negative finite number`);
    }
  }
  if (state.raiseStep === 0) {
    throw new TypeError('poker engine: raiseStep must be greater than zero');
  }
  if (
    !PLAYERS.includes(state.toAct) ||
    !Array.isArray(state.pendingActions) ||
    state.pendingActions.length === 0 ||
    state.pendingActions[0] !== state.toAct ||
    state.pendingActions.some((player) => !PLAYERS.includes(player))
  ) {
    throw new TypeError('poker engine: state must have a valid actor and pending actions');
  }
}

function availableActions(state, actor) {
  const callAmount = due(state, actor);
  const actions = ['fold'];
  if (callAmount === 0) {
    actions.push('check');
  } else {
    actions.push('call');
  }
  if (chips(state, actor) - callAmount >= state.raiseStep) {
    actions.push('raise');
  }
  return actions;
}

function isMultiple(amount, step) {
  const quotient = amount / step;
  return Math.abs(quotient - Math.round(quotient)) < 1e-9;
}

function applyAction(state, actor, type, raiseAmount = 0) {
  validateState(state);
  if (state.terminal === true || state.roundComplete === true) {
    throw new TypeError('poker engine: cannot apply an action after the betting round');
  }
  if (state.toAct !== actor) {
    throw new TypeError(`poker engine: it is not ${actor}'s turn`);
  }

  const legalActions = availableActions(state, actor);
  if (!legalActions.includes(type)) {
    throw new TypeError(`poker engine: ${type} is not available to ${actor}`);
  }

  const next = {
    ...state,
    pendingActions: [...state.pendingActions],
    availableActions: [...legalActions],
  };
  const opponent = otherPlayer(actor);

  if (type === 'fold') {
    next.pendingActions = [];
    next.availableActions = [];
    next.toAct = null;
    next.terminal = true;
    next.roundComplete = true;
    next.winner = opponent;
    return next;
  }

  const callAmount = due(state, actor);
  const payment = Math.min(callAmount, chips(state, actor))
    + (type === 'raise' ? raiseAmount : 0);
  if (payment > chips(state, actor)) {
    throw new RangeError(`poker engine: ${actor} cannot afford this action`);
  }

  next[`${actor}Chips`] = chips(state, actor) - payment;
  next[`${actor}Contribution`] = contribution(state, actor) + payment;
  next.pot += payment;
  if (actor === 'player') {
    next.totalBet += payment;
  }

  if (type === 'raise') {
    next.currentBet = contribution(next, actor);
    next.pendingActions = chips(next, opponent) > 0 ? [opponent] : [];
  } else {
    next.pendingActions = state.pendingActions
      .slice(1)
      .filter((player) => chips(next, player) > 0);
  }

  next.roundComplete = next.pendingActions.length === 0;
  next.toAct = next.pendingActions[0] ?? null;
  next.availableActions = next.toAct === null ? [] : availableActions(next, next.toAct);
  return next;
}

function handStrength(cards) {
  if (cards.length >= 5) {
    const { category, tiebreakers } = bestPokerHand(cards);
    const tieValue = tiebreakers.reduce((value, rank) => value * 13 + rank - 2, 0);
    const tieFraction = tieValue / 13 ** tiebreakers.length;
    return Math.min(1, (category - 1 + tieFraction) / 9);
  }

  const values = cards.map((card) => RANK_VALUES[card.rank]).sort((a, b) => b - a);
  const highest = values[0];
  const secondHighest = values[1];
  const isPair = values.some((rank, index) => values.indexOf(rank) !== index);
  const pairBonus = isPair ? 0.22 + highest / 100 : 0;
  const suitedBonus =
    cards.length === 2 && cards[0].suit === cards[1].suit ? 0.04 : 0;
  const connectedBonus =
    cards.length === 2 && highest - secondHighest <= 2 ? 0.025 : 0;
  return Math.max(
    0,
    Math.min(1, (highest + secondHighest) / 56 + pairBonus + suitedBonus + connectedBonus),
  );
}

/**
 * Applies a player action. The only raise action is `raise`; its supplement
 * is fixed by the state's raiseStep.
 *
 * @param {object} state current betting state.
 * @param {string} action player action.
 * @returns {object} a new state; the input is not mutated.
 */
export function applyPlayer(state, action) {
  if (typeof action !== 'string') {
    throw new TypeError('poker engine: player action must be a string');
  }
  if (action === 'raise') {
    validateState(state);
    return applyAction(state, 'player', action, state.raiseStep);
  }
  return applyAction(state, 'player', action);
}

/**
 * Applies an AI decision. A raise amount is a supplement; if the bot cannot
 * afford it, it is reduced to the largest payable multiple of raiseStep.
 *
 * @param {object} state current betting state.
 * @param {{ type: string, amount?: number }} decision AI decision.
 * @returns {object} a new state; the input is not mutated.
 */
export function applyBot(state, decision) {
  validateState(state);
  if (decision === null || typeof decision !== 'object' || Array.isArray(decision)) {
    throw new TypeError('poker engine: bot decision must be an object');
  }
  if (decision.type !== 'raise') {
    if (decision.amount !== undefined) {
      throw new TypeError('poker engine: only a raise decision may include amount');
    }
    return applyAction(state, 'ai', decision.type);
  }
  if (
    typeof decision.amount !== 'number' ||
    !Number.isFinite(decision.amount) ||
    decision.amount <= 0
  ) {
    throw new TypeError('poker engine: bot raise amount must be a positive finite number');
  }

  const raiseCapacity = chips(state, 'ai') - due(state, 'ai');
  if (
    decision.amount < state.raiseStep ||
    (!isMultiple(decision.amount, state.raiseStep) && decision.amount !== raiseCapacity)
  ) {
    throw new TypeError(
      'poker engine: bot raise amount must be a raiseStep multiple or an exact all-in',
    );
  }
  const raiseAmount = Math.min(decision.amount, raiseCapacity);
  if (
    raiseAmount < state.raiseStep ||
    (!isMultiple(raiseAmount, state.raiseStep) && raiseAmount !== raiseCapacity)
  ) {
    throw new RangeError('poker engine: bot cannot afford a raiseStep after calling');
  }
  return applyAction(state, 'ai', 'raise', raiseAmount);
}

/**
 * Creates the private situation sent to the Core poker AI.
 *
 * @param {object} state current betting state.
 * @returns {object} AI payload; the player's hole cards are not included.
 */
export function botPayload(state) {
  validateState(state);
  const holeCards = state.aiHand;
  const communityCards = state.communityCards;
  const toCall = due(state, 'ai');
  const chipsAfterCall = Math.max(0, state.aiChips - toCall);
  if (
    !Array.isArray(holeCards) ||
    holeCards.length !== 2 ||
    !Array.isArray(communityCards) ||
    holeCards.length + communityCards.length > 7
  ) {
    throw new TypeError('poker engine: AI hand must contain two hole cards and at most five board cards');
  }

  return {
    stage: state.stage,
    communityCards: communityCards.map((card) => ({ ...card })),
    pot: state.pot,
    currentBet: state.currentBet,
    minRaise: state.raiseStep,
    playerState: {
      chips: state.playerChips,
      currentContribution: state.playerContribution,
    },
    aiState: {
      hand: holeCards.map((card) => ({ ...card })),
      chips: chipsAfterCall,
      currentContribution: state.aiContribution,
    },
    availableActions: availableActions(state, 'ai'),
    aiHandStrength: handStrength([...holeCards, ...communityCards]),
  };
}

/**
 * Indicates whether the hand itself is terminal (as opposed to a completed
 * betting round, which the rules module must advance to the next street).
 *
 * @param {object} state current Poker state.
 * @returns {boolean} true after a terminal action or showdown.
 */
export function isOver(state) {
  return state !== null && typeof state === 'object' && state.terminal === true;
}
