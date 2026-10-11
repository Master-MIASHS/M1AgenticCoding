const BALL_COUNT = 75;
const GRID_COLUMNS = [
  { min: 1, max: 15, count: 5 },
  { min: 16, max: 30, count: 5 },
  { min: 31, max: 45, count: 4 },
  { min: 46, max: 60, count: 5 },
  { min: 61, max: 75, count: 5 },
];
function shuffle(core, values) {
  const shuffled = core.melanger([...values]);
  if (
    !Array.isArray(shuffled) ||
    shuffled.length !== values.length ||
    new Set(shuffled).size !== values.length ||
    shuffled.some((value) => !values.includes(value))
  ) {
    throw new TypeError('bingo: core.melanger must return a permutation of its input');
  }
  return shuffled;
}

function makeGrid(core) {
  const columns = GRID_COLUMNS.map(({ min, max, count }) =>
    shuffle(
      core,
      Array.from({ length: max - min + 1 }, (_, index) => min + index)
    ).slice(0, count)
  );
  return Array.from({ length: 5 }, (_, row) =>
    columns.map((column, col) => {
      if (row === 2 && col === 2) return null;
      const columnRow = col === 2 && row > 2 ? row - 1 : row;
      return column[columnRow];
    })
  );
}

/**
 * Prépare l'ordre des boules et les quatre grilles via le mélange public du Core.
 *
 * @param {{ melanger: (values: number[]) => number[] }} core - façade Core injectée par l'orchestrateur.
 * @param {{ session?: object, config?: { botCount: number } }} [context] - configuration et session de l'orchestrateur.
 * @returns {{ balls: number[], grids: { player: Array<Array<number | null>>, bots: Array<Array<Array<number | null>>> } } | null}
 *   tirage initial, ou null pendant les actions.
 */
export function draw(core, context = {}) {
  if (context.session !== undefined) return null;
  if (!Number.isSafeInteger(context.config?.botCount) || context.config.botCount < 1) {
    throw new TypeError('bingo: config.botCount must be a positive safe integer');
  }
  if (typeof core?.melanger !== 'function') {
    throw new TypeError('bingo: core.melanger must be a function');
  }

  const balls = shuffle(
    core,
    Array.from({ length: BALL_COUNT }, (_, index) => index + 1)
  );
  return {
    balls,
    grids: {
      player: makeGrid(core),
      bots: Array.from({ length: context.config.botCount }, () => makeGrid(core)),
    },
  };
}
