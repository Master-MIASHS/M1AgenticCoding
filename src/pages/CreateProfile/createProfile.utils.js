// Create-profile page - pure helper (Groupe 4 - issue #277).
// Kept free of React / DOM so it stays unit-testable with `node --test`.
// The pseudo rules (empty, type, trimming) belong to the Core: this helper
// only forwards the typed pseudo and reports what the Core answered.

/**
 * Submits the typed pseudo and birth date to the Core and reports the outcome.
 * The only check done here is the surface one (birth date required); the age
 * rule (18 or more) and the date validity are decided by the Core.
 *
 * @param {string} pseudo - Pseudo typed by the player.
 * @param {string} dateNaissance - Birth date as typed (AAAA-MM-JJ from the date field).
 * @param {(infos: { pseudo: string, dateNaissance: string }) => object} create - `creerProfil` from coreService.
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function submitProfile(pseudo, dateNaissance, create) {
  if (typeof dateNaissance !== 'string' || dateNaissance.trim() === '') {
    return { ok: false, error: 'la date de naissance est obligatoire' };
  }
  try {
    create({ pseudo, dateNaissance });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur inconnue.' };
  }
}
