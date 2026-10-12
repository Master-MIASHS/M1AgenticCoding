// ---------------------------------------------------------------------------
// PROVISIONAL game configuration (Groupe 5, integration)
// ---------------------------------------------------------------------------
// The G2 rules refuse to run without their admin configuration (paytable,
// symbols...), and the Core does not provide it yet (#122, #256, #158).
// These values only exist so that the games can be played on the site in
// the meantime. They are NOT validated game rules:
//   - slots: the symbol ids are the ones drawn by the G3 UI; the weights and
//     multipliers are placeholders, to be validated by G1/G2;
//   - roulette: standard European layout (18 red numbers, 0 green) with even
//     money bets paid x2 (stake included), as in the G2 tests.
// TO REPLACE by the Core configuration (getGameConfig) as soon as it exposes
// these fields; nothing else should import this file.
// ---------------------------------------------------------------------------

const SLOTS_SYMBOLS = [
  { symbol: 'cherry', weight: 0.4 },
  { symbol: 'lemon', weight: 0.3 },
  { symbol: 'grape', weight: 0.2 },
  { symbol: 'bell', weight: 0.1 },
];

// Three identical symbols pay; every other combination pays 0.
const SLOTS_TRIPLES = { cherry: 5, lemon: 8, grape: 20, bell: 100 };

/**
 * Builds the slots config in the shape expected by src/games/slots
 * (`symbols.bands` covering [0, 1), one paytable entry per combination).
 *
 * @returns {{ symbols: { bands: Array<{ max: number, symbol: string }> },
 *   paytable: Object<string, { multiplier: number }> }}
 */
function buildSlotsConfig() {
  let max = 0;
  const bands = SLOTS_SYMBOLS.map(({ symbol, weight }, index) => {
    max = index === SLOTS_SYMBOLS.length - 1 ? 1 : max + weight;
    return { max, symbol };
  });
  const ids = SLOTS_SYMBOLS.map(({ symbol }) => symbol);
  const paytable = {};
  for (const a of ids) {
    for (const b of ids) {
      for (const c of ids) {
        const triple = a === b && b === c;
        paytable[`${a}${b}${c}`] = { multiplier: triple ? SLOTS_TRIPLES[a] : 0 };
      }
    }
  }
  return { symbols: { bands }, paytable };
}

const NUMBERS = Array.from({ length: 37 }, (_, n) => n);
const RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK = NUMBERS.filter((n) => n !== 0 && !RED.includes(n));

const ROULETTE_CONFIG = {
  layout: { red: RED, black: BLACK, green: [0] },
  paytable: {
    red: { match: RED, multiplier: 2 },
    black: { match: BLACK, multiplier: 2 },
    even: { match: NUMBERS.filter((n) => n !== 0 && n % 2 === 0), multiplier: 2 },
    odd: { match: NUMBERS.filter((n) => n % 2 === 1), multiplier: 2 },
  },
};

export const PROVISIONAL_GAME_CONFIGS = Object.freeze({
  slots: buildSlotsConfig(),
  roulette: ROULETTE_CONFIG,
});
