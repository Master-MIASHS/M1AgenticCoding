const PAIR_COUNT = 8;
const BOARD_SIZE = PAIR_COUNT * 2;
const MIN_TURNS = PAIR_COUNT;
const MAX_TURNS = 16;
const PAYTABLE_TURNS = Object.freeze(
  Array.from({ length: MAX_TURNS - MIN_TURNS + 1 }, (_, index) => MIN_TURNS + index)
);

/**
 * Validates and copies the shuffled board supplied at the start of a round.
 *
 * @param {unknown} raw - shuffled symbols returned by the game's draw function.
 * @returns {Array<{ symbol: string }>}
 * @throws {TypeError} when the board does not contain eight distinct pairs.
 */
function copyAndValidateBoard(raw) {
  if (!Array.isArray(raw) || raw.length !== BOARD_SIZE) {
    throw new TypeError(`memory: raw must contain exactly ${BOARD_SIZE} cards`);
  }

  const counts = new Map();
  const board = raw.map((card, index) => {
    if (
      card === null ||
      typeof card !== 'object' ||
      typeof card.symbol !== 'string' ||
      card.symbol.length === 0
    ) {
      throw new TypeError(`memory: invalid card at index ${index}`);
    }
    counts.set(card.symbol, (counts.get(card.symbol) ?? 0) + 1);
    return Object.freeze({ symbol: card.symbol });
  });

  if (counts.size !== PAIR_COUNT || [...counts.values()].some((count) => count !== 2)) {
    throw new TypeError(`memory: board must contain ${PAIR_COUNT} symbols exactly twice`);
  }
  return board;
}

/**
 * Validates and copies the required turn-based return multipliers.
 *
 * @param {unknown} config - game configuration containing `paytable`.
 * @returns {Record<string, number>}
 * @throws {TypeError} when a multiplier for a possible completion turn is absent or invalid.
 */
function copyAndValidatePaytable(config) {
  if (
    config === null ||
    typeof config !== 'object' ||
    config.paytable === null ||
    typeof config.paytable !== 'object' ||
    Array.isArray(config.paytable)
  ) {
    throw new TypeError('memory: config.paytable is required');
  }

  const entries = Object.entries(config.paytable);
  const validKeys = new Set(PAYTABLE_TURNS.map(String));
  if (
    entries.length !== PAYTABLE_TURNS.length ||
    entries.some(
      ([turns, multiplier]) =>
        !validKeys.has(turns) ||
        typeof multiplier !== 'number' ||
        !Number.isFinite(multiplier) ||
        multiplier < 0
    )
  ) {
    throw new TypeError('memory: paytable must define multipliers for 8 through 16 turns');
  }
  return Object.fromEntries(entries);
}

/**
 * Returns the actions allowed for the current private state.
 *
 * @param {object} state - private game state.
 * @returns {string[]} indexed reveal actions, or `continue` after a mismatch.
 */
function getAvailableActions(state) {
  if (state.pendingMismatch) return ['continue'];
  if (state.revealed.length >= 2) return [];
  return state.board.flatMap((_, index) =>
    !state.matched[index] && !state.revealed.includes(index) ? [`reveal-${index}`] : []
  );
}

/**
 * Creates a pending session with an action list derived from its state.
 *
 * @param {object} state - updated private game state.
 * @returns {object} pending session for the orchestrator.
 */
function pendingSession(state) {
  return {
    ...state,
    availableActions: getAvailableActions(state),
    needsDraw: true,
  };
}

/**
 * Checks the private state required to process a player action.
 *
 * @param {unknown} session - current private round state.
 * @throws {TypeError} when the session is not a valid Memory session.
 */
function assertSession(session) {
  if (
    session === null ||
    typeof session !== 'object' ||
    !Array.isArray(session.board) ||
    session.board.length !== BOARD_SIZE ||
    !Array.isArray(session.matched) ||
    session.matched.length !== BOARD_SIZE ||
    !session.matched.every((value) => typeof value === 'boolean') ||
    !Array.isArray(session.revealed) ||
    session.revealed.length > 2 ||
    !session.revealed.every((index) => Number.isInteger(index) && index >= 0 && index < BOARD_SIZE) ||
    !Number.isInteger(session.turnsUsed) ||
    session.turnsUsed < 0 ||
    session.turnsUsed > MAX_TURNS ||
    !Number.isInteger(session.pairsFound) ||
    session.pairsFound < 0 ||
    session.pairsFound > PAIR_COUNT ||
    typeof session.pendingMismatch !== 'boolean' ||
    session.paytable === null ||
    typeof session.paytable !== 'object' ||
    !Array.isArray(session.availableActions)
  ) {
    throw new TypeError('memory: invalid session');
  }
}

