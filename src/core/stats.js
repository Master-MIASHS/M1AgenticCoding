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

import { estAjustementAdmin } from './admin.js';
import { getState } from './state.js';

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
 * Vérifie les champs d'une entrée d'historique utilisés par les statistiques.
 * Un historique corrompu est signalé plutôt que de produire de faux chiffres.
 *
 * @param {unknown} partie - Entrée à vérifier.
 * @param {number} index - Position de l'entrée, pour le message d'erreur.
 * @returns {void}
 * @throws {Error} Si l'entrée n'est pas un objet, si `gameId` n'est pas une
 *   chaîne non vide, ou si `bet` ou `payout` n'est pas un nombre fini ≥ 0.
 */
function validerPartie(partie, index) {
  const estMontant = (valeur) => typeof valeur === 'number' && Number.isFinite(valeur) && valeur >= 0;
  if (
    partie === null ||
    typeof partie !== 'object' ||
    typeof partie.gameId !== 'string' ||
    partie.gameId === '' ||
    !estMontant(partie.bet) ||
    !estMontant(partie.payout)
  ) {
    throw new Error(
      `stats : entrée ${index} de l'historique invalide (gameId, bet et payout attendus)`,
    );
  }
}

/**
 * Calcule les statistiques d'un historique de parties.
 *
 * @param {Array<{ gameId: string, bet: number, payout: number }>} historique -
 *   Entrées d'historique (autres champs et ajustements de l'admin ignorés).
 * @returns {{ totalPlays: number, totalWagered: number, totalWon: number,
 *   activePlayers: number,
 *   byGame: Object<string, { plays: number, wagered: number, won: number }>,
 *   mostPlayed: string[] }} Nombre de parties, total misé et total reversé
 *   aux joueurs (mise incluse), arrondis au centime ; joueurs ayant joué (un
 *   seul profil aujourd'hui) ; détail par jeu ; jeux triés du plus joué au
 *   moins joué (égalités par identifiant).
 * @throws {Error} Si l'historique ou l'une de ses entrées est invalide.
 */
export function calculerStatistiques(historique) {
  if (!Array.isArray(historique)) {
    throw new Error("stats : l'historique doit être un tableau");
  }
  // Les ajustements de l'admin (#322) partagent l'historique mais ne sont
  // pas des parties.
  const parties = historique.filter((entree) => !estAjustementAdmin(entree));
  parties.forEach(validerPartie);
  let totalWagered = 0;
  let totalWon = 0;
  // Une Map, et non un objet {} : un gameId venu d'une sauvegarde importée
  // (« __proto__ », « constructor »…) ne doit jamais toucher aux prototypes.
  const parJeu = new Map();
  for (const partie of parties) {
    totalWagered += partie.bet;
    totalWon += partie.payout;
    const jeu = parJeu.get(partie.gameId) ?? { plays: 0, wagered: 0, won: 0 };
    jeu.plays += 1;
    jeu.wagered += partie.bet;
    jeu.won += partie.payout;
    parJeu.set(partie.gameId, jeu);
  }
  // Object.fromEntries crée de vraies propriétés, même pour « __proto__ ».
  const byGame = Object.fromEntries(
    [...parJeu].map(([gameId, jeu]) => [
      gameId,
      { plays: jeu.plays, wagered: arrondirAuCentime(jeu.wagered), won: arrondirAuCentime(jeu.won) },
    ]),
  );
  const mostPlayed = [...parJeu.keys()].sort(
    (a, b) => parJeu.get(b).plays - parJeu.get(a).plays || a.localeCompare(b),
  );
  return {
    totalPlays: parties.length,
    totalWagered: arrondirAuCentime(totalWagered),
    totalWon: arrondirAuCentime(totalWon),
    // Un seul profil aujourd'hui : 1 joueur actif dès qu'une partie existe
    // (avec les profils multiples, n°5 : nombre de profils ayant joué).
    activePlayers: parties.length > 0 ? 1 : 0,
    byGame,
    mostPlayed,
  };
}

/**
 * Renvoie les statistiques globales, calculées sur l'historique des parties
 * de l'état. Exposée par core.js → coreService (même forme qu'avant pour le
 * G4). Toutes les valeurs valent 0 tant que play() n'enregistre rien (#131).
 *
 * @returns {ReturnType<typeof calculerStatistiques>} Statistiques globales.
 * @throws {Error} Si l'historique enregistré est corrompu.
 */
export function getGlobalStats() {
  return calculerStatistiques(getState().history);
}
