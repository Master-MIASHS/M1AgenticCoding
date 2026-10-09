import { buildDeck } from '../deck.js';

/**
 * Shuffles one new video poker deck at round start; actions use the session shoe.
 *
 * @param {{ melanger?: (cards: Array<object>) => Array<object> }} core
 *   Public Core facade supplied by `createGame`.
 * @param {{ session?: object }} context - current draw context from the orchestrator.
 * @returns {Array<object> | null} shuffled cards at start, otherwise no new draw.
 * @throws {TypeError} when the Core facade does not expose `melanger`.
 */
export function drawVideoPoker(core, { session } = {}) {
  if (session !== undefined) return null;
  if (typeof core?.melanger !== 'function') {
    throw new TypeError('video poker: Core facade must provide melanger()');
  }
  return core.melanger(buildDeck(1));
}
