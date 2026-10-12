// Mock du Bingo contre bots au format de l'orchestrateur G2 (skill jeux-g2 § 1 à 3).
// Jeu multi-étapes : start(bets), puis action(sessionId, 'next') à chaque boule (règles G2 #310,
// README de src/games/bingo/, interface proposée par G3 dans #276).
//
// Même forme de view que les vraies règles :
//  - pendant la partie : { drawnBalls, currentBall, playerGrid, bots: [{ id, remaining }] },
//    playerGrid = 5 lignes de 5 cases { number, free, marked } ;
//  - à la fin : { drawnBalls, currentBall, playerGrid, bots: [{ id, grid }], winnerIds, outcome }.
//
// Démonstration déterministe : grilles et ordre des boules fixes, partie qui se termine au
// 12e tirage par une ligne du joueur. Le marquage des cases et l'avancement des bots sont
// simulés simplement pour l'affichage ; avec le vrai jeu, tout vient des règles G2.

const PLAYER = [
  [3, 18, 33, 48, 63],
  [7, 22, 38, 52, 70],
  [1, 25, null, 55, 66],
  [12, 16, 41, 59, 74],
  [9, 29, 44, 47, 61],
];
const BOTS = [
  [[2, 17, 31, 46, 62], [4, 19, 32, 49, 64], [6, 20, null, 50, 65], [8, 21, 34, 51, 67], [10, 23, 35, 53, 68]],
  [[11, 24, 36, 54, 69], [13, 26, 37, 56, 71], [14, 27, null, 57, 72], [15, 28, 39, 58, 73], [5, 30, 40, 60, 75]],
  [[1, 16, 42, 47, 61], [7, 22, 43, 55, 66], [9, 25, null, 59, 70], [12, 29, 44, 48, 74], [3, 18, 45, 52, 63]],
];
const BALLS = [18, 52, 3, 70, 33, 25, 75, 48, 5, 41, 60, 63];
// Fin de démonstration : la 1re ligne du joueur (3, 18, 33, 48, 63) est complète au 12e tirage.
const RESULT = { outcome: 'win', multiplier: 4, winnerIds: ['player'] };

const LINES = [
  ...[0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3, 4].map((c) => [r, c])),
  ...[0, 1, 2, 3, 4].map((c) => [0, 1, 2, 3, 4].map((r) => [r, c])),
  [0, 1, 2, 3, 4].map((i) => [i, i]),
  [0, 1, 2, 3, 4].map((i) => [i, 4 - i]),
];

const publicGrid = (grid, drawn) =>
  grid.map((row) => row.map((number) => ({ number, free: number === null, marked: number === null || drawn.has(number) })));

const remaining = (grid, drawn) =>
  Math.min(...LINES.map((line) => line.filter(([r, c]) => grid[r][c] !== null && !drawn.has(grid[r][c])).length));

let calls = 0;
const sessions = new Map();

const later = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 200));

function respond(sessionId, s) {
  const drawnBalls = BALLS.slice(0, s.count);
  const drawn = new Set(drawnBalls);
  const currentBall = drawnBalls[drawnBalls.length - 1] ?? null;
  if (s.count < BALLS.length) {
    return {
      sessionId,
      renderPayload: {
        gameId: 'bingo',
        phase: 'playing',
        view: {
          drawnBalls,
          currentBall,
          playerGrid: publicGrid(PLAYER, drawn),
          bots: BOTS.map((grid, i) => ({ id: `bot-${i + 1}`, remaining: remaining(grid, drawn) })),
        },
      },
      availableActions: ['next'],
      terminal: false,
    };
  }
  sessions.delete(sessionId);
  const bots = BOTS.map((grid, i) => ({ id: `bot-${i + 1}`, grid: publicGrid(grid, drawn) }));
  const details = { drawnBalls, currentBall, winnerIds: [...RESULT.winnerIds], playerGrid: publicGrid(PLAYER, drawn), bots };
  return {
    sessionId,
    renderPayload: {
      gameId: 'bingo',
      phase: 'result',
      view: { ...details, winnerIds: [...RESULT.winnerIds], outcome: RESULT.outcome },
    },
    availableActions: [],
    terminal: true,
    gameResult: { outcome: RESULT.outcome, multiplier: RESULT.multiplier, details },
  };
}

// Même forme que start(bets) de G2 : bets = [{ type: 'main', amount }].
export function mockStart(bets) {
  if (!Array.isArray(bets) || bets.length === 0) {
    return Promise.reject(new Error('bingo mock : bets doit être un tableau [{ type, amount }]'));
  }
  calls += 1;
  const sessionId = `bingo-mock-${calls}`;
  const s = { count: 0 };
  sessions.set(sessionId, s);
  return later(respond(sessionId, s));
}

// Même forme que action(sessionId, playerAction) de G2 : seule 'next' existe.
export function mockAction(sessionId, playerAction) {
  const s = sessions.get(sessionId);
  if (!s) {
    return Promise.reject(new Error(`bingo mock : session inconnue ou terminée '${sessionId}'`));
  }
  if (playerAction !== 'next') {
    return Promise.reject(new Error(`bingo mock : action non disponible '${playerAction}'`));
  }
  s.count += 1;
  return later(respond(sessionId, s));
}
