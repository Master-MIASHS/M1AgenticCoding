// ---------------------------------------------------------------------------
// Fixtures G2 - une config valide et une mise d'ouverture par jeu du catalogue
// ---------------------------------------------------------------------------
// Formes du contrat G2 (§ 6, #68). Les VALEURS sont propres aux tests : les
// vraies valeurs sont des données d'admin (règle 4), fournies par l'application
// (configs provisoires du G5, puis getGameConfig du Core). Elles servent aussi
// d'exemple de forme pour brancher un jeu.
// ---------------------------------------------------------------------------

const RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK = Array.from({ length: 36 }, (_, i) => i + 1).filter((n) => !RED.includes(n));

/** Slots : deux symboles par rouleau, une entrée de gains par combinaison. */
function slotsConfig() {
  const paytable = {};
  for (const a of ['A', 'B']) {
    for (const b of ['A', 'B']) {
      for (const c of ['A', 'B']) {
        paytable[`${a}${b}${c}`] = { multiplier: a === b && b === c ? 5 : 0 };
      }
    }
  }
  return {
    symbols: { bands: [{ max: 0.5, symbol: 'A' }, { max: 1, symbol: 'B' }] },
    paytable,
  };
}

/** @type {Readonly<Record<string, { config: object, bets: Array<{ type: string, amount: number }> }>>} */
export const GAME_FIXTURES = Object.freeze({
  slots: { config: slotsConfig(), bets: [{ type: 'spin', amount: 10 }] },
  dice: { config: { paytable: { pass: 2 } }, bets: [{ type: 'pass', amount: 10 }] },
  scratch: {
    config: {
      paytable: {
        bands: [
          { max: 0.5, symbol: 'rien', multiplier: 0 },
          { max: 1, symbol: 'trèfle', multiplier: 2 },
        ],
      },
    },
    bets: [{ type: 'ticket', amount: 10 }],
  },
  wheel: {
    config: {
      paytable: { red: { match: { color: 'red' }, multiplier: 2 } },
      segments: [
        { id: 's1', label: 'x2', color: 'red', weight: 1 },
        { id: 's2', label: 'x0', color: 'blue', weight: 1 },
      ],
    },
    bets: [{ type: 'red', amount: 10 }],
  },
  roulette: {
    config: {
      paytable: {
        red: { match: RED, multiplier: 2 },
        black: { match: BLACK, multiplier: 2 },
      },
    },
    bets: [{ type: 'red', amount: 10 }],
  },
  plinko: {
    config: { paytable: [0, 0.5, 1, 2, 5], weights: [1, 1, 1, 1, 1] },
    bets: [{ type: 'slot', amount: 10 }],
  },
  blackjack: { config: { paytable: { blackjack: 2.5, win: 2 } }, bets: [{ type: 'main', amount: 10 }] },
  'video-poker': {
    config: { paytable: { 10: 250, 9: 50, 8: 25, 7: 9, 6: 6, 5: 4, 4: 3, 3: 2, 2: 1 } },
    bets: [{ type: 'main', amount: 10 }],
  },
  poker: {
    config: { smallBlind: 1, bigBlind: 2, botStack: 20, raiseStep: 2 },
    bets: [{ type: 'small-blind', amount: 1 }],
  },
  memory: {
    config: { paytable: { 8: 5, 9: 4, 10: 3, 11: 2, 12: 1.5, 13: 1.2, 14: 1, 15: 0.5, 16: 0.2 } },
    bets: [{ type: 'main', amount: 10 }],
  },
  quiz: {
    config: { paytable: { 1: 1.2, 2: 1.5, 3: 2, 4: 3, 5: 5 } },
    bets: [{ type: 'main', amount: 10 }],
  },
  baccarat: {
    config: { paytable: { player: 2, banker: 1.95, tie: 9 }, deckCount: 8 },
    bets: [{ type: 'player', amount: 10 }],
  },
  bingo: { config: { paytable: { win: 4 }, botCount: 3 }, bets: [{ type: 'card', amount: 10 }] },
});
