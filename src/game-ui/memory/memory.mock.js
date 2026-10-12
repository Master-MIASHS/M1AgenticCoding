// Mock du Memory casino au format de l'orchestrateur G2 (skill jeux-g2 § 1 à 3).
// Jeu multi-étapes : start(bets), puis action(sessionId, 'reveal-<i>'), et 'continue' après
// une paire ratée (règles G2 #300, README de src/games/memory/, interface validée dans #274).
//
// Même forme que les vraies règles :
//  - view = { cards: [{ position, symbol | null, revealed, matched }], turnsUsed,
//    turnsRemaining, maxTurns, pairsFound, pendingMismatch } pendant la partie ;
//  - à la fin, plateau entièrement révélé et view.result = { outcome, multiplier, success }.
//
// Ce mock remplace l'orchestrateur en démonstration : plateau fixe (pas de hasard) et
// déroulement simulé simplement pour pouvoir jouer. Avec le vrai jeu, tout vient des
// règles G2 ; le composant MemoryGame, lui, ne décide jamais rien.

const BOARD = [
  'chip', 'bell', 'dice', 'jackpot',
  'card', 'horseshoe', 'roulette-wheel', 'slot-machine',
  'bell', 'chip', 'jackpot', 'dice',
  'slot-machine', 'card', 'horseshoe', 'roulette-wheel',
];
const MAX_TURNS = 16;
// Résultats fixes de démonstration (multiplier mise incluse, contrat § 2.2).
const SUCCESS = { outcome: 'win', multiplier: 2, success: true };
const FAILURE = { outcome: 'loss', multiplier: 0, success: false };

let calls = 0;
const sessions = new Map();

const later = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 250));

function publicView(s) {
  return {
    cards: BOARD.map((symbol, position) => {
      const revealed = s.revealed.includes(position);
      const matched = s.matched[position];
      return { position, symbol: revealed || matched ? symbol : null, revealed, matched };
    }),
    turnsUsed: s.turnsUsed,
    turnsRemaining: MAX_TURNS - s.turnsUsed,
    maxTurns: MAX_TURNS,
    pairsFound: s.pairsFound,
    pendingMismatch: s.pendingMismatch,
  };
}

function playing(sessionId, s) {
  const availableActions = s.pendingMismatch
    ? ['continue']
    : BOARD.map((_, i) => i).filter((i) => !s.matched[i] && !s.revealed.includes(i)).map((i) => `reveal-${i}`);
  return {
    sessionId,
    renderPayload: { gameId: 'memory', phase: 'playing', view: publicView(s) },
    availableActions,
    terminal: false,
  };
}

function finished(sessionId, s, result) {
  sessions.delete(sessionId);
  const details = {
    board: [...BOARD],
    matched: [...s.matched],
    turnsUsed: s.turnsUsed,
    pairsFound: s.pairsFound,
    success: result.success,
  };
  return {
    sessionId,
    renderPayload: {
      gameId: 'memory',
      phase: 'result',
      view: {
        cards: BOARD.map((symbol, position) => ({ position, symbol, revealed: true, matched: s.matched[position] })),
        turnsUsed: s.turnsUsed,
        turnsRemaining: MAX_TURNS - s.turnsUsed,
        maxTurns: MAX_TURNS,
        pairsFound: s.pairsFound,
        result: { ...result },
      },
    },
    availableActions: [],
    terminal: true,
    gameResult: { outcome: result.outcome, multiplier: result.multiplier, details },
  };
}

// Même forme que start(bets) de G2 : bets = [{ type: 'main', amount }].
export function mockStart(bets) {
  if (!Array.isArray(bets) || bets.length === 0) {
    return Promise.reject(new Error('memory mock : bets doit être un tableau [{ type, amount }]'));
  }
  calls += 1;
  const sessionId = `memory-mock-${calls}`;
  const s = { matched: Array(BOARD.length).fill(false), revealed: [], turnsUsed: 0, pairsFound: 0, pendingMismatch: false };
  sessions.set(sessionId, s);
  return later(playing(sessionId, s));
}

// Même forme que action(sessionId, playerAction) de G2 ; une action indisponible ou une
// session terminée est refusée, comme createGame.
export function mockAction(sessionId, playerAction) {
  const s = sessions.get(sessionId);
  if (!s) {
    return Promise.reject(new Error(`memory mock : session inconnue ou terminée '${sessionId}'`));
  }
  if (!playing(sessionId, s).availableActions.includes(playerAction)) {
    return Promise.reject(new Error(`memory mock : action non disponible '${playerAction}'`));
  }
  if (playerAction === 'continue') {
    s.revealed = [];
    s.pendingMismatch = false;
    if (s.turnsUsed >= MAX_TURNS) return later(finished(sessionId, s, FAILURE));
    return later(playing(sessionId, s));
  }
  s.revealed = [...s.revealed, Number(playerAction.slice('reveal-'.length))];
  if (s.revealed.length === 2) {
    s.turnsUsed += 1;
    const [a, b] = s.revealed;
    if (BOARD[a] === BOARD[b]) {
      s.matched[a] = true;
      s.matched[b] = true;
      s.pairsFound += 1;
      s.revealed = [];
      if (s.pairsFound === BOARD.length / 2) return later(finished(sessionId, s, SUCCESS));
      if (s.turnsUsed >= MAX_TURNS) return later(finished(sessionId, s, FAILURE));
    } else {
      s.pendingMismatch = true;
    }
  }
  return later(playing(sessionId, s));
}
