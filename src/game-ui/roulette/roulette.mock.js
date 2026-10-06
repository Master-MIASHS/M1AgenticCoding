// Mock de la roulette au format de l'orchestrateur G2 (skill jeux-g2 § 1 et § 2).
// Déterministe : l'UI ne tire jamais de résultat et ne le calcule pas. Le résultat
// de chaque type de pari est une donnée fixe du tour, pas une règle de jeu.
// renderPayload { number, color } : forme proposée dans #8, en attente de validation
// par la responsable des règles roulette (contrat § 5.2).

// multiplier inclut la mise (contrat § 2.2).
const WIN = { outcome: 'win', multiplier: 2 };
const LOSS = { outcome: 'loss', multiplier: 0 };

const mockRounds = [
  { number: 17, color: 'black', results: { red: LOSS, black: WIN, even: LOSS, odd: WIN } },
  { number: 32, color: 'red', results: { red: WIN, black: LOSS, even: WIN, odd: LOSS } },
  { number: 0, color: 'green', results: { red: LOSS, black: LOSS, even: LOSS, odd: LOSS } },
];

let calls = 0;

// Même forme que start(bets) de G2 pour un jeu instantané :
// { sessionId, renderPayload, availableActions, terminal, gameResult }.
// L'UI n'envoie qu'une mise par tour : [{ type, amount }], type = red | black | even | odd.
export function mockStart(bets) {
  const type = Array.isArray(bets) ? bets[0]?.type : undefined;
  const round = mockRounds[calls % mockRounds.length];
  const result = round.results[type];
  if (!result) {
    return Promise.reject(new Error(`roulette mock : pari inconnu '${type}'`));
  }
  calls += 1;
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          sessionId: `roulette-mock-${calls}`,
          renderPayload: { gameId: 'roulette', phase: 'result', number: round.number, color: round.color },
          availableActions: [],
          terminal: true,
          // details : contenu propre à la roulette pas encore fixé par G2 (§ 4.3, #73).
          gameResult: { ...result, details: {} },
        }),
      600
    );
  });
}
