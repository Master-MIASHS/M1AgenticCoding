# Conception — Jeux débloqués et historique réels (G1, #344)

## Objectif

Remplacer les deux dernières lectures factices de `src/core/progression.js` (#292) :

- `getUnlockedGames()` renvoyait la liste de départ, donc aucun jeu ne se débloquait en montant de niveau ;
- `getHistory()` renvoyait toujours `[]`.

## Non-objectifs

- Écrire dans l'état : ce sont des **lectures**. `play()` (#287) et l'ajustement admin (#324) remplissent `history`.
- Seuils réglés par l'admin : instance partagée de #315 (Ania). Ici, les seuils par défaut de `GAMES`.
- Refuser un jeu verrouillé dans `play()` (#292, point 4) : traité à part.

## Conception

| Fonction | Calcul |
|---|---|
| `getUnlockedGames()` | `calculateUnlockedGames(getLevel(), seuils de GAMES, state.unlockedGames)` (#263) |
| `getHistory()` | `structuredClone(state.history)` |

- **Niveau effectif** : `getLevel()`, qui conserve les acquis (le niveau ne baisse jamais).
- **Acquis permanents** : les jeux déjà dans `state.unlockedGames` restent toujours listés, même si un seuil augmente ou si l'identifiant n'est plus dans `GAMES`. Un joueur ruiné garde ses jeux (AGENTS.md).
- **Ordre** : acquis d'abord, puis nouveaux jeux dans l'ordre de `GAMES` (ordre de `calculateUnlockedGames`).
- **Historique** : entrées dans l'ordre d'enregistrement. Les parties n'ont pas de `type` ; les ajustements de l'admin ont `type: 'ADMIN_ADJUSTMENT'` (#324). Copie indépendante : modifier le résultat ne touche pas l'état.

## Décisions

| Décision | Pourquoi |
|---|---|
| Calcul à la lecture, sans écriture | Une lecture ne doit jamais écrire ; `play()` reste la seule écriture d'une partie |
| Réutiliser `calculateUnlockedGames` (#263) | Le calcul existe et est testé ; pas de double logique |
| Seuils de `GAMES` en attendant #315 | Valeurs de configuration (règle 4), remplacées par les seuils effectifs quand l'instance partagée sera exposée |

## Tests

`tests/unit/lectures-progression.test.js` (via `coreService`, vrai état) : jeux de départ au niveau 1, jeux débloqués aux niveaux 3, 8 et 12, acquis conservés, aucune écriture ; historique vide, ordre conservé, copie indépendante.
