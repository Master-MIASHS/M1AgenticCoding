// ---------------------------------------------------------------------------
// Core - Administration (Groupe 1, #322)
// ---------------------------------------------------------------------------
// Outils de l'admin validés par le G5 dans #255 : ajustement du solde du
// joueur avec une trace dans l'historique, et rôle admin en mode dev.
//
//  * Un seul profil : l'ajustement porte sur le profil courant (n°5 à venir).
//  * Tout passe par updateState : state.js et economy.js ne changent pas.
//  * Conception détaillée : docs/design/ajustement-solde-admin.md
// ---------------------------------------------------------------------------

import { assertCanModifyConfig } from './permissions.js';
import { updateState } from './state.js';

/** Type des entrées d'historique créées par un ajustement de l'admin. */
export const TYPE_AJUSTEMENT_ADMIN = 'ADMIN_ADJUSTMENT';

/**
 * Indique si une entrée d'historique est un ajustement de l'admin plutôt
 * qu'une partie (les parties n'ont pas de champ `type`).
 *
 * @param {unknown} entree - Entrée d'historique.
 * @returns {boolean} Vrai pour un ajustement de l'admin.
 */
export function estAjustementAdmin(entree) {
  return entree !== null && typeof entree === 'object' && entree.type === TYPE_AJUSTEMENT_ADMIN;
}

/**
 * Arrondit un montant au centime, avec la même compensation des erreurs de
 * calcul flottant que le règlement et les statistiques.
 * @param {number} montant - Montant à arrondir.
 * @returns {number} Montant arrondi à deux décimales.
 */
function arrondirAuCentime(montant) {
  const compensation = Number.EPSILON * Math.max(1, Math.abs(montant));
  return Math.round((montant + compensation) * 100) / 100;
}

/**
 * Vérifie le montant d'un ajustement : nombre fini, non nul, au centime près.
 * @param {unknown} montant - Montant demandé (positif = ajout, négatif = retrait).
 * @returns {void}
 * @throws {TypeError} Si le montant est invalide.
 */
function validerMontant(montant) {
  if (typeof montant !== 'number' || !Number.isFinite(montant) || montant === 0 ||
      arrondirAuCentime(montant) !== montant) {
    throw new TypeError('admin : le montant doit être un nombre fini non nul, au centime près');
  }
}

/**
 * Indique si le Core tourne dans l'application lancée par Vite en
 * développement. Faux dans le site compilé et sous Node.
 * @returns {boolean} Vrai en mode dev.
 */
function modeDevDeVite() {
  return import.meta.env?.DEV === true;
}

/**
 * Crée les outils de l'admin sur une écriture d'état injectée (même
 * interface que updateState de state.js). Les dépendances ne sont injectables que dans les tests : la
 * façade utilise l'instance partagée, sans option.
 *
 * @param {object} deps - Dépendances.
 * @param {function(function(object): object): object} deps.updateState - Écriture atomique.
 * @param {function(): number} [deps.maintenant] - Horloge en ms (Date.now par défaut).
 * @param {function(): boolean} [deps.estModeDev] - Mode dev (Vite par défaut).
 * @returns {{ ajusterSolde: function(number): object,
 *   activerRoleAdminDev: function(): string }} Outils de l'admin.
 */
export function createAdministration({
  updateState,
  maintenant = Date.now,
  estModeDev = modeDevDeVite,
}) {
  return {
    /**
     * Ajoute ou retire des jetons au profil courant et trace l'opération dans
     * l'historique, dans une seule écriture. Le rôle est relu dans l'état.
     *
     * @param {number} montant - Positif pour un ajout, négatif pour un retrait.
     * @returns {{ type: string, amount: number, balanceBefore: number,
     *   balanceAfter: number, adjustedAt: string }} Copie de l'entrée ajoutée.
     * @throws {TypeError} Montant invalide.
     * @throws {Error} Rôle différent d'admin (rien n'est modifié).
     * @throws {RangeError} Solde final négatif (rien n'est modifié).
     */
    ajusterSolde(montant) {
      validerMontant(montant);
      let entree;
      updateState((etat) => {
        assertCanModifyConfig(etat.role);
        const balanceAfter = arrondirAuCentime(etat.balance + montant);
        if (balanceAfter < 0) {
          throw new RangeError('admin : le solde ne peut pas devenir négatif');
        }
        entree = {
          type: TYPE_AJUSTEMENT_ADMIN,
          amount: montant,
          balanceBefore: etat.balance,
          balanceAfter,
          adjustedAt: new Date(maintenant()).toISOString(),
        };
        return {
          ...etat,
          balance: balanceAfter,
          bestBalance: Math.max(etat.bestBalance, balanceAfter),
          history: [...etat.history, entree],
        };
      });
      return { ...entree };
    },

    /**
     * Passe le profil courant en admin, uniquement en mode dev : option
     * « bascule explicite en mode dev » validée par le G5 (#255).
     *
     * @returns {'admin'} Le rôle enregistré.
     * @throws {Error} Hors du mode dev (rien n'est modifié).
     */
    activerRoleAdminDev() {
      if (estModeDev() !== true) {
        throw new Error('admin : le rôle admin ne s’active qu’en mode développement');
      }
      updateState((etat) => ({ ...etat, role: 'admin' }));
      return 'admin';
    },
  };
}

/** Instance partagée sur le vrai état du Core (horloge et mode dev réels). */
const administrationDuCore = createAdministration({ updateState });

/**
 * Ajuste le solde du profil courant (réservé à l'admin).
 * @param {number} montant - Positif pour un ajout, négatif pour un retrait.
 * @returns {object} Copie de l'entrée ajoutée à l'historique.
 */
export function ajusterSoldeAdmin(montant) {
  return administrationDuCore.ajusterSolde(montant);
}

/**
 * Passe le profil courant en admin, uniquement en mode dev.
 * @returns {'admin'} Le rôle enregistré.
 */
export function activerRoleAdminDev() {
  return administrationDuCore.activerRoleAdminDev();
}
