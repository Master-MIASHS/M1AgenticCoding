const MEMORY_SYMBOLS = Object.freeze([
  'chip',
  'card',
  'dice',
  'roulette-wheel',
  'slot-machine',
  'horseshoe',
  'bell',
  'jackpot',
]);

/**
 * Builds and shuffles the Memory board at the start of each round.
 *
 * @param {{ melanger?: (cards: Array<{ symbol: string }>) => Array<{ symbol: string }> }} core
 *   Public Core facade supplied by `createGame`.
 * @param {{ session?: object }} context - current draw context from the orchestrator.
 * @returns {Array<{ symbol: string }> | null} shuffled board at start, otherwise no new draw.
 * @throws {TypeError} when the Core facade does not expose `melanger`.
 */
export function drawMemory(core, { session } = {}) {
  if (session !== undefined) return null;
  if (typeof core?.melanger !== 'function') {
    throw new TypeError('memory: Core facade must provide melanger()');
  }
  const board = MEMORY_SYMBOLS.flatMap((symbol) => [{ symbol }, { symbol }]);
  return core.melanger(board);
}
