// ---------------------------------------------------------------------------
// Core - Événements bonus (Groupe 1, tâche n°35, #223)
// ---------------------------------------------------------------------------
// L'admin lance des événements bonus : pendant une période, les gains ou
// l'XP sont multipliés. Ce module indique le multiplicateur en cours ; il ne
// l'applique pas (gains : play(), n°10 ; XP : progression, n°13).
//
//  * Aucun événement par défaut : leur contenu est décidé par l'admin
//    (décision ouverte d'AGENTS.md, mécanisme simple demandé par le G5).
//  * Stockage injecté (même modèle que unlock.config.js et player.config.js) :
//    l'enregistrement dans casino_state relève du branchement (n°8).
//  * Hors périmètre : vérification du rôle admin (n°24), exposition dans
//    core.js / coreService.js.
//  * Conception détaillée : docs/design/evenements-bonus.md et, pour
//    l'instance partagée enregistrée, docs/design/reglages-admin.md (#260).
// ---------------------------------------------------------------------------

import { createStockageLocal } from './stockage-local.js';

/** Cibles possibles d'un événement bonus. */
export const CIBLES = Object.freeze(['gains', 'xp']);

/**
 * Vérifie la forme d'un événement bonus.
 *
 * Un événement couvre la période [debut, fin) : début inclus, fin exclue.
 *
 * @param {{ id: string, cible: 'gains'|'xp', multiplicateur: number,
 *   debut: number, fin: number }} evenement - Événement à vérifier ; dates
 *   en millisecondes.
 * @returns {void}
 * @throws {Error} Si l'identifiant, la cible, le multiplicateur ou les dates
 *   sont invalides.
 */
export function validerEvenement(evenement) {
  if (evenement === null || typeof evenement !== 'object' || Array.isArray(evenement)) {
    throw new Error('events.config : un événement doit être un objet');
  }
  const { id, cible, multiplicateur, debut, fin } = evenement;
  if (typeof id !== 'string' || id === '') {
    throw new Error("events.config : l'identifiant doit être une chaîne non vide");
  }
  if (!CIBLES.includes(cible)) {
    throw new Error(`events.config : cible inconnue ${String(cible)} (gains ou xp)`);
  }
  // Un bonus augmente toujours : 1 ne changerait rien, < 1 serait un malus.
  if (typeof multiplicateur !== 'number' || !Number.isFinite(multiplicateur) || multiplicateur <= 1) {
    throw new Error('events.config : le multiplicateur doit être un nombre fini strictement supérieur à 1');
  }
  if (!Number.isSafeInteger(debut) || debut < 0 || !Number.isSafeInteger(fin) || fin <= debut) {
    throw new Error('events.config : debut et fin doivent être des dates en ms, avec fin > debut');
  }
}

/**
 * Crée un stockage en mémoire des événements, en attendant le branchement
 * sur casino_state (n°8).
 *
 * @param {Array<object>} [initial] - Événements déjà lancés.
 * @returns {{ read: function(): Array<object>, write: function(Array<object>): void }}
 *   Stockage synchrone ; read() renvoie une copie.
 */
export function createEvenementsMemoryStore(initial = []) {
  let evenements = structuredClone(initial);
  return {
    read: () => structuredClone(evenements),
    write: (suivants) => {
      evenements = structuredClone(suivants);
    },
  };
}

/**
 * Indique si deux événements visent la même cible sur des périodes qui se
 * recouvrent ([debut, fin), donc deux événements qui se suivent ne se
 * recouvrent pas).
 *
 * @param {object} a - Premier événement (valide).
 * @param {object} b - Second événement (valide).
 * @returns {boolean} Vrai en cas de chevauchement sur la même cible.
 */
function seChevauchent(a, b) {
  return a.cible === b.cible && a.debut < b.fin && b.debut < a.fin;
}

