// Mock des dés (craps) au format de l'orchestrateur G2 (skill jeux-g2 § 1 et § 2).
// Déterministe : l'UI ne lance aucun dé et ne calcule pas le résultat. Le résultat de chaque
// tour est une donnée fixe, pas une règle de jeu.
//
// Même forme que les règles finales (src/games/dice/rules.js, #342, craps classique) :
// details = { point, rolls, dice } ; dice = faces des deux dés de chaque lancer, rolls = leurs
// totaux dans l'ordre (un ou plusieurs lancers), point = point établi, ou null.
const mockRounds = [
  { dice: [[3, 4]], point: null, result: { outcome: 'win', multiplier: 2 } },
  { dice: [[2, 4], [5, 3], [1, 6]], point: 6, result: { outcome: 'loss', multiplier: 0 } },
  { dice: [[6, 6]], point: null, result: { outcome: 'loss', multiplier: 0 } },
  { dice: [[1, 4], [4, 5], [3, 2]], point: 5, result: { outcome: 'win', multiplier: 2 } },
];
// Totaux recopiés tels quels dans le mock (donnée fixe, comme les faces).
const ROLLS = [[7], [6, 8, 7], [12], [5, 9, 5]];

let calls = 0;

// Même forme que start(bets) de G2 pour un jeu instantané :
// { sessionId, renderPayload, availableActions, terminal, gameResult }.
// L'UI n'envoie qu'une mise par tour : [{ type: 'pass', amount }].
export function mockStart(bets) {
  if (!Array.isArray(bets) || bets.length === 0) {
    return Promise.reject(new Error('dice mock : bets doit être un tableau [{ type, amount }]'));
  }
  const index = calls % mockRounds.length;
  const round = mockRounds[index];
  calls += 1;
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          sessionId: `dice-mock-${calls}`,
          renderPayload: { gameId: 'dice', phase: 'result' },
          availableActions: [],
          terminal: true,
          gameResult: { ...round.result, details: { point: round.point, rolls: ROLLS[index], dice: round.dice } },
        }),
      600
    );
  });
}
