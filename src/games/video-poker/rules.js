import { evaluatePokerHand, RANKS, SUITS } from '../cardUtils.js';
import { createShoe, draw as drawCards } from '../deck.js';

const HAND_SIZE = 5;
const MIN_PAYING_PAIR_RANK = 11;
const AVAILABLE_ACTIONS = Object.freeze([
  'hold-0',
  'hold-1',
  'hold-2',
  'hold-3',
  'hold-4',
  'draw',
]);
const RANK_SET = new Set(RANKS);
const SUIT_SET = new Set(SUITS);

/**
 * Validates and copies the shuffled cards supplied for one round.
 *
 * @param {unknown} raw - shuffled card array returned by the game's draw function.
 * @returns {Array<{ rank: string, suit: string }>}
 * @throws {TypeError} when the input is not a valid card array.
 */
function copyAndValidateDeck(raw) {
  if (!Array.isArray(raw) || raw.length < HAND_SIZE) {
    throw new TypeError('video poker: raw must contain at least five cards');
  }

  const seen = new Set();
  return raw.map((card, index) => {
    if (
      card === null ||
      typeof card !== 'object' ||
      !RANK_SET.has(card.rank) ||
      !SUIT_SET.has(card.suit)
    ) {
      throw new TypeError(`video poker: invalid card at index ${index}`);
    }
    const key = `${card.rank}:${card.suit}`;
    if (seen.has(key)) {
      throw new TypeError(`video poker: duplicate card at index ${index}`);
    }
    seen.add(key);
    return Object.freeze({ rank: card.rank, suit: card.suit });
  });
}

/**
 * Validates the configured payout table and copies it into the round state.
 *
 * @param {unknown} config - game configuration containing `paytable`.
 * @returns {Record<string, number>}
 * @throws {TypeError} when the table is absent or contains invalid payouts.
 */
function copyAndValidatePaytable(config) {
  if (
    config === null ||
    typeof config !== 'object' ||
    config.paytable === null ||
    typeof config.paytable !== 'object' ||
    Array.isArray(config.paytable)
  ) {
    throw new TypeError('video poker: config.paytable is required');
  }

  const entries = Object.entries(config.paytable);
  if (
    entries.some(
      ([category, multiplier]) =>
        !/^(?:[1-9]|10)$/.test(category) ||
        typeof multiplier !== 'number' ||
        !Number.isFinite(multiplier) ||
        multiplier < 0
    )
  ) {
    throw new TypeError('video poker: paytable values must be finite non-negative numbers');
  }
  return Object.fromEntries(entries);
}

/**
 * Checks the private state required to process a player action.
 *
 * @param {unknown} session - current private round state.
 * @returns {void}
 * @throws {TypeError} when the session is not a video poker session.
 */
function assertSession(session) {
  if (
    session === null ||
    typeof session !== 'object' ||
    !Array.isArray(session.hand) ||
    session.hand.length !== HAND_SIZE ||
    !Array.isArray(session.held) ||
    session.held.length !== HAND_SIZE ||
    !session.held.every((value) => typeof value === 'boolean') ||
    !Array.isArray(session.shoe?.cards) ||
    !Number.isInteger(session.shoe.cursor) ||
    session.shoe.cursor < 0 ||
    session.shoe.cursor > session.shoe.cards.length ||
    session.paytable === null ||
    typeof session.paytable !== 'object'
  ) {
    throw new TypeError('video poker: invalid session');
  }
}

/**
 * Produces a defensive copy of cards for the public rendering payload.
 *
 * @param {Array<{ rank: string, suit: string }>} cards
 * @returns {Array<{ rank: string, suit: string }>}
 */
function copyCards(cards) {
  return cards.map(({ rank, suit }) => ({ rank, suit }));
}

/**
 * Calculates the Jacks or Better return using configured category payouts.
 *
 * @param {{ category: number, tiebreakers: number[] }} evaluation
 * @param {Record<string, number>} paytable
 * @returns {number} return multiplier, including the original stake.
 */
