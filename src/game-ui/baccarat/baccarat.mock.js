// Mock du baccarat (Punto Banco) au format de l'orchestrateur G2 (skill jeux-g2 § 1 et § 2).
// Jeu instantané : start(bets) renvoie directement le résultat. Déterministe : mains et
// résultats fixes par manche, pas une règle de jeu.
//
// Même forme que les règles G2 (PR #391) : details = { playerHand, bankerHand, playerTotal,
// bankerTotal, natural, winner, thirdCards, bets, totalBet, payout }. L'UI ne lit que
// details (jamais renderPayload.raw, qui contiendrait le paquet mélangé).

const card = (rank, suit) => Object.freeze({ rank, suit });

// Résultat de chaque type de pari pour la manche (multiplier mise incluse, contrat § 2.2) :
// donnée fixe de démonstration, comme les mains.
const rounds = [
  {
    playerHand: [card('9', 'hearts'), card('K', 'spades')],
    bankerHand: [card('5', 'clubs'), card('2', 'diamonds')],
    playerTotal: 9, bankerTotal: 7, natural: true, winner: 'player',
    thirdCards: { player: null, banker: null },
    results: { player: 2, banker: 0, tie: 0 },
  },
  {
    playerHand: [card('3', 'clubs'), card('2', 'hearts'), card('Q', 'diamonds')],
    bankerHand: [card('4', 'spades'), card('3', 'hearts')],
    playerTotal: 5, bankerTotal: 7, natural: false, winner: 'banker',
    thirdCards: { player: card('Q', 'diamonds'), banker: null },
    results: { player: 0, banker: 1.95, tie: 0 },
  },
  {
    playerHand: [card('A', 'spades'), card('5', 'diamonds')],
    bankerHand: [card('2', 'clubs'), card('4', 'hearts')],
    playerTotal: 6, bankerTotal: 6, natural: false, winner: 'tie',
    thirdCards: { player: null, banker: null },
    results: { player: 1, banker: 1, tie: 9 },
  },
];

const outcomeOf = (m) => (m > 1 ? 'win' : m === 1 ? 'push' : 'loss');

let calls = 0;

// Même forme que start(bets) de G2 : bets = [{ type: 'player' | 'banker' | 'tie', amount }].
export function mockStart(bets) {
  const bet = Array.isArray(bets) ? bets[0] : undefined;
  const round = rounds[calls % rounds.length];
  const multiplier = round.results[bet?.type];
  if (multiplier === undefined) {
    return Promise.reject(new Error(`baccarat mock : pari inconnu '${bet?.type}'`));
  }
  calls += 1;
  const details = {
    playerHand: [...round.playerHand],
    bankerHand: [...round.bankerHand],
    playerTotal: round.playerTotal,
    bankerTotal: round.bankerTotal,
    natural: round.natural,
    winner: round.winner,
    thirdCards: { ...round.thirdCards },
    bets: [{ type: bet.type, amount: bet.amount, won: multiplier > 1, multiplier, payout: bet.amount * multiplier }],
    totalBet: bet.amount,
    payout: bet.amount * multiplier,
  };
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          sessionId: `baccarat-mock-${calls}`,
          renderPayload: { gameId: 'baccarat', phase: 'result', interpretation: details },
          availableActions: [],
          terminal: true,
          gameResult: { outcome: outcomeOf(multiplier), multiplier, details },
        }),
      500
    );
  });
}
