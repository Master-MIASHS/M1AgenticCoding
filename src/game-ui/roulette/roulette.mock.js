// Mock du renderPayload roulette. Déterministe : l'UI ne tire jamais de résultat elle-même.
export const rouletteMockPayloads = [
  { number: 17, color: 'black' },
  { number: 32, color: 'red' },
  { number: 0, color: 'green' },
];

let calls = 0;

// Même forme que start(bet) de G2 pour un jeu instantané : { renderPayload, gameResult }
// `choice` (red | black | even | odd) est transmis tel quel : à confirmer avec G2.
export function mockStart(bet, choice) {
  const renderPayload = rouletteMockPayloads[calls % rouletteMockPayloads.length];
  calls += 1;
  return new Promise((resolve) => {
    setTimeout(() => resolve({ renderPayload, gameResult: { mock: true, bet, choice } }), 600);
  });
}
