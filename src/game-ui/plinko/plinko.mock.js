// Mock du plinko au format de l'orchestrateur G2 (skill jeux-g2 § 1 et § 2).
// Déterministe : l'UI ne tire jamais de case et ne calcule pas le résultat. Le résultat de
// chaque tour est une donnée fixe, pas une règle de jeu.
//
// renderPayload.raw = index de la case d'arrivée, comme le renvoie l'orchestrateur avec les
// vraies règles (src/games/plinko/rules.js, #128). Un seul type de pari : 'slot'.
//
// En attente de G1 / G2 : la table des gains (une entrée par case) vient de la config admin,
// lue via coreService.getGameConfig('plinko') (schéma validé dans #122, exposition #158).
// Elle est donc fictive ici, à remplacer dès qu'elle sera fournie.

// multiplier inclut la mise (contrat § 2.2), un par case de gauche à droite.
export const plinkoMockPaytable = [5, 2, 1, 0.5, 0.2, 0.5, 1, 2, 5];

const mockRounds = [
  { slot: 4, result: { outcome: 'loss', multiplier: 0.2 } },
  { slot: 1, result: { outcome: 'win', multiplier: 2 } },
  { slot: 6, result: { outcome: 'push', multiplier: 1 } },
  { slot: 8, result: { outcome: 'win', multiplier: 5 } },
];

let calls = 0;

// Même forme que start(bets) de G2 pour un jeu instantané :
// { sessionId, renderPayload, availableActions, terminal, gameResult }.
export function mockStart(bets) {
  const bet = Array.isArray(bets) ? bets[0] : undefined;
  if (bet?.type !== 'slot') {
    return Promise.reject(new Error(`plinko mock : pari inconnu '${bet?.type}'`));
  }
  const round = mockRounds[calls % mockRounds.length];
  calls += 1;
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          sessionId: `plinko-mock-${calls}`,
          renderPayload: { gameId: 'plinko', phase: 'result', raw: round.slot },
          availableActions: [],
          terminal: true,
          gameResult: { ...round.result, details: { slot: round.slot } },
        }),
      600
    );
  });
}
