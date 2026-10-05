// ---------------------------------------------------------------------------
// Core - Economy (mock)
// ---------------------------------------------------------------------------
// Minimal, deterministic mocks. These do NOT implement a real economy; they
// return coherent fictitious values so the architecture contracts can be
// exercised.
// ---------------------------------------------------------------------------

import { getState } from './state.js';

const roundToCents = (value) => {
  const floatingPointCompensation = Number.EPSILON * Math.max(1, Math.abs(value));
  return Math.round((value + floatingPointCompensation) * 100) / 100;
};

/**
 * Calcule un règlement sans modifier l'état partagé, en préparation de play().
 * Cette fonction interne n'est pas réexportée par l'API publique du Core.
 * Le multiplicateur inclut la mise et peut être fractionnaire pour des mises agrégées.
 * Le montant total reversé est arrondi une seule fois à deux décimales.
 * Le contenu de details reste opaque pour préserver les règles des jeux côté G2.
 * L'issue #73 conserve la sémantique G2 : outcome est déterminé par le multiplicateur.
 *
 * @param {number} balance - Solde disponible avant règlement.
 * @param {number} bet - Mise totale, qui n'a pas encore été débitée.
 * @param {{ outcome: 'win'|'loss'|'push', multiplier: number, details?: object }} gameResult - Résultat interprété par le jeu.
 * @returns {{ newBalance: number, payout: number, netGain: number }} Solde calculé, montant reversé et gain net.
 * @throws {TypeError|RangeError} Entrée invalide ou règlement non fini.
 */
export function calculateSettlement(balance, bet, gameResult) {
  if (typeof balance !== 'number' || !Number.isFinite(balance)) {
    throw new TypeError('economy: balance must be a finite number.');
  }
  if (balance < 0) {
    throw new RangeError('economy: balance must be non-negative.');
  }
  if (typeof bet !== 'number' || !Number.isFinite(bet)) {
    throw new TypeError('economy: bet must be a finite number.');
  }
  if (bet <= 0) {
    throw new RangeError('economy: bet must be positive.');
  }
  if (bet > balance) {
    throw new RangeError('economy: insufficient balance.');
  }
  if (!gameResult || typeof gameResult !== 'object' || Array.isArray(gameResult)) {
    throw new TypeError('economy: gameResult must be an object.');
  }
  if (!['win', 'loss', 'push'].includes(gameResult.outcome)) {
    throw new TypeError('economy: invalid outcome.');
  }
  const { multiplier } = gameResult;
  if (typeof multiplier !== 'number' || !Number.isFinite(multiplier)) {
    throw new TypeError('economy: multiplier must be a finite number.');
  }
  if (multiplier < 0) {
    throw new RangeError('economy: multiplier must be non-negative.');
  }
  const rawPayout = bet * multiplier;
  if (!Number.isFinite(rawPayout)) {
    throw new RangeError('economy: settlement exceeds the supported numeric range.');
  }
  const payout = roundToCents(rawPayout);
  if (!Number.isFinite(payout)) {
    throw new RangeError('economy: settlement exceeds the supported numeric range.');
  }
  const expectedOutcome = multiplier > 1 ? 'win' : multiplier < 1 ? 'loss' : 'push';
  if (gameResult.outcome !== expectedOutcome) {
    throw new RangeError('economy: outcome does not match the aggregate multiplier.');
  }
  const netGain = roundToCents(payout - bet);
  const newBalance = roundToCents(balance + netGain);
  if (!Number.isFinite(newBalance)) {
    throw new RangeError('economy: settlement exceeds the supported numeric range.');
  }
  return { newBalance, payout, netGain };
}

/**
 * Calcule le bilan économique d'une partie sans modifier l'état partagé.
 * L'XP reste fictive tant que le contrat de progression n'est pas intégré.
 *
 * @param {string} gameId - Identifiant du jeu.
 * @param {number} bet - Mise annoncée.
 * @param {object} gameResult - Résultat interprété par le jeu.
 * @returns {{ newBalance: number, xpGained: number, leveledUp: boolean }} Bilan fictif sans mise à jour du solde ou des XP.
 */
export function play(gameId, bet, gameResult) {
  const { balance } = getState();
  const { newBalance } = calculateSettlement(balance, bet, gameResult);

  return {
    newBalance,
    xpGained: 10,
    leveledUp: false,
  };
}

/**
 * Lit le solde fourni par l'état partagé, encore simulé.
 * @returns {number} Solde actuel.
 */
export function getBalance() {
  return getState().balance;
}

/**
 * Simule le montant du bonus quotidien sans créditer le solde.
 * @returns {number} Montant fictif du bonus.
 */
export function claimDailyBonus() {
  return 100;
}

/**
 * Simule une réponse de prêt sans créditer le solde ni enregistrer de dette.
 * @param {number} amount - Montant demandé.
 * @returns {{ approved: boolean, amount: number }} Réponse fictive du prêt.
 */
export function requestLoan(amount) {
  return { approved: true, amount };
}
