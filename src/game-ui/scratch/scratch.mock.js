// Mock des cartes à gratter au format de l'orchestrateur G2 (skill jeux-g2 § 1 et § 2).
// Déterministe : l'UI ne tire rien et ne calcule pas le résultat. Le résultat de chaque ticket
// est une donnée fixe, pas une règle de jeu.
//
// Même forme que les vraies règles (src/games/scratch/rules.js, #216) :
// details = { symbol, value, stake }. Les symboles et les gains viennent de la config admin
// (config.paytable.bands) : valeurs fictives ici.
const mockTickets = [
  { symbol: 'star', value: 0.42, result: { outcome: 'win', multiplier: 3 } },
  { symbol: 'empty', value: 0.81, result: { outcome: 'loss', multiplier: 0 } },
  { symbol: 'clover', value: 0.15, result: { outcome: 'push', multiplier: 1 } },
  { symbol: 'diamond', value: 0.03, result: { outcome: 'win', multiplier: 20 } },
];

let calls = 0;

// Même forme que start(bets) de G2 pour un jeu instantané :
// { sessionId, renderPayload, availableActions, terminal, gameResult }.
// L'UI n'envoie qu'une mise par ticket : [{ type: 'mise', amount }].
export function mockStart(bets) {
  if (!Array.isArray(bets) || bets.length === 0) {
    return Promise.reject(new Error('scratch mock : bets doit être un tableau [{ type, amount }]'));
  }
  const stake = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const ticket = mockTickets[calls % mockTickets.length];
  calls += 1;
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          sessionId: `scratch-mock-${calls}`,
          renderPayload: { gameId: 'scratch', phase: 'result' },
          availableActions: [],
          terminal: true,
          gameResult: {
            ...ticket.result,
            details: { symbol: ticket.symbol, value: ticket.value, stake },
          },
        }),
      600
    );
  });
}
