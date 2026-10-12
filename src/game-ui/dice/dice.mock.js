// Mock des dés (craps) au format de l'orchestrateur G2 (skill jeux-g2 § 1 et § 2).
// Déterministe : l'UI ne lance aucun dé et ne calcule pas le résultat. Le résultat de chaque
// tour est une donnée fixe, pas une règle de jeu.
//
// details = { rolls, point } : forme proposée au G2 dans #159 (alignement des dés sur le
// contrat), en attente de validation. rolls = totaux des lancers dans l'ordre (1 ou 2),
// point = point établi pendant la manche, ou null.
const mockRounds = [
  { rolls: [7], point: null, result: { outcome: 'win', multiplier: 2 } },
  { rolls: [6, 8], point: 6, result: { outcome: 'loss', multiplier: 0 } },
  { rolls: [12], point: null, result: { outcome: 'push', multiplier: 1 } },
  { rolls: [5, 5], point: 5, result: { outcome: 'win', multiplier: 2 } },
];

let calls = 0;

// Même forme que start(bets) de G2 pour un jeu instantané :
// { sessionId, renderPayload, availableActions, terminal, gameResult }.
// L'UI n'envoie qu'une mise par tour : [{ type: 'pass', amount }].
export function mockStart(bets) {
  if (!Array.isArray(bets) || bets.length === 0) {
    return Promise.reject(new Error('dice mock : bets doit être un tableau [{ type, amount }]'));
  }
  const round = mockRounds[calls % mockRounds.length];
  calls += 1;
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          sessionId: `dice-mock-${calls}`,
          renderPayload: { gameId: 'dice', phase: 'result' },
          availableActions: [],
          terminal: true,
          gameResult: { ...round.result, details: { rolls: round.rolls, point: round.point } },
        }),
      600
    );
  });
}
