# Conception — Création d'un nouveau joueur (G1, tâche n°3, #133)

## Objectif

Fournir au Core une fonction qui construit un **nouveau joueur valide**, avec le capital de départ lu dans la configuration, prêt à être enregistré dans l'état.

## Non-objectifs

- **Aucune écriture** dans l'état ni dans `localStorage` : la fonction est pure. L'enregistrement relève de l'état réel (n°1) et du branchement (n°8, @ahmed-abc73).
- **Aucun écran** de création de profil : c'est le G4.
- **Pas de réglage du capital par l'admin** (setter, vérification du rôle) : tâches n°21 et n°24.
- **Pas d'exposition** dans `core.js` / `coreService.js` : elle passe par @ahmed-abc73 (n°6).
- Aucun fichier d'un autre membre n'est modifié.

## Conception

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `src/core/config/player.config.js` | Configuration du joueur : `capitalDeDepart` (1000 par défaut, glossaire d'`AGENTS.md`) |
| `src/core/player.js` | Validation des entrées et construction du joueur |
| `tests/unit/player.test.js` | Tests unitaires (`node:test`) |

### Fonctions de `src/core/player.js`

| Fonction | Rôle | Erreur levée |
|---|---|---|
| `validerPseudo(pseudo)` | Renvoie le pseudo sans espaces superflus | si ce n'est pas une chaîne, ou si elle est vide |
| `validerDateNaissance(date, maintenant)` | Renvoie la date au format `AAAA-MM-JJ`, ou `null` si elle n'est pas fournie | si le format est invalide, si la date n'existe pas (ex. 31 avril), si elle est dans le futur, ou si la date du jour fournie est invalide |
| `jeuxDeDepart(jeux)` | Identifiants des jeux débloqués au niveau 1, dans l'ordre de `GAMES` | si la liste des jeux est invalide |
| `creerJoueur(infos, options)` | Construit le joueur complet | si les informations ne sont pas un objet (ou sont un tableau), ou si une entrée ou la configuration est invalide |

### Joueur produit

Même forme que `player` dans le schéma de `casino_state` (`state.js`) et que `player.mock.js` du G4 :

```js
{
  pseudo: 'alice',          // validé, sans espaces superflus
  birthDate: '2000-05-17',  // ou null
  balance: 1000,            // capital de départ lu dans la config
  bestBalance: 1000,        // égal au capital au départ
  xp: 0,
  level: 1,
  unlockedGames: ['slots', 'dice'],  // jeux de niveau 1, déduits de GAMES
  role: 'player',
}
```

## Décisions

| Décision | Pourquoi |
|---|---|
| Capital dans `config/player.config.js` | Règle 4 d'`AGENTS.md` : aucune valeur de réglage en dur. Le défaut 1000 vient du glossaire d'`AGENTS.md`. |
| Configuration et liste des jeux **injectables** (`options.config`, `options.jeux`) | Tester sans dépendre des valeurs par défaut, et permettre au réglage admin (n°21, n°24) de fournir d'autres valeurs plus tard. |
| Jeux de départ **déduits de `GAMES`** | Pas de liste en dur : si les niveaux de déblocage changent (n°21), les jeux de départ suivent. |
| `maintenant` injectable pour la date | Tests déterministes : la date du jour n'influence pas les tests. |
| Capital : nombre fini **strictement positif** | Un capital nul ou négatif bloquerait le joueur dès le départ, ce qu'interdit l'invariant « un joueur n'est jamais bloqué ». |
| Rôle toujours `player` | Un nouveau joueur n'est ni modérateur ni admin ; ces rôles s'attribuent ailleurs. |
| Erreurs `Error` avec message en français | Cohérent avec `rng.js` et le contrat des cartes. |

## Points ouverts (non tranchés ici)

- **Règles exactes du pseudo** (longueur, caractères autorisés) : absentes des fichiers du projet. Seule une validation minimale est appliquée (chaîne non vide).
- **Âge minimum** : non défini dans `AGENTS.md`. Aucune restriction d'âge n'est appliquée.
- **Capital entier ou décimal** : la règle d'arrondi des jetons est ouverte (#73). Seul un nombre fini > 0 est exigé.

## Risques

- La forme de l'état peut évoluer (format plat ou `player`, plusieurs joueurs : n°5). Le joueur produit reprend les noms de champs du schéma ; le branchement (n°8) l'adaptera si besoin.
- `GAMES` est importé en lecture seule depuis `config/games.config.js` (fichier de @nafiamedreda) ; il n'est pas modifié.
- La date du jour est comparée en **UTC** : entre minuit et 2h (heure de Paris), une personne née le jour même serait refusée. Cas rare, documenté plutôt que corrigé tant qu'aucune règle de fuseau horaire n'est fixée.

## Écarts relevés en relecture (corrigés)

| Défaut | Correction |
|---|---|
| Une année antérieure à 100 (`0050-01-01`) était déclarée inexistante (`Date.UTC` lit 0 à 99 comme 1900+) | `setUTCFullYear`, test de régression |
| Une date du jour invalide produisait une erreur peu claire (`Invalid time value`) | Message explicite, test de régression |
| Un tableau passé comme informations était refusé avec une erreur sur le pseudo | Refus explicite « informations », test de régression |

## Plan de tests

Commande : `npm test` (fichier `tests/unit/player.test.js`).

| `describe` / `it` | Avant implémentation | Après |
|---|---|---|
| `player.config` — fournit un capital de départ de 1000 par défaut | échec (module absent) | succès |
| `validerPseudo` — renvoie le pseudo sans espaces superflus | échec | succès |
| `validerPseudo` — rejette une valeur non chaîne ou vide | échec | succès |
| `validerDateNaissance` — accepte une date valide et renvoie `null` si absente | échec | succès |
| `validerDateNaissance` — rejette un format invalide, une date inexistante, une date future | échec | succès |
| `validerDateNaissance` — traite les années antérieures à 100 et rejette une date du jour invalide | échec | succès |
| `jeuxDeDepart` — renvoie les jeux de niveau 1 dans l'ordre de `GAMES` | échec | succès |
| `jeuxDeDepart` — suit une liste de jeux injectée et rejette une liste invalide | échec | succès |
| `creerJoueur` — construit un joueur complet avec le capital de la config | échec | succès |
| `creerJoueur` — utilise un capital injecté et rejette un capital invalide | échec | succès |
| `creerJoueur` — renvoie des objets indépendants à chaque appel | échec | succès |

## Suite : capital de départ réglable par l'admin (#207)

Demande de @Kardiatou102 (G4, page Admin) dans la discussion #9. `AGENTS.md` prévoit que l'admin peut « ajuster le capital de départ ».

### Conception

Même modèle que les niveaux de déblocage réglables d'Ania (n°21, `config/unlock.config.js`), dans `src/core/config/player.config.js` :

| Fonction | Rôle |
|---|---|
| `createPlayerConfigMemoryStore(initial)` | Stockage en mémoire `{ read, write }`, en attendant le branchement sur `casino_state` (n°8) |
| `createPlayerConfig(store)` | Configuration du joueur sur un stockage injecté |
| `getCapitalDeDepart()` | Capital réglé par l'admin, sinon le défaut de `PLAYER_CONFIG` (1000) |
| `getPlayerConfig()` | `{ capitalDeDepart }`, à passer à `creerJoueur(infos, { config })` |
| `setCapitalDeDepart(montant)` | Règle le capital ; tout est validé avant l'écriture |

Le stockage ne contient que ce que l'admin a réglé (`{ capitalDeDepart }` ou `{}`).

### Décisions

| Décision | Pourquoi |
|---|---|
| Même modèle que n°21 (stockage injecté `read` / `write`) | Cohérence dans le Core ; branchement commun à la n°8. |
| Capital : nombre fini **strictement positif** | Même règle que `creerJoueur` : un capital nul bloquerait le nouveau joueur. |
| Valeur invalide refusée **sans écriture** | L'admin ne peut pas laisser une config cassée. |
| Contenu du stockage validé à chaque lecture | Un stockage corrompu est signalé plutôt que de créer des joueurs faux. |
| Seuls les **nouveaux** joueurs sont concernés | `creerJoueur` lit le capital à la création ; les soldes existants ne changent pas (solde et progression indépendants). |
| `PLAYER_CONFIG` reste figée | Le défaut ne change jamais ; seule la valeur réglée est stockée. |

### Hors périmètre

Vérification du rôle admin (n°24, @Amina1203) ; enregistrement dans `casino_state` (n°8) et exposition dans `coreService` (@ahmed-abc73) ; écran Admin (G4). Aucun capital maximum n'est imposé (non défini dans le projet).

### Plan de tests

Commande : `npm test` (fichier `tests/unit/player.config.test.js`).

| `describe` / `it` | Avant implémentation | Après |
|---|---|---|
| `createPlayerConfigMemoryStore` — lit une copie de la valeur stockée et la remplace à l'écriture | échec | succès |
| `createPlayerConfig` — rejette un stockage sans `read` / `write` ou au contenu invalide | échec | succès |
| `getCapitalDeDepart` — renvoie le défaut (1000) sans réglage, sinon la valeur réglée | échec | succès |
| `setCapitalDeDepart` — enregistre et renvoie le nouveau capital | échec | succès |
| `setCapitalDeDepart` — rejette un capital invalide sans rien écrire | échec | succès |
| `getPlayerConfig` — `creerJoueur` crée un joueur avec le capital réglé | échec | succès |
| `getPlayerConfig` — fonctionne aussi appelée seule (sans `this`) et renvoie une copie | échec | succès |
