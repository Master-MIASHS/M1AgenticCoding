// ---------------------------------------------------------------------------
// Core - Création d'un nouveau joueur (Groupe 1, tâche n°3)
// ---------------------------------------------------------------------------
// Construit un joueur valide et crée le profil du joueur dans l'état.
//
//  * validerPseudo, validerDateNaissance, jeuxDeDepart et creerJoueur sont
//    PURES : elles n'écrivent rien.
//  * Seule creerProfil écrit dans l'état, en une seule écriture updateState
//    (#226), et uniquement sur une partie neuve.
//  * Aucune valeur de réglage en dur (règle 4 d'AGENTS.md) : le capital de
//    départ vient de config/player.config.js.
//  * Conception détaillée : docs/design/nouveau-joueur.md et
//    docs/design/creer-profil.md
// ---------------------------------------------------------------------------

import { GAMES } from './config/games.config.js';
import { PLAYER_CONFIG } from './config/player.config.js';
import { getState, updateState } from './state.js';

// Un nouveau joueur commence toujours au niveau 1 (schéma de casino_state).
const NIVEAU_DE_DEPART = 1;

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

  if (!(maintenant instanceof Date) || Number.isNaN(maintenant.getTime())) {
    throw new Error('validerDateNaissance : la date du jour est invalide');
  }

  // Une date inexistante (31 avril, 29 février d'une année non bissextile)
  // est décalée par Date : on la détecte en relisant ses composants.
  // setUTCFullYear plutôt que Date.UTC, qui lit les années 0 à 99 comme 1900+.
  const [annee, mois, jour] = dateNaissance.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(annee, mois - 1, jour);
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

/**
 * Détermine les jeux accessibles à un nouveau joueur.
 *
 * Les jeux de départ sont déduits des niveaux de déblocage plutôt qu'écrits
 * en dur : si l'admin modifie ces niveaux, les jeux de départ suivent.
 *
 * @param {Object<string, { id: string, unlockLevel: number }>} [jeux] - Jeux
 *   indexés par identifiant (GAMES par défaut).
 * @returns {string[]} Identifiants des jeux débloqués au niveau 1, dans
 *   l'ordre de la liste fournie (nouveau tableau à chaque appel).
 * @throws {Error} Si la liste des jeux est invalide.
 */
export function jeuxDeDepart(jeux = GAMES) {
  if (jeux === null || typeof jeux !== 'object' || Array.isArray(jeux)) {
    throw new Error('jeuxDeDepart : les jeux doivent être un objet indexé par identifiant');
  }
  const liste = Object.values(jeux);
  for (const jeu of liste) {
    if (!jeu || typeof jeu.id !== 'string' || !Number.isFinite(jeu.unlockLevel)) {
      throw new Error('jeuxDeDepart : chaque jeu doit avoir un id et un unlockLevel');
    }
  }
  return liste.filter((jeu) => jeu.unlockLevel <= NIVEAU_DE_DEPART).map((jeu) => jeu.id);
}

/**
 * Construit un nouveau joueur prêt à être enregistré dans l'état.
 *
 * Fonction pure : elle ne modifie ni l'état ni localStorage. Le joueur a la
 * forme de `player` dans le schéma de casino_state (voir state.js).
 *
 * @param {{ pseudo: string, dateNaissance?: string|null }} infos - Informations
 *   saisies par le joueur.
 * @param {object} [options] - Dépendances injectables (tests, réglage admin).
 * @param {{ capitalDeDepart: number }} [options.config] - Configuration du
 *   joueur (PLAYER_CONFIG par défaut).
 * @param {Object<string, { id: string, unlockLevel: number }>} [options.jeux] -
 *   Jeux et niveaux de déblocage (GAMES par défaut).
 * @param {Date} [options.maintenant] - Date du jour, pour valider la date de
 *   naissance.
 * @returns {{ pseudo: string, birthDate: string|null, balance: number,
 *   bestBalance: number, xp: number, level: number, unlockedGames: string[],
 *   role: 'player' }} Le nouveau joueur (nouvel objet à chaque appel).
 * @throws {Error} Si les informations ou la configuration sont invalides.
 */
