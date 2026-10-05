// ---------------------------------------------------------------------------
// Core - Création d'un nouveau joueur (Groupe 1, tâche n°3)
// ---------------------------------------------------------------------------
// Construit un joueur valide, prêt à être enregistré dans l'état.
//
//  * Fonctions PURES : rien n'est écrit dans l'état ni dans localStorage.
//    L'enregistrement relève de l'état réel et du branchement (n°1, n°8).
//  * Aucune valeur de réglage en dur (règle 4 d'AGENTS.md) : le capital de
//    départ vient de config/player.config.js.
//  * Conception détaillée : docs/design/nouveau-joueur.md
// ---------------------------------------------------------------------------

/**
 * Valide le pseudo d'un nouveau joueur.
 *
 * Seule une validation minimale est appliquée (chaîne non vide) : les règles
 * de longueur et de caractères ne sont pas encore définies par le projet.
 *
 * @param {string} pseudo - Pseudo saisi par le joueur.
 * @returns {string} Le pseudo sans espaces superflus au début et à la fin.
 * @throws {Error} Si le pseudo n'est pas une chaîne ou s'il est vide.
 */
export function validerPseudo(pseudo) {
  if (typeof pseudo !== 'string') {
    throw new Error('validerPseudo : le pseudo doit être une chaîne');
  }
  const pseudoNettoye = pseudo.trim();
  if (pseudoNettoye === '') {
    throw new Error('validerPseudo : le pseudo ne doit pas être vide');
  }
  return pseudoNettoye;
}

/**
 * Valide la date de naissance d'un nouveau joueur.
 *
 * La date est facultative (le schéma de casino_state l'autorise à null).
 * Aucun âge minimum n'est appliqué : ce point n'est pas défini par le projet.
 *
 * @param {string|null|undefined} dateNaissance - Date au format AAAA-MM-JJ,
 *   ou null / undefined si elle n'est pas renseignée.
 * @param {Date} [maintenant] - Date du jour, injectable pour des tests
 *   déterministes.
 * @returns {string|null} La date validée, ou null si elle n'est pas fournie.
 * @throws {Error} Si le format est invalide, si la date n'existe pas dans le
 *   calendrier (ex. 31 avril) ou si elle est dans le futur.
 */
export function validerDateNaissance(dateNaissance, maintenant = new Date()) {
  if (dateNaissance === null || dateNaissance === undefined) {
    return null;
  }
  if (typeof dateNaissance !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateNaissance)) {
    throw new Error('validerDateNaissance : la date doit être au format AAAA-MM-JJ');
  }

  // Une date inexistante (31 avril, 29 février d'une année non bissextile)
  // est décalée par Date : on la détecte en relisant ses composants.
  const [annee, mois, jour] = dateNaissance.split('-').map(Number);
  const date = new Date(Date.UTC(annee, mois - 1, jour));
  if (
    date.getUTCFullYear() !== annee ||
    date.getUTCMonth() !== mois - 1 ||
    date.getUTCDate() !== jour
  ) {
    throw new Error(`validerDateNaissance : la date ${dateNaissance} n'existe pas`);
  }

  // Comparaison sur la date seule (format AAAA-MM-JJ, triable comme du texte).
  const aujourdHui = maintenant.toISOString().slice(0, 10);
  if (dateNaissance > aujourdHui) {
    throw new Error('validerDateNaissance : la date de naissance ne peut pas être dans le futur');
  }
  return dateNaissance;
}
