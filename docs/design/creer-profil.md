# Conception — Créer le profil du joueur dans l'état (G1, #226)

Suite de la création d'un nouveau joueur (n°3, `docs/design/nouveau-joueur.md`).

## Objectif

Permettre au G4 de **créer le profil du joueur** (écran de création) : le joueur construit par `creerJoueur` est enregistré dans l'état du Core, et son `pseudo` devient visible dans `getState()`.

## Non-objectifs

- **Aucune modification de `state.js`** (fichier d'@ahmed-abc73, n°27 en cours par Ania) : l'état accepte déjà des champs supplémentaires.
- **Pas de profils multiples** (n°5) : un seul profil, créé sur une partie neuve.
- Pas d'écran (G4).

## Conception

| Élément | Rôle |
|---|---|
| `creerProfil(infos, options)` dans `src/core/player.js` | Construit le joueur avec `creerJoueur`, puis l'enregistre en **une seule écriture `updateState`** |
| `core.js` / `coreService.js` | Exposent `creerProfil` (une ligne chacun) |
| Skill `utiliser-core` | Section `creerProfil` (#163) |

`options.stockage` (`{ getState, updateState }`) est injectable pour les tests ; par défaut, c'est l'état réel du Core. `options.config`, `options.jeux` et `options.maintenant` sont transmis à `creerJoueur`.

### État après création

Les champs du joueur remplacent ceux de l'état ; `pseudo` et `birthDate` sont ajoutés ; `history` reste vide.

## Décisions

| Décision | Pourquoi |
|---|---|
| Création **uniquement sur une partie neuve** (pas de `pseudo`, XP 0, niveau 1, historique vide) | Ne jamais écraser une progression : l'XP et le niveau ne redescendent jamais. Plusieurs profils = n°5. |
| Refus si un profil existe déjà | Un seul profil tant que la n°5 n'est pas faite. |
| Une seule écriture `updateState` | Tout ou rien (#139) ; `updateState` garde ses garanties. |
| `restoreState` n'est pas utilisé | Il est réservé à la restauration d'une sauvegarde (skill `utiliser-core`). |
| `state.js` non modifié | Pas de conflit avec la n°27 (Ania) ni la n°4 (Ahmed). |
| Erreurs `Error` avec message en français | Cohérent avec `player.js`. |

## Limite connue

`updateState` interdit de baisser le meilleur solde. Le meilleur solde de l'état par défaut vaut 1000 (`state.js`) : si l'admin règle un capital inférieur (n°39), la création est refusée avec un message clair. À trancher avec @ahmed-abc73 : valeurs par défaut de l'état lues dans la config, ou profils multiples (n°5).

## Plan de tests

Commande : `npm test` (fichier `tests/unit/creer-profil.test.js`).

| `describe` / `it` | Avant implémentation | Après |
|---|---|---|
| `creerProfil` — enregistre le joueur sur une partie neuve, en une seule écriture | échec | succès |
| `creerProfil` — renvoie l'état enregistré, avec le `pseudo` lisible via `getState` | échec | succès |
| `creerProfil` — propage une erreur de validation du joueur, sans écriture | échec | succès |
| `creerProfil` — refuse si un profil existe déjà, sans écriture | échec | succès |
| `creerProfil` — refuse si une partie a déjà été jouée (XP, niveau ou historique), sans écriture | échec | succès |
| `creerProfil` — refuse clairement un capital inférieur au meilleur solde de l'état | échec | succès |
| `creerProfil` — fonctionne avec le vrai état du Core (`state.js`) | échec | succès |
| `coreService` — expose `creerProfil` | échec | succès |

## Correction de la relecture #227

La façade `creerProfil(infos)` n’accepte pas les dépendances injectées du module
interne `player.js`. Ces injections restent utilisables dans les tests internes.
La création refuse aussi un solde/meilleur solde différent du capital initial,
un rôle différent de celui d’un nouveau joueur, des jeux différents ou un
inventaire non vide. Un état avec le même ensemble de jeux dans un autre ordre
reste accepté. La garde est toujours vérifiée à l’intérieur de la transaction.
Une configuration interne différente doit correspondre à l’état initialisé :
la création de profil n’est pas une opération de modification du capital.
La configuration administrable partagée et l’attachement d’une identité à une
partie déjà utilisée restent des intégrations séparées.