export function creerJoueur(
  infos,
  { config = PLAYER_CONFIG, jeux = GAMES, maintenant = new Date() } = {},
) {
  if (infos === null || typeof infos !== 'object' || Array.isArray(infos)) {
    throw new Error('creerJoueur : les informations du joueur doivent être un objet');
  }
  // Un capital nul ou négatif bloquerait le joueur dès le départ, ce
  // qu'interdit l'invariant « un joueur n'est jamais bloqué » (AGENTS.md).
  const capital = config?.capitalDeDepart;
  if (typeof capital !== 'number' || !Number.isFinite(capital) || capital <= 0) {
    throw new Error('creerJoueur : le capital de départ doit être un nombre fini strictement positif');
  }

  return {
    pseudo: validerPseudo(infos.pseudo),
    birthDate: validerDateNaissance(infos.dateNaissance, maintenant),
    balance: capital,
    bestBalance: capital,
    xp: 0,
    level: NIVEAU_DE_DEPART,
    unlockedGames: jeuxDeDepart(jeux),
    role: 'player',
  };
}

/**
 * Crée le profil du joueur : construit le joueur avec creerJoueur, puis
 * l'enregistre dans l'état en une seule écriture (updateState, #139).
 * `pseudo` et `birthDate` sont ajoutés à l'état et visibles via getState().
 *
 * @param {{ pseudo: string, dateNaissance?: string|null }} infos - Informations
 *   saisies par le joueur.
 * @param {object} [options] - Dépendances injectables (tests, réglage admin).
 * @param {{ getState: function(): object,
 *   updateState: function(function(object): object): object }} [options.stockage] -
 *   Accès à l'état (état réel du Core par défaut).
 * @param {{ capitalDeDepart: number }} [options.config] - Configuration du joueur.
 * @param {Object<string, { id: string, unlockLevel: number }>} [options.jeux] - Jeux.
 * @param {Date} [options.maintenant] - Date du jour.
 * @returns {object} Copie de l'état enregistré.
 * @throws {Error} Si les informations, la configuration ou l'écriture échouent.
 */
export function creerProfil(
  infos,
  {
    stockage = { getState, updateState },
    config = PLAYER_CONFIG,
    jeux = GAMES,
    maintenant = new Date(),
  } = {},
) {
  const joueur = creerJoueur(infos, { config, jeux, maintenant });
  verifierPartieNeuve(stockage.getState(), joueur);
  // Revérifié sur l'état transmis par updateState : la décision et
  // l'écriture portent sur le même état.
  return stockage.updateState((courant) => {
    verifierPartieNeuve(courant, joueur);
    return { ...courant, ...joueur };
  });
}

/**
 * Vérifie que le profil peut être créé sans écraser une partie : aucun
 * profil existant, aucune partie jouée, et un meilleur solde qui ne baisse
 * pas (updateState l'interdit).
 *
 * @param {object} etat - État courant.
 * @param {{ bestBalance: number }} joueur - Joueur à enregistrer.
 * @returns {void}
 * @throws {Error} Si un profil existe, si une partie a déjà été jouée ou si
 *   le capital est inférieur au meilleur solde de l'état.
 */
function verifierPartieNeuve(etat, joueur) {
  if (etat.pseudo !== undefined) {
    throw new Error('creerProfil : un profil existe déjà (plusieurs profils : tâche n°5)');
  }
  if (etat.xp > 0 || etat.level > 1 || etat.history.length > 0) {
    throw new Error(
      'creerProfil : une partie a déjà été jouée, le profil ne peut pas écraser sa progression',
    );
  }
  if (joueur.bestBalance < etat.bestBalance) {
    throw new Error(
      `creerProfil : le capital (${joueur.bestBalance}) est inférieur au meilleur solde ` +
        `de l'état (${etat.bestBalance}), qui ne peut pas baisser`,
    );
  }
}
