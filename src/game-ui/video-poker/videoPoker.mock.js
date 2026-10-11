// Mock du vidéo poker (Jacks or Better) au format de l'orchestrateur G2 (skill jeux-g2 § 1 à 3).
// Jeu multi-étapes : start(bets), puis action(sessionId, 'hold-<i>') pour garder / relâcher la
// carte i, puis action(sessionId, 'draw') qui termine la manche.
//
// Même forme que les vraies règles (src/games/video-poker/rules.js et README, #204) :
//  - pendant la manche, renderPayload.view = { hand, held } ;
//  - à la fin, view = { hand, held, result: { outcome, multiplier, category, tiebreakers } }.
//
// Déterministe : les cartes de remplacement viennent d'une file fixe par manche, et le résultat
// final est une donnée fixe de démonstration (prévue pour les cartes à garder indiquées), pas une
// évaluation de la main : l'UI et son mock n'évaluent jamais une main de poker. Avec le vrai jeu,
// le résultat vient des règles G2.

const card = (rank, suit) => Object.freeze({ rank, suit });

const scenarios = [
  {
    // À garder : les deux valets (positions 0 et 1) -> brelan de valets.
    hand: [card('J', 'hearts'), card('J', 'spades'), card('4', 'diamonds'), card('9', 'clubs'), card('2', 'hearts')],
    queue: [card('J', 'diamonds'), card('7', 'spades'), card('K', 'clubs'), card('8', 'hearts'), card('3', 'diamonds')],
    result: { outcome: 'win', multiplier: 3, category: 4, tiebreakers: [11, 13, 7] },
  },
  {
    // Rien à garder -> carte haute, perdu.
    hand: [card('3', 'clubs'), card('8', 'diamonds'), card('Q', 'spades'), card('5', 'hearts'), card('10', 'clubs')],
    queue: [card('6', 'spades'), card('K', 'diamonds'), card('2', 'clubs'), card('9', 'hearts'), card('4', 'diamonds')],
    result: { outcome: 'loss', multiplier: 0, category: 1, tiebreakers: [13, 9, 6, 4, 2] },
  },
];

const ACTIONS = ['hold-0', 'hold-1', 'hold-2', 'hold-3', 'hold-4', 'draw'];

let calls = 0;
const sessions = new Map();

const later = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 300));

function playing(sessionId, session) {
  return {
    sessionId,
    renderPayload: {
      gameId: 'video-poker',
      phase: 'playing',
      view: { hand: [...session.hand], held: [...session.held] },
    },
    availableActions: [...ACTIONS],
    terminal: false,
  };
}

// Même forme que start(bets) de G2 : bets = [{ type: 'main', amount }].
export function mockStart(bets) {
  if (!Array.isArray(bets) || bets.length === 0) {
    return Promise.reject(new Error('vidéo poker mock : bets doit être un tableau [{ type, amount }]'));
  }
  const scenario = scenarios[calls % scenarios.length];
  calls += 1;
  const sessionId = `video-poker-mock-${calls}`;
  const session = { scenario, hand: [...scenario.hand], held: [false, false, false, false, false] };
  sessions.set(sessionId, session);
  return later(playing(sessionId, session));
}

// Même forme que action(sessionId, playerAction) de G2 ; une action hors availableActions ou
// une session terminée est refusée, comme createGame.
export function mockAction(sessionId, playerAction) {
  const session = sessions.get(sessionId);
  if (!session) {
    return Promise.reject(new Error(`vidéo poker mock : session inconnue ou terminée '${sessionId}'`));
  }
  if (!ACTIONS.includes(playerAction)) {
    return Promise.reject(new Error(`vidéo poker mock : action non disponible '${playerAction}'`));
  }
  if (playerAction !== 'draw') {
    const index = Number(playerAction.slice('hold-'.length));
    session.held = session.held.map((held, i) => (i === index ? !held : held));
    return later(playing(sessionId, session));
  }
  sessions.delete(sessionId);
  const queue = [...session.scenario.queue];
  const hand = session.hand.map((c, i) => (session.held[i] ? c : queue.shift()));
  const { result } = session.scenario;
  const details = { hand, held: [...session.held], category: result.category, tiebreakers: [...result.tiebreakers] };
  return later({
    sessionId,
    renderPayload: {
      gameId: 'video-poker',
      phase: 'result',
      view: { hand: [...hand], held: [...session.held], result: { ...result, tiebreakers: [...result.tiebreakers] } },
    },
    availableActions: [],
    terminal: true,
    gameResult: { outcome: result.outcome, multiplier: result.multiplier, details },
  });
}