/**
 * Resolves the final result and includes the board only after the game ends.
 *
 * @param {object} session - private game state.
 * @param {boolean} success - whether all pairs were found within the limit.
 * @returns {{ outcome: 'win'|'loss'|'push', multiplier: number, details: object }}
 */
function resolveGame(session, success) {
  const multiplier = success ? session.paytable[String(session.turnsUsed)] : 0;
  const outcome = multiplier > 1 ? 'win' : multiplier === 1 ? 'push' : 'loss';
  return {
    outcome,
    multiplier,
    details: {
      board: session.board.map(({ symbol }) => symbol),
      matched: [...session.matched],
      turnsUsed: session.turnsUsed,
      pairsFound: session.pairsFound,
      success,
    },
  };
}

/**
 * Rules for one turn-limited classic Memory round.
 *
 * The board and its paytable stay private in the session. The public view only
 * reveals symbols when their cards are face up, matched, or the round is over.
 */
export const memoryRules = Object.freeze({
  /**
   * Starts a round with a shuffled board and a required configured paytable.
   *
   * @param {unknown} raw - shuffled board returned by the game's draw function.
   * @param {{ config?: object }} context - rules configuration.
   * @returns {object} private session with indexed reveal actions.
   */
  start(raw, { config } = {}) {
    const board = copyAndValidateBoard(raw);
    const paytable = copyAndValidatePaytable(config);
    const state = {
      board,
      matched: Array(BOARD_SIZE).fill(false),
      revealed: [],
      turnsUsed: 0,
      pairsFound: 0,
      pendingMismatch: false,
      paytable,
    };
    return pendingSession(state);
  },

  /**
   * Reveals a card or completes the display of a mismatched pair.
   *
   * @param {object} session - private round state returned by `start`.
   * @param {string} action - an available `reveal-<index>` action or `continue`.
   * @returns {object} an updated pending session or the terminal game result.
   */
  step(session, action) {
    assertSession(session);
    if (typeof action !== 'string' || !session.availableActions.includes(action)) {
      throw new TypeError(`memory: unsupported action "${String(action)}"`);
    }

    if (action === 'continue') {
      if (session.turnsUsed === MAX_TURNS) return resolveGame(session, false);
      return pendingSession({
        ...session,
        revealed: [],
        pendingMismatch: false,
      });
    }

    const index = Number(action.slice('reveal-'.length));
    const revealed = [...session.revealed, index];
    if (revealed.length === 1) {
      return pendingSession({ ...session, revealed });
    }

    const [first, second] = revealed;
    const turnsUsed = session.turnsUsed + 1;
    if (session.board[first].symbol !== session.board[second].symbol) {
      return pendingSession({
        ...session,
        revealed,
        turnsUsed,
        pendingMismatch: true,
      });
    }

    const matched = [...session.matched];
    matched[first] = true;
    matched[second] = true;
    const pairsFound = session.pairsFound + 1;
    const nextState = { ...session, matched, revealed: [], turnsUsed, pairsFound };
    if (pairsFound === PAIR_COUNT) return resolveGame(nextState, true);
    if (turnsUsed === MAX_TURNS) return resolveGame(nextState, false);
    return pendingSession(nextState);
  },

  /**
   * Returns a filtered board for G3 without exposing unrevealed symbols.
   *
   * @param {{ phase: string, session?: object, gameResult?: object }} state
   * @returns {object} public view for the current or completed round.
   */
  view({ phase, session, gameResult }) {
    if (phase === 'playing') {
      assertSession(session);
      return {
        cards: session.board.map(({ symbol }, position) => {
          const revealed = session.revealed.includes(position);
          const matched = session.matched[position];
          return {
            position,
            symbol: revealed || matched ? symbol : null,
            revealed,
            matched,
          };
        }),
        turnsUsed: session.turnsUsed,
        turnsRemaining: MAX_TURNS - session.turnsUsed,
        maxTurns: MAX_TURNS,
        pairsFound: session.pairsFound,
        pendingMismatch: session.pendingMismatch,
      };
    }

    const details = gameResult?.details;
    if (
      phase === 'result' &&
      Array.isArray(details?.board) &&
      details.board.length === BOARD_SIZE &&
      Array.isArray(details.matched) &&
      details.matched.length === BOARD_SIZE
    ) {
      return {
        cards: details.board.map((symbol, position) => ({
          position,
          symbol,
          revealed: true,
          matched: details.matched[position],
        })),
        turnsUsed: details.turnsUsed,
        turnsRemaining: MAX_TURNS - details.turnsUsed,
        maxTurns: MAX_TURNS,
        pairsFound: details.pairsFound,
        result: {
          outcome: gameResult.outcome,
          multiplier: gameResult.multiplier,
          success: details.success,
        },
      };
    }
    throw new TypeError(`memory: unsupported view phase "${String(phase)}"`);
  },
});
