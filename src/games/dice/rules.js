// ---------------------------------------------------------------------------
// Games - Dice (Craps) rules (Groupe 2, issue #159)
// ---------------------------------------------------------------------------
// Pure pass-line craps rules. Randomness is supplied as raw dice-face pairs;
// craps.js owns the shared, deterministic round transitions.
//
// resolve(raw, { bets, config }) -> { outcome, multiplier, details }
//
// `details` keeps the G3 and Core fields from the gameResult contract and
// includes both the real dice faces and their totals for display/audit.
// ---------------------------------------------------------------------------

import { advanceCrapsRound } from './craps.js';

export const COME = 'come';
export const POINT = 'point';
export const DONE = 'done';

export const PAYTABLE = Object.freeze({
  natural: Object.freeze([7, 11]),
  craps: Object.freeze([2, 3, 12]),
  pointValues: Object.freeze([4, 5, 6, 8, 9, 10]),
});

function validateConfig(config) {
  const multiplier = config?.paytable?.pass;
  if (typeof multiplier !== 'number' || !Number.isFinite(multiplier) || multiplier <= 1) {
    throw new TypeError(
      'dice: config.paytable.pass must be a finite number greater than 1'
    );
  }
  return multiplier;
}

function validateBets(bets) {
  if (!Array.isArray(bets) || bets.length === 0) {
    throw new TypeError('dice: bets must be a non-empty array of pass bets');
  }
  return bets.reduce((sum, bet) => {
    if (
      bet === null ||
      typeof bet !== 'object' ||
      bet.type !== 'pass' ||
      typeof bet.amount !== 'number' ||
      !Number.isFinite(bet.amount) ||
      bet.amount <= 0
    ) {
      throw new TypeError('dice: each bet must have type "pass" and a positive finite amount');
    }
    return sum + bet.amount;
  }, 0);
}

function validateRolls(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new TypeError('dice: raw must be a non-empty list of dice-face pairs');
  }

  return raw.map((dice, index) => {
    if (!Array.isArray(dice) || dice.length !== 2) {
      throw new TypeError(`dice: roll ${index + 1} must contain exactly two faces`);
    }
    for (const face of dice) {
      if (!Number.isInteger(face)) {
        throw new TypeError(`dice: faces in roll ${index + 1} must be integers`);
      }
      if (face < 1 || face > 6) {
        throw new RangeError(`dice: faces in roll ${index + 1} must be between 1 and 6`);
      }
    }
    return [...dice];
  });
}

/**
 * Resolves a complete pass-line craps round from its raw dice faces.
 *
 * @param {Array<[number, number]>} raw - dice faces in roll order.
 * @param {{ bets: Array<{ type: string, amount: number }>, config: object }} options
 *   normalized bets and the required paytable configuration.
 * @returns {{ outcome: 'win' | 'loss', multiplier: number, details: object }}
 * @throws {TypeError} for malformed rolls, bets, options, or configuration.
 * @throws {RangeError} for faces outside [1, 6], incomplete rounds, or extra
 *   rolls after the round has resolved.
 */
export function resolve(raw, options = {}) {
  if (options === null || typeof options !== 'object') {
    throw new TypeError('dice: options must contain bets and config');
  }

  const { bets, config } = options;
  const multiplier = validateConfig(config);
  const bet = validateBets(bets);
  const dice = validateRolls(raw);
  const rolls = dice.map(([first, second]) => first + second);

  let point = null;
  let outcome = null;
  for (let index = 0; index < rolls.length; index += 1) {
    const next = advanceCrapsRound(point, rolls[index]);
    point = next.point;
    if (next.outcome !== null) {
      outcome = next.outcome;
      if (index < rolls.length - 1) {
        throw new RangeError('dice: surplus rolls after the terminal roll');
      }
      break;
    }
  }

  if (outcome === null) {
    throw new RangeError('dice: not enough rolls to reach a terminal outcome');
  }

  const resultMultiplier = outcome === 'win' ? multiplier : 0;
  const payout = bet * resultMultiplier;
  return {
    outcome,
    multiplier: resultMultiplier,
    details: {
      point,
      rolls,
      rawValues: dice,
      dice,
      totalBet: bet,
      payout,
    },
  };
}

/**
 * Rules object following the G2 template contract.
 */
export const diceRules = Object.freeze({ resolve });