function payoutMultiplier(evaluation, paytable) {
  if (
    evaluation.category === 2 &&
    evaluation.tiebreakers[0] < MIN_PAYING_PAIR_RANK
  ) {
    return 0;
  }
  return paytable[evaluation.category] ?? 0;
}

/**
 * Resolves the final hand into the Core's inclusive-stake result contract.
 *
 * @param {Array<{ rank: string, suit: string }>} hand - final five-card hand.
 * @param {Record<string, number>} paytable - configured return multipliers.
 * @returns {{ outcome: 'win'|'loss'|'push', multiplier: number, details: object }}
 */
function resolveHand(hand, held, paytable) {
  const evaluation = evaluatePokerHand(hand);
  const multiplier = payoutMultiplier(evaluation, paytable);
  const outcome = multiplier > 1 ? 'win' : multiplier === 1 ? 'push' : 'loss';

  return {
    outcome,
    multiplier,
    details: {
      hand: copyCards(hand),
      held: [...held],
      category: evaluation.category,
      tiebreakers: [...evaluation.tiebreakers],
    },
  };
}

/**
 * Pure rules for one Jacks or Better video poker round.
 *
 * `start` receives a shuffled deck from the game's draw function. The shoe,
 * hand, holds and copied paytable remain in the returned session until the
 * player selects `draw`.
 */
export const videoPokerRules = Object.freeze({
  /**
   * Deals the opening hand and creates private round state.
   *
   * @param {unknown} raw - shuffled card deck.
   * @param {{ bets?: Array<object>, config?: object }} context
   * @returns {object} private session with five cards and available actions.
   */
  start(raw, { config } = {}) {
    const cards = copyAndValidateDeck(raw);
    const paytable = copyAndValidatePaytable(config);
    const opening = drawCards(createShoe(cards), HAND_SIZE);

    return {
      hand: opening.cards,
      held: Array(HAND_SIZE).fill(false),
      shoe: opening.shoe,
      paytable,
      availableActions: [...AVAILABLE_ACTIONS],
      needsDraw: true,
    };
  },

  /**
   * Toggles one held card or draws replacements to resolve the round.
   *
   * @param {object} session - private round state returned by `start`.
   * @param {string} action - one `hold-0` to `hold-4`, or `draw`.
   * The orchestrator's raw action draw is intentionally unused: replacements
   * come from the already-shuffled shoe held in the session.
   * @returns {object} updated session, or a terminal game result after `draw`.
   */
  step(session, action) {
    assertSession(session);
    if (!AVAILABLE_ACTIONS.includes(action)) {
      throw new TypeError(`video poker: unsupported action "${String(action)}"`);
    }
    if (action.startsWith('hold-')) {
      const index = Number(action.slice('hold-'.length));
      return {
        ...session,
        held: session.held.map((value, position) => (position === index ? !value : value)),
        availableActions: [...AVAILABLE_ACTIONS],
      };
    }

    const replacementCount = session.held.filter((held) => !held).length;
    const replacementDraw = drawCards(session.shoe, replacementCount);
    let nextIndex = 0;
    const hand = session.hand.map((card, index) => {
      if (session.held[index]) return card;
      const replacement = replacementDraw.cards[nextIndex];
      nextIndex += 1;
      return replacement;
    });
    return resolveHand(hand, session.held, session.paytable);
  },

  /**
   * Returns only public card-game data; the shoe and paytable remain private.
   *
   * @param {{ phase: string, session?: object, gameResult?: object }} state
   * @returns {object} safe render data for the video poker UI.
   */
  view({ phase, session, gameResult }) {
    if (phase === 'playing') {
      assertSession(session);
      return {
        hand: copyCards(session.hand),
        held: [...session.held],
      };
    }
    if (phase === 'result' && gameResult?.details) {
      return {
        hand: copyCards(gameResult.details.hand),
        held: [...gameResult.details.held],
        result: {
          outcome: gameResult.outcome,
          multiplier: gameResult.multiplier,
          category: gameResult.details.category,
          tiebreakers: [...gameResult.details.tiebreakers],
        },
      };
    }
    throw new TypeError(`video poker: unsupported view phase "${String(phase)}"`);
  },
});
