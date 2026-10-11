// Create-profile page - pure helper (Groupe 4 - issue #277).
// Kept free of React / DOM so it stays unit-testable with `node --test`.
// The pseudo rules (empty, type, trimming) belong to the Core: this helper
// only forwards the typed pseudo and reports what the Core answered.

/**
 * Submits the typed pseudo to the Core and reports the outcome.
 *
 * @param {string} pseudo - Pseudo typed by the player.
 * @param {(infos: { pseudo: string }) => object} create - `creerProfil` from coreService.
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function submitProfile(pseudo, create) {
  try {
    create({ pseudo });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur inconnue.' };
  }
}
