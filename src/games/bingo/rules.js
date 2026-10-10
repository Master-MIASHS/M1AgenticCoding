const BALL_COUNT = 75;
const GRID_SIZE = 5;
const BOT_COUNT = 3;
const FREE_ROW = 2;
const FREE_COLUMN = 2;
const COLUMN_RANGES = [
  [1, 15],
  [16, 30],
  [31, 45],
  [46, 60],
  [61, 75],
];

function validateBalls(balls) {
  if (
    !Array.isArray(balls) ||
    balls.length !== BALL_COUNT ||
    new Set(balls).size !== BALL_COUNT ||
    balls.some((ball) => !Number.isInteger(ball) || ball < 1 || ball > BALL_COUNT)
  ) {
    throw new TypeError('bingo: raw.balls must be a permutation of the numbers 1 to 75');
  }
  return [...balls];
}

function validateGrid(grid, label) {
  if (!Array.isArray(grid) || grid.length !== GRID_SIZE) {
    throw new TypeError(`bingo: ${label} must be a 5 by 5 grid`);
  }
  const numbers = new Set();
  for (let row = 0; row < GRID_SIZE; row += 1) {
    if (!Array.isArray(grid[row]) || grid[row].length !== GRID_SIZE) {
      throw new TypeError(`bingo: ${label} must be a 5 by 5 grid`);
    }
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const number = grid[row][col];
      if (row === FREE_ROW && col === FREE_COLUMN) {
        if (number !== null) throw new TypeError(`bingo: ${label} center must be free`);
        continue;
      }
      const [min, max] = COLUMN_RANGES[col];
      if (!Number.isInteger(number) || number < min || number > max || numbers.has(number)) {
        throw new TypeError(`bingo: ${label} contains an invalid or duplicate number`);
      }
      numbers.add(number);
    }
  }
  return grid.map((row) => [...row]);
}

function validateRaw(raw) {
  if (raw === null || typeof raw !== 'object' || raw.grids === null || typeof raw.grids !== 'object') {
    throw new TypeError('bingo: raw must contain balls and player/bot grids');
  }
  if (!Array.isArray(raw.grids.bots) || raw.grids.bots.length !== BOT_COUNT) {
    throw new TypeError(`bingo: raw.grids.bots must contain exactly ${BOT_COUNT} grids`);
  }
  return {
    balls: validateBalls(raw.balls),
    grids: {
      player: validateGrid(raw.grids.player, 'player grid'),
      bots: raw.grids.bots.map((grid, index) => validateGrid(grid, `bot-${index + 1} grid`)),
    },
  };
}

function readPaytable(config) {
  const win = config?.paytable?.win;
  if (typeof win !== 'number' || !Number.isFinite(win) || win < 0) {
    throw new TypeError('bingo: config.paytable.win is required (a finite number >= 0)');
  }
  return { win };
}

function readBet(bets) {
  if (!Array.isArray(bets) || bets.length !== 1) {
    throw new TypeError('bingo: bets must contain exactly one { type, amount } bet');
  }
  const [bet] = bets;
  if (
    typeof bet?.type !== 'string' ||
    bet.type.length === 0 ||
    typeof bet.amount !== 'number' ||
    !Number.isFinite(bet.amount) ||
    bet.amount <= 0
  ) {
    throw new TypeError('bingo: the bet must have a type and a positive finite amount');
  }
  return bet.amount;
}

function winningLines() {
  const lines = [];
  for (let index = 0; index < GRID_SIZE; index += 1) {
    lines.push(
      Array.from({ length: GRID_SIZE }, (_, col) => [index, col]),
      Array.from({ length: GRID_SIZE }, (_, row) => [row, index])
    );
  }
  lines.push(
    Array.from({ length: GRID_SIZE }, (_, index) => [index, index]),
    Array.from({ length: GRID_SIZE }, (_, index) => [index, GRID_SIZE - 1 - index])
  );
  return lines;
}

const WINNING_LINES = winningLines();

function isMarked(number, drawnBalls) {
  return number === null || drawnBalls.has(number);
}

function hasBingo(grid, drawnBalls) {
  return WINNING_LINES.some((line) =>
    line.every(([row, col]) => isMarked(grid[row][col], drawnBalls))
  );
}

function remainingFor(grid, drawnBalls) {
  return Math.min(
    ...WINNING_LINES.map((line) =>
      line.filter(([row, col]) => !isMarked(grid[row][col], drawnBalls)).length
    )
  );
}

function publicGrid(grid, drawnBalls) {
  return grid.map((row) =>
    row.map((number) => ({
      number,
      free: number === null,
      marked: isMarked(number, drawnBalls),
    }))
  );
}

