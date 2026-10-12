// ---------------------------------------------------------------------------
// Core - Economy (mock)
// ---------------------------------------------------------------------------
// Minimal, deterministic mocks. These do NOT implement a real economy; they
// return coherent fictitious values so the architecture contracts can be
// exercised.
// ---------------------------------------------------------------------------

import { DAILY_BONUS_CONFIG } from './config/economy.config.js';
import { getMultiplicateurBonus } from './config/events.config.js';
import { calculateBestBalance } from './bestBalance.js';
import { createHistoryEntry } from './history.js';
import { calculateLevel } from './progression.js';
import { getState, updateState } from './state.js';
import { calculateXPGained } from './xp.js';

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
 * Applique un événement bonus au gain net positif d'un règlement.
 * La mise rendue n'est pas multipliée et le montant final n'est arrondi
 * qu'une fois, après application du bonus.
 *
 * @param {number} balance - Solde avant règlement.
 * @param {number} bet - Mise totale.
 * @param {{multiplier: number}} gameResult - Résultat déjà validé.
 * @param {{newBalance: number, payout: number, netGain: number}} settlement - Règlement de base.
 * @param {number} gainMultiplier - Multiplicateur d'événement actif.
 * @returns {{newBalance: number, payout: number, netGain: number}} Règlement final.
 */
function applyGainBonus(balance, bet, gameResult, settlement, gainMultiplier) {
  const rawNetGain = bet * gameResult.multiplier - bet;
  if (rawNetGain <= 0 || gainMultiplier === 1) return settlement;

  const payout = roundToCents(bet + rawNetGain * gainMultiplier);
  const netGain = roundToCents(payout - bet);
  const newBalance = roundToCents(balance + netGain);
  if (![payout, netGain, newBalance].every(Number.isFinite)) {
    throw new RangeError('economy: settlement exceeds the supported numeric range.');
  }
  return { newBalance, payout, netGain };
}

/**
 * Règle une partie et applique ses conséquences dans une écriture atomique.
 * Un roundId déjà réglé est refusé sans nouvelle écriture.
 *
 * @param {string} gameId - Identifiant du jeu.
 * @param {number} bet - Mise annoncée.
 * @param {object} gameResult - Résultat interprété par le jeu.
 * @param {{roundId?: string|null}} options - Identifiant stable fourni par G2,
 * ou null/omis pour un ancien appel sans garantie d'idempotence.
 * @returns {{ newBalance: number, xpGained: number, leveledUp: boolean }|{success: false, reason: 'already_settled'}} Résultat du règlement.
 */
export function play(gameId, bet, gameResult, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('economy: options must be an object.');
  }
  const { roundId } = options;
  if (roundId !== undefined && roundId !== null &&
      (typeof roundId !== 'string' || roundId.trim() === '')) {
    throw new TypeError('economy: roundId must be a non-empty string or null.');
  }
  const normalizedRoundId = roundId ?? null;
  if (normalizedRoundId === null) {
    console.warn('[Core] play() appelé sans roundId');
  }

  if (normalizedRoundId !== null &&
      (getState().settledRoundIds ?? []).includes(normalizedRoundId)) {
    return { success: false, reason: 'already_settled' };
  }

  let result;
  updateState((current) => {
    const settledRoundIds = current.settledRoundIds ?? [];
    if (normalizedRoundId !== null && settledRoundIds.includes(normalizedRoundId)) {
      result = { success: false, reason: 'already_settled' };
      return current;
    }

    const baseSettlement = calculateSettlement(current.balance, bet, gameResult);
    const settlement = applyGainBonus(
      current.balance,
      bet,
      gameResult,
      baseSettlement,
      getMultiplicateurBonus('gains'),
    );
    const xpGained = calculateXPGained({
      completed: true,
      xpMultiplier: getMultiplicateurBonus('xp'),
    });
    const xp = current.xp + xpGained;
    if (!Number.isFinite(xp)) {
      throw new RangeError('economy: XP exceeds the supported numeric range.');
    }
    const level = Math.max(current.level, calculateLevel(xp));
    const historyEntry = createHistoryEntry({
      roundId: normalizedRoundId,
      gameId,
      bet,
      outcome: gameResult.outcome,
      payout: settlement.payout,
      netGain: settlement.netGain,
      playedAt: new Date().toISOString(),
    });
    result = {
      newBalance: settlement.newBalance,
      xpGained,
      leveledUp: level > current.level,
    };
    return {
      ...current,
      balance: settlement.newBalance,
      bestBalance: calculateBestBalance(current.bestBalance, settlement.newBalance),
      xp,
      level,
      history: [...current.history, historyEntry],
      faillites: current.faillites +
        (current.balance > 0 && settlement.newBalance === 0 ? 1 : 0),
      settledRoundIds: normalizedRoundId === null
        ? settledRoundIds
        : [...settledRoundIds, normalizedRoundId],
    };
  });
  return result;
}

