import { buildDeck, createShoe, draw as drawCards, remaining } from '../deck.js';
import { applyBot, applyPlayer, botPayload, isOver } from './engine.js';

/**
 * Deals two private cards to each player from a Core-shuffled one-deck shoe.
 *
 * @param {object} core Core facade provided by createGame.
 * @param {object} [context] draw context, unused at the start of a hand.
 * @returns {{ playerHand: object[], aiHand: object[], shoe: object }}
 */
export function drawInitial(core) {
  if (typeof core?.melanger !== 'function') {
    throw new TypeError('poker: core.melanger is required to deal a new hand');
  }

  const shuffled = core.melanger(buildDeck(1));
  const dealt = drawCards(createShoe(shuffled), 4);
  if (remaining(dealt.shoe) < 5) {
    throw new RangeError('poker: at least five cards must remain for the community board');
  }

  return {
    playerHand: [dealt.cards[0], dealt.cards[2]],
    aiHand: [dealt.cards[1], dealt.cards[3]],
    shoe: dealt.shoe,
  };
}

function playBots(core, currentState, actions) {
  let state = currentState;
  while (state.toAct === 'ai' && !state.roundComplete && !isOver(state)) {
    if (typeof core?.choisirAction !== 'function') {
      throw new TypeError('poker: core.choisirAction is required when the bot acts');
    }
    const payload = botPayload(state);
    if (state.playerChips === 0) {
      payload.availableActions = payload.availableActions.filter((action) => action !== 'raise');
    }
    const decision = core.choisirAction(payload);
    state = applyBot(state, decision);
    actions.push(decision);
  }
  return state;
}

/**
 * Produces initial cards or simulates bot decisions around one player action.
 * Bot decisions are returned in execution order for rules.step() to replay.
 *
 * @param {object} core Core facade provided by createGame.
 * @param {{ session?: object, action?: string }} [context]
 * @returns {object} initial deal or raw draw with ordered aiActions.
 */
export function draw(core, context = {}) {
  if (context.session === undefined) {
    return drawInitial(core, context);
  }
  if (typeof context.action !== 'string') {
    throw new TypeError('poker: a player action is required for an active session');
  }
  if (
    context.session.toAct === 'player' &&
    !context.session.availableActions?.includes(context.action)
  ) {
    throw new TypeError(`poker: player action ${context.action} is not available`);
  }

  const aiActions = [];
  let state = playBots(core, context.session, aiActions);
  if (isOver(state) || state.roundComplete) {
    throw new TypeError('poker: no player action is expected in the current state');
  }
  if (state.toAct !== 'player' || !state.availableActions?.includes(context.action)) {
    throw new TypeError(`poker: player action ${context.action} is not available`);
  }

  state = applyPlayer(state, context.action);
  if (!isOver(state)) {
    state = playBots(core, state, aiActions);
  }

  return { aiActions };
}

export default draw;
