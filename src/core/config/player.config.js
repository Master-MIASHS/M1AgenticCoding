// ---------------------------------------------------------------------------
// Core - Configuration du joueur
// ---------------------------------------------------------------------------
// Règle 4 d'AGENTS.md : le capital de départ n'est jamais écrit en dur dans
// le code, il se lit ici. Le défaut de 1000 jetons vient du glossaire
// d'AGENTS.md ; l'admin peut le régler avec createPlayerConfig (#207). La
// vérification du rôle admin relève de la tâche n°24.
// Le réglage de l'application est partagé et enregistré (#260, voir
// docs/design/reglages-admin.md).
// ---------------------------------------------------------------------------

import { createStockageLocal } from './stockage-local.js';

/**
 * Configuration par défaut d'un nouveau joueur.
 * Figée pour qu'aucun module ne la modifie par erreur : une autre
 * configuration se passe en paramètre à creerJoueur().
 *
 * @type {Readonly<{ capitalDeDepart: number }>}
 */
export const PLAYER_CONFIG = Object.freeze({
  capitalDeDepart: 1000,
});

/**
 * Crée un stockage en mémoire de la configuration réglée par l'admin, en
 * attendant le branchement sur casino_state (n°8).
 *
 * @param {{ capitalDeDepart?: number }} [initial] - Valeurs déjà réglées.
 * @returns {{ read: function(): object, write: function(object): void }}
 *   Stockage synchrone ; read() renvoie une copie.
 */
export function createPlayerConfigMemoryStore(initial = {}) {
  let reglages = { ...initial };
  return {
    read: () => ({ ...reglages }),
    write: (suivants) => {
      reglages = { ...suivants };
    },
  };
}

/**
 * Vérifie qu'un capital de départ est un nombre fini strictement positif.
 * Même règle que creerJoueur : un capital nul bloquerait le nouveau joueur.
 *
 * @param {unknown} montant - Capital à vérifier.
 * @returns {void}
 * @throws {RangeError} Si le capital est invalide.
 */
function validerCapital(montant) {
  if (typeof montant !== 'number' || !Number.isFinite(montant) || montant <= 0) {
    throw new RangeError(
      'player.config : le capital de départ doit être un nombre fini strictement positif',
    );
  }
}

/**
 * Lit et valide les réglages de l'admin.
 *
 * @param {{ read: function(): object }} store - Stockage injecté.
 * @returns {{ capitalDeDepart?: number }} Copie indépendante des réglages.
 * @throws {TypeError|RangeError} Si le contenu du stockage est invalide.
 */
function lireReglages(store) {
  const reglages = store.read();
  validerReglagesJoueur(reglages);
  return { ...reglages };
}

/**
 * Vérifie les réglages admin du joueur : un objet, avec un capital valide
 * s'il est présent.
 *
 * @param {unknown} reglages - Réglages à vérifier.
 * @returns {void}
 * @throws {TypeError|RangeError} Si les réglages sont invalides.
 */
export function validerReglagesJoueur(reglages) {
  if (reglages === null || typeof reglages !== 'object' || Array.isArray(reglages)) {
    throw new TypeError('player.config : le stockage doit contenir un objet { capitalDeDepart }');
  }
  if (reglages.capitalDeDepart !== undefined) {
    validerCapital(reglages.capitalDeDepart);
  }
}

/**
 * Crée la configuration du joueur sur un stockage injecté (même modèle que
 * les niveaux de déblocage réglables, n°21).
 *
 * Hors périmètre : vérification du rôle admin (n°24), enregistrement dans
 * casino_state (n°8), exposition dans core.js / coreService.js.
 *
 * @param {{ read: function(): object, write: function(object): void }} store
 *   Stockage synchrone des réglages de l'admin ({ capitalDeDepart }).
 * @returns {{ getCapitalDeDepart: function(): number,
 *   getPlayerConfig: function(): { capitalDeDepart: number },
 *   setCapitalDeDepart: function(number): number }} Configuration du joueur.
 * @throws {TypeError|RangeError} Si le stockage est invalide.
 */
export function createPlayerConfig(store) {
  if (!store || typeof store.read !== 'function' || typeof store.write !== 'function') {
    throw new TypeError('player.config : le stockage doit fournir read() et write()');
  }
  lireReglages(store);

  /**
   * Renvoie le capital de départ : celui réglé par l'admin, sinon le
   * défaut de PLAYER_CONFIG.
   *
   * @returns {number} Capital de départ d'un nouveau joueur.
   */
  const getCapitalDeDepart = () =>
    lireReglages(store).capitalDeDepart ?? PLAYER_CONFIG.capitalDeDepart;

  return {
    getCapitalDeDepart,

    /**
     * Renvoie la configuration complète d'un nouveau joueur, à passer à
     * creerJoueur(infos, { config }).
     *
     * @returns {{ capitalDeDepart: number }} Nouvel objet à chaque appel.
     */
    getPlayerConfig() {
      return { capitalDeDepart: getCapitalDeDepart() };
    },

    /**
     * Règle le capital de départ des nouveaux joueurs. Tout est validé avant
     * l'écriture : en cas d'erreur, rien n'est modifié. Les soldes des
     * joueurs existants ne changent pas.
     *
     * @param {number} montant - Nouveau capital, nombre fini strictement positif.
     * @returns {number} Le capital enregistré.
     * @throws {RangeError} Si le capital est invalide.
     */
    setCapitalDeDepart(montant) {
      validerCapital(montant);
      const reglages = lireReglages(store);
      reglages.capitalDeDepart = montant;
      store.write(reglages);
      return montant;
    },
  };
}

// Réglage de l'application, partagé et enregistré (#260) : un réglage admin
// global, hors de casino_state, conservé après rechargement. L'état initial
// et creerProfil le liront au branchement (#253).
const configJoueurDuCore = createPlayerConfig(
  createStockageLocal('casino_config_joueur', {}, { valider: validerReglagesJoueur }),
);

/**
 * Renvoie le capital de départ effectif : celui réglé par l'admin, sinon le
 * défaut de PLAYER_CONFIG.
 *
 * @returns {number} Capital de départ d'un nouveau joueur.
 */
export function getCapitalDeDepartActuel() {
  return configJoueurDuCore.getCapitalDeDepart();
}

/**
 * Règle et enregistre le capital de départ des nouveaux joueurs (sans
 * vérification de rôle : la façade core.js la fait). Les soldes existants
 * ne changent pas.
 *
 * @param {number} montant - Nouveau capital, nombre fini strictement positif.
 * @returns {number} Le capital enregistré.
 * @throws {RangeError} Si le capital est invalide (rien n'est enregistré).
 */
export function reglerCapitalDeDepart(montant) {
  return configJoueurDuCore.setCapitalDeDepart(montant);
}
