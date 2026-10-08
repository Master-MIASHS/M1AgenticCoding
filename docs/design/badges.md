# Conception — Badges du joueur (G1, tâche n°33, #272)

## Objectif

Attribuer au joueur les **badges** définis par `AGENTS.md` (« trophée affiché au classement »), avec la progression vers chacun, pour que le G4 les affiche au classement et sur le profil.

## Non-objectifs

- **Aucun badge inventé** : seuls les deux exemples d'`AGENTS.md` sont définis par défaut. D'autres badges = décision du G5 (contenu), ajoutés dans la configuration.
- Affichage : G4. Classement réel : n°18 (@nafiamedreda).
- Écrire le compteur de faillites : `play()` (#131, @Amina1203).
- Aucune modification de `state.js`, `economy.js` ni `progression.js`.

## Conception

### Définitions (`src/core/config/badges.config.js`)

| `id` | `nom` (texte d'`AGENTS.md`) | `compteur` | `seuil` |
|---|---|---|---|
| `parties-1000` | 1000 parties jouées | `partiesJouees` | 1000 |
| `faillites-5` | A survécu à la faillite 5 fois | `faillites` | 5 |

### Compteurs du joueur

| Compteur | Source |
|---|---|
| `partiesJouees` | Nombre d'entrées de `history` (format #266) |
| `faillites` | Champ `faillites` de l'état : nombre de fois où le solde est tombé à 0 (glossaire : « Faillite : solde tombé à 0 »). **Pas encore écrit** : vaut 0 tant que `play()` ne l'incrémente pas (#131) |

Un joueur n'est jamais bloqué à 0 (bonus quotidien) : chaque faillite est donc « survécue ».

### Fonctions (`src/core/badges.js`)

| Fonction | Rôle |
|---|---|
| `validerDefinitionsBadges(definitions)` | Vérifie les définitions (identifiants uniques, compteur connu, seuil entier ≥ 1) |
| `calculerBadges(compteurs, definitions)` | Fonction pure → `[{ id, nom, obtenu, actuel, seuil }]` dans l'ordre des définitions |
| `compteursDuJoueur(etat)` | Compteurs à partir de l'état |
| `getBadges()` | Badges du joueur courant ; exposée par `core.js` → `coreService` |

`actuel` est plafonné au seuil (progression d'affichage) ; `obtenu` vaut `actuel >= seuil`.

## Décisions

| Décision | Pourquoi |
|---|---|
| Deux badges seulement, textes d'`AGENTS.md` | Règle 10 : ne rien inventer ; le contenu des badges n'est pas une décision du G1. |
| Définitions dans la configuration | Règle 4 : seuils non écrits en dur ; d'autres badges s'ajoutent sans changer le code. |
| Compteur de faillites dans l'état, écrit par `play()` | L'historique ne contient pas le solde après chaque partie : impossible de reconstituer les faillites. |
| Progression renvoyée (`actuel`, `seuil`) | Le G4 peut afficher « 12 / 1000 » sans recalculer. |
| Badges recalculés à chaque lecture | Pas de stockage supplémentaire : un badge ne peut pas être perdu tant que les compteurs ne baissent pas. |

## Risques

- Si l'historique est un jour tronqué, `partiesJouees` devra venir d'un compteur dédié dans l'état.
- Le badge « faillite » reste à 0 tant que #131 n'écrit pas `faillites`.

## Plan de tests

Commande : `npm test` (fichier `tests/unit/badges.test.js`).

| `it` | Avant | Après |
|---|---|---|
| config : les deux badges d'`AGENTS.md`, figés | échec | succès |
| valide les définitions (id unique, compteur connu, seuil entier ≥ 1) | échec | succès |
| `calculerBadges` : non obtenu sous le seuil, obtenu au seuil, progression plafonnée | échec | succès |
| `calculerBadges` : compteur absent → 0 ; compteur invalide → erreur | échec | succès |
| `compteursDuJoueur` : parties = longueur de l'historique, faillites = champ de l'état ou 0 | échec | succès |
| `getBadges()` via `coreService` sur le vrai état | échec | succès |
