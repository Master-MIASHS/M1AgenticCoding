// Mock du blackjack au format de l'orchestrateur G2 (skill jeux-g2 § 1 à 3).
// Jeu multi-étapes : start(bets) ouvre la manche, puis action(sessionId, playerAction)
// jusqu'à terminal: true. Déterministe : chaque manche est un petit scénario écrit à
// l'avance (états et transitions fixes), l'UI ne tire aucune carte et ne calcule rien.
//
// Même forme que les vraies règles (src/games/blackjack/rules.js, #203) :
//  - pendant la manche, renderPayload.view = { phase, playerHand, playerTotal, dealerHand
//    (carte visible seulement), dealerHiddenCards } ;
//  - à la fin, view = { phase: 'result', playerHand, playerTotal, dealerHand, dealerTotal,
//    outcome, natural } et gameResult.details = { playerHand, dealerHand, playerTotal,
//    dealerTotal, totalBet, natural }.

const card = (rank, suit) => Object.freeze({ rank, suit });

// Chaque manche : un état d'ouverture et, pour chaque état, la suite de chaque action.
// Un état terminal porte `result` (outcome, multiplier, mains finales, mise engagée).
const scenarios = [
  {
    open: 'deal',
    states: {
      deal: {
        player: [card('10', 'hearts'), card('6', 'clubs')],
        playerTotal: 16,
        dealerUp: card('9', 'spades'),
        actions: ['hit', 'stand', 'double'],
        next: { hit: 'hit1', stand: 'standLoss', double: 'doubleWin' },
      },
      hit1: {
        player: [card('10', 'hearts'), card('6', 'clubs'), card('4', 'diamonds')],
        playerTotal: 20,
        dealerUp: card('9', 'spades'),
        actions: ['hit', 'stand'],
        next: { hit: 'bust', stand: 'standWin' },
      },
      standLoss: {
        result: {
          outcome: 'loss', multiplier: 0, betFactor: 1, natural: false,
          player: [card('10', 'hearts'), card('6', 'clubs')], playerTotal: 16,
          dealer: [card('9', 'spades'), card('8', 'hearts')], dealerTotal: 17,
        },
      },
      doubleWin: {
        result: {
          outcome: 'win', multiplier: 2, betFactor: 2, natural: false,
          player: [card('10', 'hearts'), card('6', 'clubs'), card('5', 'spades')], playerTotal: 21,
          dealer: [card('9', 'spades'), card('8', 'hearts')], dealerTotal: 17,
        },
      },
      standWin: {
        result: {
          outcome: 'win', multiplier: 2, betFactor: 1, natural: false,
          player: [card('10', 'hearts'), card('6', 'clubs'), card('4', 'diamonds')], playerTotal: 20,
          dealer: [card('9', 'spades'), card('8', 'hearts')], dealerTotal: 17,
        },
      },
      bust: {
        result: {
          outcome: 'loss', multiplier: 0, betFactor: 1, natural: false,
          player: [card('10', 'hearts'), card('6', 'clubs'), card('4', 'diamonds'), card('K', 'clubs')],
          playerTotal: 30,
          dealer: [card('9', 'spades'), card('8', 'hearts')], dealerTotal: 17,
        },
      },
    },
  },
  {
    open: 'natural',
    states: {
      natural: {
        result: {
          outcome: 'win', multiplier: 2.5, betFactor: 1, natural: true,
          player: [card('A', 'spades'), card('K', 'hearts')], playerTotal: 21,
          dealer: [card('7', 'clubs'), card('9', 'diamonds')], dealerTotal: 16,
        },
      },
    },
  },
];

let calls = 0;
const sessions = new Map();

function respond(sessionId, scenario, stateName, openingBet) {
  const state = scenario.states[stateName];
  if (!state.result) {
    sessions.set(sessionId, { scenario, stateName, openingBet });
    return {
      sessionId,
      renderPayload: {
        gameId: 'blackjack',
        phase: 'playing',
        view: {
          phase: 'playing',
          playerHand: [...state.player],
          playerTotal: state.playerTotal,
          dealerHand: [state.dealerUp],
          dealerHiddenCards: 1,
        },
      },
      availableActions: [...state.actions],
      terminal: false,
    };
  }
  sessions.delete(sessionId);
  const r = state.result;
  const details = {
    playerHand: [...r.player],
    dealerHand: [...r.dealer],
    playerTotal: r.playerTotal,
    dealerTotal: r.dealerTotal,
    totalBet: openingBet * r.betFactor,
    natural: r.natural,
  };
  return {
    sessionId,
    renderPayload: {
      gameId: 'blackjack',
      phase: 'result',
      view: {
        phase: 'result',
        playerHand: [...r.player],
        playerTotal: r.playerTotal,
        dealerHand: [...r.dealer],
        dealerTotal: r.dealerTotal,
        outcome: r.outcome,
        natural: r.natural,
      },
    },
    availableActions: [],
    terminal: true,
    gameResult: { outcome: r.outcome, multiplier: r.multiplier, details },
  };
}

const later = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 400));

// Même forme que start(bets) de G2 : bets = [{ type: 'main', amount }].
export function mockStart(bets) {
  if (!Array.isArray(bets) || bets.length === 0) {
    return Promise.reject(new Error('blackjack mock : bets doit être un tableau [{ type, amount }]'));
  }
  const openingBet = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const scenario = scenarios[calls % scenarios.length];
  calls += 1;
  return later(respond(`blackjack-mock-${calls}`, scenario, scenario.open, openingBet));
}

// Même forme que action(sessionId, playerAction) de G2 : playerAction doit être une valeur
// de availableActions, sinon erreur (comme createGame).
export function mockAction(sessionId, playerAction) {
  const entry = sessions.get(sessionId);
  if (!entry) {
    return Promise.reject(new Error(`blackjack mock : session inconnue ou terminée '${sessionId}'`));
  }
  const nextState = entry.scenario.states[entry.stateName].next[playerAction];
  if (!nextState) {
    return Promise.reject(new Error(`blackjack mock : action non disponible '${playerAction}'`));
  }
  return later(respond(sessionId, entry.scenario, nextState, entry.openingBet));
}
