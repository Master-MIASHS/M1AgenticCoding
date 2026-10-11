// ---------------------------------------------------------------------------
// Core - Modération minimale (Groupe 1, tâche n°34, #352)
// ---------------------------------------------------------------------------
// AGENTS.md : le modérateur peut désactiver un compte pour triche. Décision du
// G5 : strict minimum dans le Core, un indicateur isBanned dans l'état.
//
//  * Un seul profil : le statut porte sur le profil courant (n°5 à venir).
//  * Le refus des actions d'un compte désactivé est fait dans core.js.
//  * Conception détaillée : docs/design/moderation.md
// ---------------------------------------------------------------------------

import { hasMinimumRole, ROLES } from './permissions.js';
import { updateState } from './state.js';

/** Statuts acceptés par setPlayerStatus. */
const STATUTS = Object.freeze(['banned', 'active']);

/**
 * Indique si le compte d'un état est désactivé.
 * @param {object} etat - État du joueur.
 * @returns {boolean} Vrai si `isBanned` vaut true.
 */
export function estCompteDesactive(etat) {
  return etat?.isBanned === true;
}

/**
 * Refuse une action (partie, achat, bonus) d'un compte désactivé.
 * @param {object} etat - État du joueur.
 * @returns {void}
 * @throws {Error} Si le compte est désactivé.
 */
export function assertCompteActif(etat) {
  if (estCompteDesactive(etat)) {
    throw new Error('moderation : compte désactivé pour triche, action refusée');
  }
}

/**
 * Crée la modération sur une écriture d'état injectée (même interface que
 * updateState de state.js). La façade utilise l'instance partagée, sans option.
 *
 * @param {{ updateState: function(function(object): object): object }} deps - Écriture.
 * @returns {{ setPlayerStatus: function(string): string }} Modération.
 */
export function createModeration({ updateState: ecrire }) {
  return {
    /**
     * Désactive (`'banned'`) ou réactive (`'active'`) le compte courant.
     * Réservé au modérateur et à l'admin ; le rôle est relu dans l'état.
     * Seul `isBanned` change : les acquis du joueur sont conservés.
     *
     * @param {'banned'|'active'} status - Nouveau statut.
     * @returns {'banned'|'active'} Le statut enregistré.
     * @throws {TypeError} Statut inconnu (rien n'est écrit).
     * @throws {Error} Rôle insuffisant (rien n'est modifié).
     */
    setPlayerStatus(status) {
      if (!STATUTS.includes(status)) {
        throw new TypeError("moderation : le statut doit être 'banned' ou 'active'");
      }
      ecrire((etat) => {
        if (!hasMinimumRole(etat.role, ROLES.MODERATOR)) {
          throw new Error(`moderation : permission refusée pour le rôle ${etat.role}`);
        }
        return { ...etat, isBanned: status === 'banned' };
      });
      return status;
    },
  };
}

/** Instance partagée sur le vrai état du Core. */
const moderationDuCore = createModeration({ updateState });

/**
 * Désactive ou réactive le compte courant (modérateur ou admin).
 * @param {'banned'|'active'} status - Nouveau statut.
 * @returns {'banned'|'active'} Le statut enregistré.
 */
export function setPlayerStatus(status) {
  return moderationDuCore.setPlayerStatus(status);
}
