# Conception — Classement (G1, #327)

## Objectif

Remplacer les joueurs fictifs de `getLeaderboard()` (`alice`, `bob`) par un classement **calculé à partir de l'état du joueur**, avec la forme cible d'AGENTS.md : pseudo, meilleur solde, niveau, badges obtenus (#273).

## Non-objectifs

- Profils multiples (n°5) : pas encore faits. Le classement contient le **joueur courant** seulement.
- Affichage : G4 (`Leaderboard.jsx`).
- `progression.js` (Reda, Ahmed) ne change pas : seul l'export de `core.js` change de source, comme `getGlobalStats` (#271).

## Conception

`src/core/leaderboard.js` (nouveau) :

| Fonction | Rôle |
|---|---|
| `entreeDeClassement(etat)` | Pure : `{ pseudo, bestBalance, balance, level, badges }` d'un état de joueur ; `badges` = badges obtenus `[{ id, nom }]` via `calculerBadges(compteursDuJoueur(etat))` |
| `calculerClassement(profils)` | Pure : entrées triées par `bestBalance` décroissant, puis `level` décroissant, puis `pseudo` |
| `getLeaderboard()` | `calculerClassement([getState()])`, exposée par `core.js` → `coreService` |

```js
getLeaderboard();
// → [{ pseudo: 'Olti', bestBalance: 1250, balance: 800, level: 3, badges: [] }]
```

## Décisions

| Décision | Pourquoi |
|---|---|
| Tri par `bestBalance` | AGENTS.md : « Le meilleur solde atteint est le score du classement ». |
| `balance` gardé dans l'entrée | `Leaderboard.jsx` lit `balance` aujourd'hui : la page continue de fonctionner, le G4 passe ensuite à `bestBalance`. |
| `pseudo: null` si aucun profil n'est créé | Ancienne sauvegarde sans pseudo : la page affiche déjà « Joueur Fantôme » (#253 : une sauvegarde sans pseudo est un joueur existant). |
| Fonction pure sur une liste de profils | Réutilisable telle quelle avec les profils multiples (n°5, tâche n°18 de Reda). |
| Copies neuves | L'appelant ne peut pas modifier l'état en modifiant le classement. |
| Égalités : niveau puis pseudo (`localeCompare`) | Ordre stable et identique d'un appel à l'autre. |

## Tests

- `tests/unit/leaderboard.test.js` : entrée d'un état, sans pseudo, tri et égalités, copies neuves, liste invalide.
- `tests/unit/leaderboard.core.test.js` : via `coreService`, plus d'`alice`/`bob`, joueur courant reflété après une écriture d'état.
