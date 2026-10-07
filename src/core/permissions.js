// ---------------------------------------------------------------------------
// Core - Permissions (Groupe 1, tâche n°24, #210)
// ---------------------------------------------------------------------------
// Politique interne de rôles cumulatifs. Les consommateurs externes ne doivent
// pas décider eux-mêmes d'une autorisation : les modules métier du Core
// utilisent ces fonctions avant d'appliquer une opération protégée.
// ---------------------------------------------------------------------------

export const ROLES = Object.freeze({
  PLAYER: 'player',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
});

const ROLE_LEVELS = Object.freeze({
  [ROLES.PLAYER]: 0,
  [ROLES.MODERATOR]: 1,
  [ROLES.ADMIN]: 2,
});

/**
 * Vérifie qu'un rôle est reconnu par la politique du Core.
 *
 * @param {unknown} role - Rôle à valider.
 * @returns {void}
 * @throws {TypeError} Si le rôle est inconnu.
 */
function validateRole(role) {
  if (typeof role !== 'string' || !Object.hasOwn(ROLE_LEVELS, role)) {
    throw new TypeError(`permissions: rôle inconnu : ${String(role)}`);
  }
}

/**
 * Indique si un rôle atteint le niveau minimal demandé dans la hiérarchie.
 *
 * @param {'player'|'moderator'|'admin'} role - Rôle du joueur courant.
 * @param {'player'|'moderator'|'admin'} requiredRole - Rôle minimal requis.
 * @returns {boolean} `true` lorsque le rôle atteint le niveau demandé.
 * @throws {TypeError} Si l'un des rôles est inconnu.
 */
export function hasMinimumRole(role, requiredRole) {
  validateRole(role);
  validateRole(requiredRole);
  return ROLE_LEVELS[role] >= ROLE_LEVELS[requiredRole];
}

/**
 * Refuse une modification de configuration lorsque le rôle n'est pas admin.
 *
 * @param {'player'|'moderator'|'admin'} role - Rôle du joueur courant.
 * @returns {void}
 * @throws {TypeError} Si le rôle est inconnu.
 * @throws {Error} Si le rôle n'est pas administrateur.
 */
export function assertCanModifyConfig(role) {
  if (!hasMinimumRole(role, ROLES.ADMIN)) {
    throw new Error(`permissions: permission refusée pour le rôle ${role}`);
  }
}
