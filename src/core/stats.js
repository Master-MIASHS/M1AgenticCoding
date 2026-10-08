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
 * @returns {{ totalPlays: number, totalWagered: number, totalWon: number,
 *   activePlayers: number,
 *   byGame: Object<string, { plays: number, wagered: number, won: number }>,
 *   mostPlayed: string[] }} Nombre de parties, total misé et total reversé
 *   aux joueurs (mise incluse), arrondis au centime ; joueurs ayant joué (un
 *   seul profil aujourd'hui) ; détail par jeu ; jeux triés du plus joué au
 *   moins joué (égalités par identifiant).
 */
export function calculerStatistiques(historique) {
  let totalWagered = 0;
  let totalWon = 0;
  const byGame = {};
  for (const partie of historique) {
    totalWagered += partie.bet;
    totalWon += partie.payout;
    const jeu = (byGame[partie.gameId] ??= { plays: 0, wagered: 0, won: 0 });
    jeu.plays += 1;
    jeu.wagered += partie.bet;
    jeu.won += partie.payout;
  }
  for (const jeu of Object.values(byGame)) {
    jeu.wagered = arrondirAuCentime(jeu.wagered);
    jeu.won = arrondirAuCentime(jeu.won);
  }
  const mostPlayed = Object.keys(byGame).sort(
    (a, b) => byGame[b].plays - byGame[a].plays || a.localeCompare(b),
  );
  return {
    totalPlays: historique.length,
    totalWagered: arrondirAuCentime(totalWagered),
    totalWon: arrondirAuCentime(totalWon),
    // Un seul profil aujourd'hui : 1 joueur actif dès qu'une partie existe
    // (avec les profils multiples, n°5 : nombre de profils ayant joué).
    activePlayers: historique.length > 0 ? 1 : 0,
    byGame,
    mostPlayed,
  };
}
