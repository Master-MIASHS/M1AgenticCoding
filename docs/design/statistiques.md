# Conception — Statistiques globales (G1, tâche n°23, #270)

## Objectif

Remplacer les zéros fictifs de `getGlobalStats()` par des statistiques **calculées à partir de l'historique des parties** de l'état, sans changer la forme lue par le G4 (`Statistics.jsx`, `Admin.jsx`).

## Non-objectifs

- Écrire l'historique : c'est `play()` (#131, @Amina1203), avec le format préparé dans #266 (@nafiamedreda).
- Écrans : G4. Plusieurs profils : n°5.
- Aucune modification de `config/games.config.js` (fichier de @nafiamedreda) : seul l'export de `core.js` change de source.

## Conception

`src/core/stats.js` (nouveau) :

| Fonction | Rôle |
|---|---|
| `calculerStatistiques(historique)` | Fonction pure : statistiques d'une liste d'entrées d'historique |
| `getGlobalStats()` | Calcule sur `getState().history` ; exposée par `core.js` → `coreService` |

Entrée d'historique utilisée (format #266) : `{ gameId, bet, payout, … }`. Les autres champs sont ignorés.

### Résultat

```js
{
  totalPlays: 3,          // nombre de parties
  totalWagered: 60,       // somme des mises
  totalWon: 70,           // somme des montants reversés aux joueurs (mise incluse)
  activePlayers: 1,       // 1 si au moins une partie, sinon 0 (un seul profil)
  byGame: { roulette: { plays: 2, wagered: 50, won: 70 }, slots: { plays: 1, wagered: 10, won: 0 } },
  mostPlayed: ['roulette', 'slots'], // jeux triés par nombre de parties
}
```

## Décisions

| Décision | Pourquoi |
|---|---|
| Mêmes quatre champs, même sens qu'avant | Le G4 les affiche déjà : aucun changement côté UI. |
| `totalWon` = total reversé (`payout`, mise incluse) | Comparable à `totalWagered` : la différence est l'avantage de la maison. |
| `byGame` et `mostPlayed` en plus | « Jeux les plus joués » attendu pour les statistiques ; champs ajoutés sans casser l'existant. |
| Égalité de parties : ordre alphabétique de l'identifiant | Résultat stable et testable. |
| Montants arrondis une seule fois au centime | Même règle que le règlement (`calculateSettlement`). |
| Entrée invalide → erreur claire | Un historique corrompu est signalé plutôt que de produire de faux chiffres. |
| `activePlayers` : 0 ou 1 | Un seul profil aujourd'hui ; avec la n°5, nombre de profils ayant joué. |

## Risques

- Toutes les valeurs restent à 0 tant que `play()` n'enregistre pas l'historique (#131).
- Le texte « données simulées » de `Statistics.jsx` est au G4.

## Plan de tests

Commande : `npm test` (fichier `tests/unit/stats.test.js`).

| `it` | Avant | Après |
|---|---|---|
| historique vide : tout à 0, `byGame` vide, `mostPlayed` vide | échec | succès |
| compte les parties, somme les mises et les montants reversés | échec | succès |
| arrondit les sommes au centime | échec | succès |
| `activePlayers` vaut 1 dès qu'une partie existe | échec | succès |
| détaille par jeu et trie les jeux les plus joués (égalités par identifiant) | échec | succès |
| rejette un historique ou une entrée invalide | échec | succès |
| `getGlobalStats()` via `coreService` lit l'historique de l'état | échec | succès |