/**
 * Lit le solde fourni par l'état partagé, encore simulé.
 * @returns {number} Solde actuel.
 */
export function getBalance() {
  return getState().balance;
}

/**
 * Verifie la configuration du bonus quotidien.
 * @param {object} config - Reglages a verifier.
 * @returns {{ amount: number, cooldownMs: number }} Copie validee.
 */
function validateDailyBonusConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config) ||
      typeof config.amount !== 'number' || !Number.isFinite(config.amount) || config.amount <= 0 ||
      !Number.isSafeInteger(config.cooldownMs) || config.cooldownMs <= 0) {
    throw new RangeError('economy: configuration du bonus quotidien invalide.');
  }
  return { amount: config.amount, cooldownMs: config.cooldownMs };
}

/**
 * Lit et verifie la tranche d'etat necessaire au bonus quotidien.
 * @param {object} value - Valeur fournie par le stockage injecte.
 * @returns {{ balance: number, bestBalance: number, lastClaimAt: number|null }} Copie validee.
 */
function validateDailyBonusState(value) {
  const validTimestamp = value?.lastClaimAt === null ||
    (Number.isSafeInteger(value?.lastClaimAt) && value.lastClaimAt >= 0);
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      typeof value.balance !== 'number' || !Number.isFinite(value.balance) || value.balance < 0 ||
      typeof value.bestBalance !== 'number' || !Number.isFinite(value.bestBalance) ||
      value.bestBalance < value.balance || !validTimestamp) {
    throw new TypeError('economy: stockage du bonus quotidien invalide.');
  }
  return {
    balance: value.balance,
    bestBalance: value.bestBalance,
    lastClaimAt: value.lastClaimAt,
  };
}

/**
 * Cree la regle de bonus quotidien sur un stockage et une horloge injectes.
 * Le stockage applique ensemble le solde, le meilleur solde et l'horodatage.
 *
 * @param {{
 *   store: { read: function(): object, update: function(function(object): object): object },
 *   config?: { amount: number, cooldownMs: number },
 *   now?: function(): number
 * }} dependencies - Dependances synchrones du bonus.
 * @returns {{ claim: function(): object }} Service de reclamation.
 */