/**
 * Vérifie qu'un nouvel événement peut rejoindre une liste : identifiant
 * libre et aucun chevauchement sur la même cible.
 *
 * @param {Array<object>} evenements - Événements déjà présents (valides).
 * @param {object} nouveau - Événement à ajouter (valide).
 * @returns {void}
 * @throws {Error} Si l'identifiant est déjà utilisé ou en cas de chevauchement.
 */
function verifierCompatibilite(evenements, nouveau) {
  if (evenements.some((e) => e.id === nouveau.id)) {
    throw new Error(`events.config : identifiant déjà utilisé ${nouveau.id}`);
  }
  const conflit = evenements.find((e) => seChevauchent(e, nouveau));
  if (conflit !== undefined) {
    throw new Error(
      `events.config : ${nouveau.id} chevauche ${conflit.id} sur la cible ${nouveau.cible}`,
    );
  }
}

/**
 * Copie un événement en ne gardant que ses champs connus.
 * @param {object} evenement - Événement valide.
 * @returns {{ id: string, cible: string, multiplicateur: number, debut: number,
 *   fin: number }} Nouvel objet.
 */
function copierEvenement({ id, cible, multiplicateur, debut, fin }) {
  return { id, cible, multiplicateur, debut, fin };
}

/**
 * Lit et valide les événements du stockage.
 *
 * @param {{ read: function(): Array<object> }} store - Stockage injecté.
 * @returns {Array<object>} Copie indépendante des événements.
 * @throws {Error} Si le contenu du stockage est invalide.
 */
function lireEvenements(store) {
  return validerListeEvenements(store.read());
}

/**
 * Vérifie une liste complète d'événements : chacun valide, identifiants
 * uniques, aucun chevauchement sur une même cible.
 *
 * @param {Array<object>} liste - Événements à vérifier.
 * @returns {Array<object>} Copie des événements (champs connus seulement).
 * @throws {Error} Si la liste ou l'un de ses événements est invalide.
 */
export function validerListeEvenements(liste) {
  if (!Array.isArray(liste)) {
    throw new Error('events.config : le stockage doit contenir un tableau d’événements');
  }
  const evenements = [];
  for (const evenement of liste) {
    validerEvenement(evenement);
    verifierCompatibilite(evenements, evenement);
    evenements.push(copierEvenement(evenement));
  }
  return evenements;
}

/**
 * Crée la gestion des événements bonus sur un stockage injecté.
 *
 * @param {{ read: function(): Array<object>, write: function(Array<object>): void }} store
 *   Stockage synchrone des événements.
 * @param {object} [options] - Dépendances injectables.
 * @param {function(): number} [options.now] - Horloge en ms (Date.now par défaut).
 * @returns {{
 *   getEvenements: function(): Array<object>,
 *   lancerEvenement: function(object): object,
 *   arreterEvenement: function(string): object,
 *   getMultiplicateurActif: function(string): number
 * }} Gestion des événements bonus.
 * @throws {Error} Si le stockage, son contenu ou l'horloge est invalide.
 */
