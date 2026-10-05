// Mock du renderPayload et du gameResult slots (contrat G2 § 2.2).
// Déterministe : l'UI ne tire jamais de résultat elle-même.
const mockRounds = [
  {
    renderPayload: {
      reels: [
        ['cherry', 'lemon', 'grape'],
        ['cherry', 'bell', 'lemon'],
        ['cherry', 'grape', 'bell'],
      ],
      winningLines: [0],
    },
    gameResult: { outcome: 'win', multiplier: 5, details: { winningLines: [0] } },
  },
  {
    renderPayload: {
      reels: [
        ['lemon', 'grape', 'bell'],
        ['grape', 'bell', 'cherry'],
        ['bell', 'cherry', 'lemon'],
      ],
      winningLines: [],
    },
    gameResult: { outcome: 'loss', multiplier: 0, details: { winningLines: [] } },
  },
  {
    renderPayload: {
      reels: [
        ['bell', 'bell', 'cherry'],
        ['grape', 'bell', 'lemon'],
        ['lemon', 'bell', 'grape'],
      ],
      winningLines: [1],
    },
    gameResult: { outcome: 'win', multiplier: 2, details: { winningLines: [1] } },
  },
];

let calls = 0;

// Même forme que start(bet) de G2 pour un jeu instantané : { renderPayload, gameResult }
export function mockStart() {
  const round = mockRounds[calls % mockRounds.length];
  calls += 1;
  return new Promise((resolve) => {
    setTimeout(() => resolve(round), 600);
  });
}