export function createDailyBonus({ store, config = DAILY_BONUS_CONFIG, now = Date.now } = {}) {
  if (!store || typeof store.read !== 'function' || typeof store.update !== 'function') {
    throw new TypeError('economy: stockage du bonus quotidien requis.');
  }
  if (typeof now !== 'function') {
    throw new TypeError('economy: horloge du bonus quotidien requise.');
  }
  const settings = validateDailyBonusConfig(config);

  return {
    /**
     * Reclame le bonus si le solde est nul et si le delai est ecoule.
     * @returns {{
     *   claimed: boolean,
     *   amount?: number,
     *   newBalance?: number,
     *   nextClaimAt?: number,
     *   reason?: 'balance_not_zero'|'cooldown',
     *   remainingMs?: number
     * }} Resultat structure de la reclamation.
     */
    claim() {
      const claimedAt = now();
      if (!Number.isSafeInteger(claimedAt) || claimedAt < 0) {
        throw new RangeError('economy: horodatage du bonus quotidien invalide.');
      }
      const current = validateDailyBonusState(store.read());
      if (current.balance !== 0) {
        return { claimed: false, reason: 'balance_not_zero', remainingMs: 0 };
      }

      if (current.lastClaimAt !== null) {
        const nextClaimAt = current.lastClaimAt + settings.cooldownMs;
        if (!Number.isSafeInteger(nextClaimAt)) {
          throw new RangeError('economy: horodatage hors de la plage numerique supportee.');
        }
        if (claimedAt < nextClaimAt) {
          return {
            claimed: false,
            reason: 'cooldown',
            remainingMs: nextClaimAt - claimedAt,
          };
        }
      }

      const newBalance = current.balance + settings.amount;
      const nextClaimAt = claimedAt + settings.cooldownMs;
      if (!Number.isFinite(newBalance) || !Number.isSafeInteger(nextClaimAt)) {
        throw new RangeError('economy: bonus hors de la plage numerique supportee.');
      }

      const applied = store.update((stored) => {
        const latest = validateDailyBonusState(stored);
        if (latest.balance !== current.balance || latest.bestBalance !== current.bestBalance ||
            latest.lastClaimAt !== current.lastClaimAt) {
          throw new Error('economy: etat du bonus modifie pendant la reclamation.');
        }
        return {
          balance: newBalance,
          bestBalance: Math.max(latest.bestBalance, newBalance),
          lastClaimAt: claimedAt,
        };
      });
      const verified = validateDailyBonusState(applied);
      if (verified.balance !== newBalance ||
          verified.bestBalance !== Math.max(current.bestBalance, newBalance) ||
          verified.lastClaimAt !== claimedAt) {
        throw new Error('economy: le stockage n a pas applique le bonus quotidien.');
      }
      return { claimed: true, amount: settings.amount, newBalance, nextClaimAt };
    },
  };
}

/**
 * Lit la date de la derniere reclamation enregistree dans l'etat (#348).
 * Une sauvegarde sans ce champ, ou avec une valeur invalide, vaut « jamais
 * reclame » (null).
 * @param {object} state - Etat du joueur.
 * @returns {number|null} Date en millisecondes, ou null.
 */
function readLastClaimAt(state) {
  const value = state.lastDailyBonusClaimAt;
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

// La date de reclamation est enregistree dans casino_state, dans la meme
// ecriture que le solde : le delai survit au rechargement de la page (#348).
const coreDailyBonusStore = {
  read() {
    const state = getState();
    return { balance: state.balance, bestBalance: state.bestBalance, lastClaimAt: readLastClaimAt(state) };
  },
  update(updater) {
    const updatedState = updateState((current) => {
      const nextBonusState = updater({
        balance: current.balance,
        bestBalance: current.bestBalance,
        lastClaimAt: readLastClaimAt(current),
      });
      return {
        ...current,
        balance: nextBonusState.balance,
        bestBalance: nextBonusState.bestBalance,
        lastDailyBonusClaimAt: nextBonusState.lastClaimAt,
      };
    });
    return {
      balance: updatedState.balance,
      bestBalance: updatedState.bestBalance,
      lastClaimAt: readLastClaimAt(updatedState),
    };
  },
};

const dailyBonus = createDailyBonus({ store: coreDailyBonusStore });

/**
 * Credite le bonus quotidien dans l'etat partage lorsque le joueur est eligible.
 * @returns {object} Resultat structure de la reclamation.
 */
export function claimDailyBonus() {
  return dailyBonus.claim();
}

/**
 * Simule une réponse de prêt sans créditer le solde ni enregistrer de dette.
 * @deprecated Le projet utilise uniquement le bonus quotidien, sans pret.
 * @param {number} amount - Montant demandé.
 * @returns {{ approved: boolean, amount: number }} Réponse fictive du prêt.
 */
export function requestLoan(amount) {
  return { approved: true, amount };
}
