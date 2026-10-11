// ---------------------------------------------------------------------------
// Core - Best balance (#228)
// ---------------------------------------------------------------------------

/**
 * Calcule le meilleur solde sans modifier l'état ni régler une partie.
 * Accepte les nombres finis comme state.js, sans imposer de règle sur la
 * négativité du solde et sans arrondir les montants déjà calculés par l'économie.
 * Amina applique le résultat dans la transaction de play() (#131).
 * Cette fonction interne n'est pas réexportée par l'API publique du Core.
 *
 * @param {number} previousBestBalance - Meilleur solde précédemment atteint.
 * @param {number} newBalance - Nouveau solde fourni par le règlement.
 * @returns {number} Maximum des deux montants, sans diminution du record.
 * @throws {TypeError} Si un montant n'est pas un nombre fini.
 */
export function calculateBestBalance(previousBestBalance, newBalance) {
  if (!Number.isFinite(previousBestBalance)) {
    throw new TypeError('bestBalance: previousBestBalance must be a finite number.');
  }
  if (!Number.isFinite(newBalance)) {
    throw new TypeError('bestBalance: newBalance must be a finite number.');
  }
  return Math.max(previousBestBalance, newBalance);
}
