// ---------------------------------------------------------------------------
// Core - Configuration de l'economie
// ---------------------------------------------------------------------------

/**
 * Reglages par defaut du bonus quotidien.
 *
 * @type {Readonly<{ amount: number, cooldownMs: number }>}
 */
export const DAILY_BONUS_CONFIG = Object.freeze({
  amount: 100,
  cooldownMs: 86_400_000,
});
