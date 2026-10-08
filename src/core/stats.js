// ---------------------------------------------------------------------------
// Core - Statistiques globales (Groupe 1, tâche n°23, #270)
// ---------------------------------------------------------------------------
// Calcule les statistiques à partir de l'historique des parties de l'état
// (format de #266 : { roundId, gameId, bet, outcome, payout, netGain,
// playedAt }), avec la forme déjà lue par le G4 (Statistics.jsx, Admin.jsx).
//
//  * Rien n'est écrit : l'historique est rempli par play() (#131).
//  * Conception détaillée : docs/design/statistiques.md
// ---------------------------------------------------------------------------

/**
 * Arrondit un montant au centime, avec la même compensation des erreurs de
 * calcul flottant que le règlement (calculateSettlement).
 * @param {number} montant - Montant à arrondir.
 * @returns {number} Montant arrondi à deux décimales.
 */
function arrondirAuCentime(montant) {
  const compensation = Number.EPSILON * Math.max(1, Math.abs(montant));
  return Math.round((montant + compensation) * 100) / 100;
}

/**
 * Calcule les statistiques d'un historique de parties.
 *
 * @param {Array<{ gameId: string, bet: number, payout: number }>} historique -
 *   Entrées d'historique (les autres champs sont ignorés).
 * @returns {{ totalPlays: number, totalWagered: number, totalWon: number }}
 *   Nombre de parties, total misé et total reversé aux joueurs (mise incluse),
 *   arrondis au centime.
 */
export function calculerStatistiques(historique) {
  let totalWagered = 0;
  let totalWon = 0;
  for (const partie of historique) {
    totalWagered += partie.bet;
    totalWon += partie.payout;
  }
  return {
    totalPlays: historique.length,
    totalWagered: arrondirAuCentime(totalWagered),
    totalWon: arrondirAuCentime(totalWon),
  };
}
