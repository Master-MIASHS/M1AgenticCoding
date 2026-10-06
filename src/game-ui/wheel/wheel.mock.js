// Mock de la roue de la fortune au format de l'orchestrateur G2 (skill jeux-g2 § 1 et § 2).
// Déterministe : l'UI ne tire jamais de segment et ne calcule pas le résultat. Le résultat
// de chaque type de pari est une donnée fixe du tour, pas une règle de jeu.
//
// renderPayload.raw = segment tiré, comme le renvoie l'orchestrateur avec les vraies règles
// (src/games/wheel/rules.js, test de montage #128).
//
// En attente de G2 / Core : la disposition de la roue (segments) et la liste des types de
// pari viennent de la configuration admin, qui n'est pas encore exposée à G3 (#122).
// Ces deux listes sont donc des données fictives, à remplacer dès qu'elles seront fournies.

export const wheelMockSegments = [
  { id: 's1', color: 'red', label: '1' },
  { id: 's2', color: 'black', label: '2' },
  { id: 's3', color: 'red', label: '3' },
  { id: 's4', color: 'black', label: '4' },
  { id: 's5', color: 'red', label: '5' },
  { id: 's6', color: 'black', label: '6' },
  { id: 's7', color: 'red', label: '7' },
  { id: 's8', color: 'gold', label: '★' },
];

export const wheelMockBetTypes = ['red', 'black', 'gold'];

// multiplier inclut la mise (contrat § 2.2).
const LOSS = { outcome: 'loss', multiplier: 0 };

const mockRounds = [
  { segmentId: 's3', results: { red: { outcome: 'win', multiplier: 2 }, black: LOSS, gold: LOSS } },
  { segmentId: 's8', results: { red: LOSS, black: LOSS, gold: { outcome: 'win', multiplier: 8 } } },
  { segmentId: 's2', results: { red: LOSS, black: { outcome: 'win', multiplier: 2 }, gold: LOSS } },
];

let calls = 0;

// Même forme que start(bets) de G2 pour un jeu instantané :
// { sessionId, renderPayload, availableActions, terminal, gameResult }.
// L'UI n'envoie qu'une mise par tour : [{ type, amount }].
export function mockStart(bets) {
  const type = Array.isArray(bets) ? bets[0]?.type : undefined;
  const round = mockRounds[calls % mockRounds.length];
  const result = round.results[type];
  if (!result) {
    return Promise.reject(new Error(`wheel mock : pari inconnu '${type}'`));
  }
  const segment = wheelMockSegments.find(({ id }) => id === round.segmentId);
  calls += 1;
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          sessionId: `wheel-mock-${calls}`,
          renderPayload: { gameId: 'wheel', phase: 'result', raw: segment },
          availableActions: [],
          terminal: true,
          gameResult: { ...result, details: { segment } },
        }),
      600
    );
  });
}
