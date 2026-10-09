/**
 * Prépare une entrée de partie identifiée ou d'ancien appel sans modifier l'état.
 * Les montants proviennent du règlement économique et sont conservés tels quels.
 * Amina conserve l'ajout atomique à l'historique et Ahmed l'anti-double règlement.
 * Les appels historiques fournissent explicitement roundId: null (#229, validé G5).
 * Cette entrée ne garantit pas l'idempotence et n'inscrit aucun règlement.
 *
 * @param {object} input - Données du règlement fournies par l'appelant.
 * @param {string|null} input.roundId - Identifiant opaque non vide, ou null pour un ancien appel.
 * @param {string} input.gameId - Identifiant non vide du jeu.
 * @param {number} input.bet - Mise finie et strictement positive.
 * @param {'win'|'loss'|'push'} input.outcome - Résultat, indépendant du gain net arrondi.
 * @param {number} input.payout - Montant reversé fini et non négatif.
 * @param {number} input.netGain - Gain net fini, positif, négatif ou nul.
 * @param {string} input.playedAt - Date ISO UTC canonique fournie par l'appelant.
 * @returns {{roundId: string|null, gameId: string, bet: number, outcome: string,
 *   payout: number, netGain: number, playedAt: string}} Objet neuf sérialisable en JSON.
 * @throws {TypeError} Si un champ est absent, mal typé ou non fini.
 * @throws {RangeError} Si les bornes ou la cohérence des montants (à un centime) sont invalides.
 */
export function createHistoryEntry(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('history: input must be an object.');
  }

  const { roundId, gameId, bet, outcome, payout, netGain, playedAt } = input;
  for (const [field, value] of [['roundId', roundId], ['gameId', gameId]]) {
    if (field === 'roundId' && value === null) continue;
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new TypeError(`history: ${field} must be a non-empty string.`);
    }
  }
  for (const [field, value] of [['bet', bet], ['payout', payout], ['netGain', netGain]]) {
    if (!Number.isFinite(value)) {
      throw new TypeError(`history: ${field} must be a finite number.`);
    }
  }
  if (bet <= 0 || payout < 0) {
    throw new RangeError('history: bet must be positive and payout non-negative.');
  }
  if (Math.abs(netGain - (payout - bet)) > 0.01) {
    throw new RangeError('history: netGain must match payout minus bet within one cent.');
  }
  if (!['win', 'loss', 'push'].includes(outcome)) {
    throw new TypeError('history: outcome must be win, loss or push.');
  }
  if (typeof playedAt !== 'string' || !Number.isFinite(Date.parse(playedAt))
    || new Date(playedAt).toISOString() !== playedAt) {
    throw new TypeError('history: playedAt must be a canonical ISO UTC date.');
  }

  return { roundId, gameId, bet, outcome, payout, netGain, playedAt };
}
