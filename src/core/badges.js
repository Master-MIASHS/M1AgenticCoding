// ---------------------------------------------------------------------------
// Core - Badges du joueur (Groupe 1, tâche n°33, #272)
// ---------------------------------------------------------------------------
// Attribue les badges définis dans config/badges.config.js à partir des
// compteurs du joueur (parties jouées, faillites), avec la progression vers
// chacun. Le G4 les affiche (classement, profil).
//
//  * Rien n'est écrit : les badges sont recalculés à chaque lecture.
//  * Conception détaillée : docs/design/badges.md
// ---------------------------------------------------------------------------

import { BADGES_CONFIG } from './config/badges.config.js';

/** Compteurs du joueur sur lesquels un badge peut porter. */
const COMPTEURS = Object.freeze(['partiesJouees', 'faillites']);

/**
 * Vérifie une liste de définitions de badges.
 *
 * @param {Array<{ id: string, nom: string, compteur: string, seuil: number }>}
 *   definitions - Définitions à vérifier.
 * @returns {void}
 * @throws {Error} Si la liste n'est pas un tableau, si une définition est mal
 *   formée (id ou nom non vide, compteur connu, seuil entier ≥ 1) ou si deux
 *   définitions ont le même identifiant.
 */
export function validerDefinitionsBadges(definitions) {
  if (!Array.isArray(definitions)) {
    throw new Error('badges : les définitions doivent être un tableau');
  }
  const identifiants = new Set();
  for (const definition of definitions) {
    if (
      definition === null ||
      typeof definition !== 'object' ||
      typeof definition.id !== 'string' ||
      definition.id === '' ||
      typeof definition.nom !== 'string' ||
      definition.nom === '' ||
      !COMPTEURS.includes(definition.compteur) ||
      !Number.isSafeInteger(definition.seuil) ||
      definition.seuil < 1
    ) {
      throw new Error(
        'badges : définition invalide (id, nom, compteur partiesJouees ou faillites, seuil entier ≥ 1)',
      );
    }
    if (identifiants.has(definition.id)) {
      throw new Error(`badges : identifiant en double ${definition.id}`);
    }
    identifiants.add(definition.id);
  }
}

/**
 * Calcule les badges d'un joueur à partir de ses compteurs.
 *
 * @param {{ partiesJouees?: number, faillites?: number }} compteurs -
 *   Compteurs du joueur (entiers ≥ 0 ; un compteur absent vaut 0).
 * @param {Array<object>} [definitions] - Définitions des badges
 *   (BADGES_CONFIG.definitions par défaut).
 * @returns {Array<{ id: string, nom: string, obtenu: boolean, actuel: number,
 *   seuil: number }>} Un élément par définition, dans le même ordre ; `actuel`
 *   est plafonné au seuil (progression à afficher).
 * @throws {Error} Si les compteurs ou les définitions sont invalides.
 */
export function calculerBadges(compteurs, definitions = BADGES_CONFIG.definitions) {
  validerDefinitionsBadges(definitions);
  if (compteurs === null || typeof compteurs !== 'object' || Array.isArray(compteurs)) {
    throw new Error('badges : les compteurs doivent être un objet');
  }
  for (const nom of COMPTEURS) {
    const valeur = compteurs[nom];
    if (valeur !== undefined && (!Number.isSafeInteger(valeur) || valeur < 0)) {
      throw new Error(`badges : le compteur ${nom} doit être un entier ≥ 0`);
    }
  }
  return definitions.map(({ id, nom, compteur, seuil }) => {
    const valeur = compteurs[compteur] ?? 0;
    return { id, nom, obtenu: valeur >= seuil, actuel: Math.min(valeur, seuil), seuil };
  });
}

/**
 * Lit les compteurs du joueur dans l'état.
 *
 * - `partiesJouees` : nombre d'entrées de l'historique (format #266) ;
 * - `faillites` : champ `faillites` de l'état (solde tombé à 0), tenu par
 *   play() (#131). Il vaut 0 tant que ce champ n'existe pas.
 *
 * @param {{ history: Array, faillites?: number }} etat - État du joueur.
 * @returns {{ partiesJouees: number, faillites: number }} Compteurs.
 * @throws {Error} Si l'état n'a pas d'historique (tableau).
 */
export function compteursDuJoueur(etat) {
  if (etat === null || typeof etat !== 'object' || !Array.isArray(etat.history)) {
    throw new Error("badges : l'état doit contenir un historique (tableau)");
  }
  return { partiesJouees: etat.history.length, faillites: etat.faillites ?? 0 };
}
