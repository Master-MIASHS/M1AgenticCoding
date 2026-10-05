// Mock du renderPayload slots (contrat G2 §3.2).
// Déterministe : l'UI ne tire jamais de résultat elle-même.
export const slotsMockPayloads = [
  {
    reels: [
      ['cherry', 'lemon', 'grape'],
      ['cherry', 'bell', 'lemon'],
      ['cherry', 'grape', 'bell'],
    ],
    winningLines: [0],
  },
  {
    reels: [
      ['lemon', 'grape', 'bell'],
      ['grape', 'bell', 'cherry'],
      ['bell', 'cherry', 'lemon'],
    ],
    winningLines: [],
  },
  {
    reels: [
      ['bell', 'bell', 'cherry'],
      ['grape', 'bell', 'lemon'],
      ['lemon', 'bell', 'grape'],
    ],
    winningLines: [1],
  },
];

let calls = 0;

// Même forme que start(bet) de G2 pour un jeu instantané : { renderPayload, gameResult }
export function mockStart(bet) {
  const renderPayload = slotsMockPayloads[calls % slotsMockPayloads.length];
  calls += 1;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ renderPayload, gameResult: { mock: true, bet } }), 600);
  });
}
