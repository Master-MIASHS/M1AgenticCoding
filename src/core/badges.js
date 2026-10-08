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