function winnersFor(grids, drawnBalls) {
  const winners = [];
  if (hasBingo(grids.player, drawnBalls)) winners.push('player');
  grids.bots.forEach((grid, index) => {
    if (hasBingo(grid, drawnBalls)) winners.push(`bot-${index + 1}`);
  });
  return winners;
}

function makeResult(session, winnerIds) {
  const playerWon = winnerIds.includes('player');
  const botWon = winnerIds.some((id) => id !== 'player');
  const multiplier = playerWon ? (botWon ? 1 : session.paytable.win) : 0;
  const outcome = multiplier > 1 ? 'win' : multiplier === 1 ? 'push' : 'loss';
  const drawnBalls = [...session.drawnBalls];
  const markedBalls = new Set(drawnBalls);
  return {
    outcome,
    multiplier,
    details: {
      drawnBalls,
      currentBall: drawnBalls[drawnBalls.length - 1],
      winnerIds,
      playerGrid: publicGrid(session.grids.player, markedBalls),
      bots: session.grids.bots.map((grid, index) => ({
        id: `bot-${index + 1}`,
        grid: publicGrid(grid, markedBalls),
      })),
    },
  };
}

/**
 * Ouvre une partie avec les données déjà mélangées par draw().
 *
 * @param {object} raw - ordre des 75 boules et grilles du joueur et des bots.
 * @param {object} [options]
 * @param {Array<{ type: string, amount: number }>} [options.bets] - mise unique.
 * @param {{ paytable: { win: number } }} [options.config] - multiplicateur de victoire fourni par la configuration.
 * @returns {object} session active, prête à recevoir l'action `next`.
 */
export function start(raw, { bets, config } = {}) {
  const totalBet = readBet(bets);
  const paytable = readPaytable(config);
  const { balls, grids } = validateRaw(raw);
  const session = {
    needsDraw: true,
    balls,
    grids,
    drawIndex: 0,
    drawnBalls: [],
    totalBet,
    paytable,
    availableActions: ['next'],
  };
  return session;
}

/**
 * Tire une boule, vérifie les grilles puis règle la manche au premier bingo.
 *
 * @param {object} session - état privé de la manche.
 * @param {string} action - action actuellement disponible (`next`).
 * @returns {object} nouvelle session ou résultat terminal.
 */
export function step(session, action) {
  if (
    session?.needsDraw !== true ||
    !Array.isArray(session.balls) ||
    !Array.isArray(session.drawnBalls) ||
    !Array.isArray(session.availableActions)
  ) {
    throw new TypeError('bingo: step requires an active bingo session');
  }
  if (!session.availableActions.includes(action)) {
    throw new TypeError(`bingo: unsupported action "${action}"`);
  }

  const drawnBalls = [...session.drawnBalls, session.balls[session.drawIndex]];
  const nextSession = { ...session, drawIndex: session.drawIndex + 1, drawnBalls };
  const winnerIds = winnersFor(session.grids, new Set(drawnBalls));
  if (winnerIds.length > 0) return makeResult(nextSession, winnerIds);
  if (nextSession.drawIndex >= BALL_COUNT) {
    throw new Error('bingo: no grid completed a line after all 75 balls were drawn');
  }
  return nextSession;
}

/**
 * Construit la vue G3 sans dévoiler les grilles des bots avant le résultat.
 *
 * @param {object} [options]
 * @param {'playing' | 'result'} options.phase - phase transmise par createGame.
 * @param {object} [options.session] - session privée pendant la partie.
 * @param {object} [options.gameResult] - résultat terminal après le règlement.
 * @returns {object} données d'affichage autorisées pour la phase.
 */
export function view({ phase, session, gameResult } = {}) {
  if (phase === 'result') {
    const details = gameResult?.details;
    if (!details || !Array.isArray(details.drawnBalls)) {
      throw new TypeError('bingo: result view requires bingo details');
    }
    return {
      drawnBalls: [...details.drawnBalls],
      currentBall: details.currentBall,
      playerGrid: details.playerGrid,
      bots: details.bots,
      winnerIds: [...details.winnerIds],
      outcome: gameResult.outcome,
    };
  }
  if (
    phase !== 'playing' ||
    session?.needsDraw !== true ||
    !Array.isArray(session.drawnBalls) ||
    !session.grids
  ) {
    throw new TypeError('bingo: view requires a playing session or a terminal result');
  }
  const drawnBalls = [...session.drawnBalls];
  const markedBalls = new Set(drawnBalls);
  return {
    drawnBalls,
    currentBall: drawnBalls[drawnBalls.length - 1] ?? null,
    playerGrid: publicGrid(session.grids.player, markedBalls),
    bots: session.grids.bots.map((grid, index) => ({
      id: `bot-${index + 1}`,
      remaining: remainingFor(grid, markedBalls),
    })),
  };
}
