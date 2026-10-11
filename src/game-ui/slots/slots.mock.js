// Mock des slots au format de l'orchestrateur G2 (skill jeux-g2 § 1 et § 2).
// Déterministe : l'UI ne tire jamais de symbole et ne calcule pas le résultat. Le résultat de
// chaque tour est une donnée fixe, pas une règle de jeu.
//
// Même forme que les vraies règles (src/games/slots/rules.js, #216) : 3 rouleaux d'un symbole,
// tirage dans renderPayload.raw.symbols, details = { symbols, combination, stake }.
// Les symboles et la table des gains viennent de la config admin : valeurs fictives ici.
const mockRounds = [
  { symbols: ['cherry', 'cherry', 'cherry'], result: { outcome: 'win', multiplier: 5 } },
  { symbols: ['lemon', 'grape', 'bell'], result: { outcome: 'loss', multiplier: 0 } },
  { symbols: ['bell', 'bell', 'bell'], result: { outcome: 'win', multiplier: 10 } },
];

let calls = 0;

// Même forme que start(bets) de G2 pour un jeu instantané :
// { sessionId, renderPayload, availableActions, terminal, gameResult }.
// L'UI n'envoie qu'une mise par tour : [{ type: 'mise', amount }].
export function mockStart(bets) {
  if (!Array.isArray(bets) || bets.length === 0) {
    return Promise.reject(new Error('slots mock : bets doit être un tableau [{ type, amount }]'));
  }
  const stake = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const round = mockRounds[calls % mockRounds.length];
  calls += 1;
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          sessionId: `slots-mock-${calls}`,
          renderPayload: { gameId: 'slots', phase: 'result', raw: { gameId: 'slots', symbols: round.symbols } },
          availableActions: [],
          terminal: true,
          gameResult: {
            ...round.result,
            details: { symbols: round.symbols, combination: round.symbols.join(''), stake },
          },
        }),
      600
    );
  });
}
