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
//   - the other games (dice, scratch, wheel, plinko, blackjack, video-poker,
//     poker, memory, quiz, bingo, baccarat) use the shape of the G2 contract
//     (section 6) with the values of tests/fixtures/g2/configs.js, copied here
//     (the fixture is a test reference and is never imported by the app).
//     The wheel layout is the one of the G3 UI so that its colors render.
// TO REPLACE by the Core configuration (getGameConfig) as soon as it exposes
// these fields (the Core only stores numeric probabilities / multipliers
// tables today, #122, #256); only gameRuntime.js should import this file.
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

const ROULETTE_BETS = {
  red: { match: RED, multiplier: 2 },
  black: { match: BLACK, multiplier: 2 },
  even: { match: NUMBERS.filter((n) => n !== 0 && n % 2 === 0), multiplier: 2 },
  odd: { match: NUMBERS.filter((n) => n % 2 === 1), multiplier: 2 },
};

const ROULETTE_CONFIG = {
  layout: { red: RED, black: BLACK, green: [0] },
  paytable: ROULETTE_BETS,
  bets: ROULETTE_BETS,
};

// Wheel: 8 equal-weight segments (layout of the G3 UI), bets on a color.
const WHEEL_CONFIG = {
  paytable: {
    red: { match: { color: 'red' }, multiplier: 2 },
    black: { match: { color: 'black' }, multiplier: 2 },
    gold: { match: { color: 'gold' }, multiplier: 8 },
  },
  segments: [
    { id: 's1', label: '1', color: 'red', weight: 1 },
    { id: 's2', label: '2', color: 'black', weight: 1 },
    { id: 's3', label: '3', color: 'red', weight: 1 },
    { id: 's4', label: '4', color: 'black', weight: 1 },
    { id: 's5', label: '5', color: 'red', weight: 1 },
    { id: 's6', label: '6', color: 'black', weight: 1 },
    { id: 's7', label: '7', color: 'red', weight: 1 },
    { id: 's8', label: '★', color: 'gold', weight: 1 },
  ],
};

export const PROVISIONAL_GAME_CONFIGS = Object.freeze({
  slots: buildSlotsConfig(),
  roulette: ROULETTE_CONFIG,
  dice: { paytable: { pass: 2 } },
  scratch: {
    paytable: {
      bands: [
        { max: 0.5, symbol: 'rien', multiplier: 0 },
        { max: 1, symbol: 'trèfle', multiplier: 2 },
      ],
    },
  },
  wheel: WHEEL_CONFIG,
  plinko: { paytable: [0, 0.5, 1, 2, 5], weights: [1, 1, 1, 1, 1] },
  blackjack: { paytable: { blackjack: 2.5, win: 2 } },
  'video-poker': { paytable: { 10: 250, 9: 50, 8: 25, 7: 9, 6: 6, 5: 4, 4: 3, 3: 2, 2: 1 } },
  poker: { smallBlind: 1, bigBlind: 2, botStack: 20, raiseStep: 2 },
  memory: { paytable: { 8: 5, 9: 4, 10: 3, 11: 2, 12: 1.5, 13: 1.2, 14: 1, 15: 0.5, 16: 0.2 } },
  quiz: { paytable: { 1: 1.2, 2: 1.5, 3: 2, 4: 3, 5: 5 } },
  bingo: { paytable: { win: 4 }, botCount: 3 },
  baccarat: { paytable: { player: 2, banker: 1.95, tie: 9 }, deckCount: 8 },
});