export function createEvenementsBonus(store, { now = Date.now } = {}) {
  if (!store || typeof store.read !== 'function' || typeof store.write !== 'function') {
    throw new Error('events.config : le stockage doit fournir read() et write()');
  }
  if (typeof now !== 'function') {
    throw new Error("events.config : l'horloge now doit être une fonction");
  }
  lireEvenements(store);

  return {
    /**
     * Renvoie tous les événements : passés, en cours et à venir.
     * @returns {Array<object>} Copie indépendante des événements.
     */
    getEvenements() {
      return lireEvenements(store);
    },

    /**
     * Lance un événement. Tout est vérifié avant l'écriture : en cas
     * d'erreur, rien n'est modifié.
     *
     * @param {object} evenement - Événement à lancer.
     * @returns {object} Copie de l'événement enregistré.
     * @throws {Error} Si l'événement est invalide, si son identifiant est déjà
     *   utilisé ou s'il chevauche un autre événement de la même cible.
     */
    lancerEvenement(evenement) {
      validerEvenement(evenement);
      const evenements = lireEvenements(store);
      verifierCompatibilite(evenements, evenement);
      const nouveau = copierEvenement(evenement);
      store.write([...evenements, nouveau]);
      return copierEvenement(nouveau);
    },

    /**
     * Arrête un événement (annulation ou arrêt anticipé) en le retirant.
     *
     * @param {string} id - Identifiant de l'événement.
     * @returns {object} Copie de l'événement retiré.
     * @throws {Error} Si aucun événement ne porte cet identifiant (rien
     *   n'est alors modifié).
     */
    arreterEvenement(id) {
      const evenements = lireEvenements(store);
      const retire = evenements.find((e) => e.id === id);
      if (retire === undefined) {
        throw new Error(`events.config : aucun événement ${String(id)}`);
      }
      store.write(evenements.filter((e) => e !== retire));
      return retire;
    },

    /**
     * Renvoie le multiplicateur en cours pour une cible : celui de
     * l'événement actif à l'instant présent, sinon 1. Il y a au plus un
     * événement actif par cible (chevauchements refusés).
     *
     * @param {'gains'|'xp'} cible - Cible du bonus.
     * @returns {number} Multiplicateur à appliquer (1 sans événement).
     * @throws {Error} Si la cible est inconnue ou si l'horloge est invalide.
     */
    getMultiplicateurActif(cible) {
      if (!CIBLES.includes(cible)) {
        throw new Error(`events.config : cible inconnue ${String(cible)} (gains ou xp)`);
      }
      const instant = now();
      if (!Number.isSafeInteger(instant) || instant < 0) {
        throw new Error("events.config : l'horloge doit renvoyer une date en ms");
      }
      const actif = lireEvenements(store).find(
        (e) => e.cible === cible && e.debut <= instant && instant < e.fin,
      );
      return actif === undefined ? 1 : actif.multiplicateur;
    },
  };
}

// Événements de l'application, partagés et enregistrés (#260) : un réglage
// admin global, hors de casino_state, conservé après rechargement. C'est
// cette instance que lit play() pour le multiplicateur (#131).
const evenementsDuCore = createEvenementsBonus(
  createStockageLocal('casino_config_evenements', [], { valider: validerListeEvenements }),
);

/**
 * Renvoie le multiplicateur bonus en cours pour une cible (1 sans événement).
 * Lu au moment du règlement d'une partie (arbitrage G5 du 07/10).
 *
 * @param {'gains'|'xp'} cible - Cible du bonus.
 * @returns {number} Multiplicateur à appliquer.
 * @throws {Error} Si la cible est inconnue.
 */
export function getMultiplicateurBonus(cible) {
  return evenementsDuCore.getMultiplicateurActif(cible);
}

/**
 * Renvoie tous les événements bonus enregistrés.
 * @returns {Array<object>} Copie indépendante des événements.
 */
export function getEvenementsBonus() {
  return evenementsDuCore.getEvenements();
}

/**
 * Lance et enregistre un événement bonus (sans vérification de rôle : la
 * façade core.js la fait avant d'appeler cette fonction).
 *
 * @param {object} evenement - Événement à lancer.
 * @returns {object} Copie de l'événement enregistré.
 * @throws {Error} Si l'événement est invalide, en conflit, ou si
 *   l'enregistrement échoue (rien n'est alors modifié).
 */
export function lancerEvenementBonus(evenement) {
  return evenementsDuCore.lancerEvenement(evenement);
}

/**
 * Arrête et retire un événement bonus enregistré (sans vérification de
 * rôle : la façade core.js la fait).
 *
 * @param {string} id - Identifiant de l'événement.
 * @returns {object} Copie de l'événement retiré.
 * @throws {Error} Si aucun événement ne porte cet identifiant.
 */
export function arreterEvenementBonus(id) {
  return evenementsDuCore.arreterEvenement(id);
}
