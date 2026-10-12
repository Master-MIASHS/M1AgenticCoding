// Mock de la roulette au format de l'orchestrateur G2 (skill jeux-g2 § 1 et § 2).
// Déterministe : l'UI ne tire jamais de résultat et ne le calcule pas. Le résultat
// de chaque type de pari est une donnée fixe du tour, pas une règle de jeu.
// Même forme que les vraies règles (src/games/roulette/rules.js, #233, #321) : le numéro
// tiré arrive dans renderPayload.raw, sa couleur dans details.color, que l'orchestrateur
// recopie dans renderPayload.interpretation (décision de la responsable roulette, #8).

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
  const details = { raw: round.number, color: round.color };
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          sessionId: `roulette-mock-${calls}`,
          renderPayload: { gameId: 'roulette', phase: 'result', raw: round.number, interpretation: details },
          availableActions: [],
          terminal: true,
          gameResult: { ...result, details },
        }),
      600
    );
  });
}
