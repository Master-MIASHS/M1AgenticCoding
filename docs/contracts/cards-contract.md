# Contrat Cartes — Core (G1) ↔ Jeux (G2)

| | |
|---|---|
| **Ticket** | #70 |
| **Décision** | Option A — le G2 construit le paquet, le Core le mélange sans connaître les cartes |
| **Validé par** | G2 (@Donia-alfonsi, 28/09) · G5 (@ArthY07, 28/09) — discussion sur #70 |
| **Dépend de** | PR #28 (`melanger()` dans `src/core/rng.js`) · PR #67 (`src/games/cardUtils.js`) · exposition de `melanger` dans `core.js` / `coreService.js` (G1, @ahmed-abc73) |

Toute évolution de ce contrat passe par une issue adressée au G1 et au G5 (règle 6 de `AGENTS.md`).

## 1. Format d'une carte

Une carte est un objet :

```js
{ rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A',
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' }
```

- Les valeurs sont des **chaînes**, y compris `'10'`.
- Ce format appartient au **G2** : il est défini et validé dans `src/games/cardUtils.js`. Le Core ne le lit jamais.

## 2. Fonction d'appel

```js
import { melanger } from '<chemin>/services/coreService.js';

melanger(liste) // -> nouveau tableau, mêmes éléments, ordre aléatoire
```

Répartition des rôles (Option A) :

1. **G2** construit le paquet : `52 × deckCount` cartes à partir de ses `RANKS` / `SUITS` (1 paquet, sabot de 2 paquets pour le blackjack, etc.).
2. **G2** appelle `melanger(paquet)` via `coreService` — jamais en important `src/core/` directement.
3. **G2** garde le paquet mélangé et un curseur de pioche. Piocher la carte suivante ne demande **aucun** nouveau hasard.
4. Quand le paquet est épuisé (ou à chaque nouvelle main, selon les règles du jeu), **G2** rappelle `melanger()`.

Le Core ne conserve **aucun état de paquet** et ne connaît aucune règle de jeu.

## 3. Garanties de `melanger(liste)`

| Garantie | Détail |
|---|---|
| Liste d'origine intacte | `liste` n'est jamais modifiée : un nouveau tableau est renvoyé. |
| Permutation exacte | Même longueur ; chaque élément apparaît exactement une fois (aucune perte, aucun doublon). |
| Mélange non biaisé | Algorithme de Fisher-Yates : toutes les permutations sont équiprobables. |
| Générique | Accepte n'importe quel tableau (nombres, objets…) ; aucune validation du contenu. |
| Copie superficielle | Les objets carte ne sont **pas** clonés : le tableau renvoyé contient les mêmes références. Le G2 ne doit pas modifier une carte après l'avoir mise dans un paquet. |
| Source de hasard unique | Le hasard vient uniquement de `src/core/rng.js` (jamais `Math.random()`). |

Cas limites : `melanger([])` renvoie `[]` ; une liste d'un seul élément est renvoyée telle quelle (dans un nouveau tableau).

## 4. Erreurs possibles

| Situation | Comportement |
|---|---|
| `liste` n'est pas un tableau (chaîne, objet, `null`, `undefined`…) | `Error` : `melanger : liste doit être un tableau` |
| Carte mal formée dans le paquet | **Aucune** erreur côté Core (contenu non inspecté). La validation est faite par le G2 : les fonctions de `cardUtils.js` lèvent une `TypeError`. |

## 5. Reproductibilité (tests uniquement)

- `semer(graine)` rend `melanger()` (et tous les tirages du Core) reproductible ; `semer(null)` rétablit le hasard normal.
- `semer()` reste **interne au Core** et n'est **pas** exposé via `coreService` : sinon n'importe quel écran pourrait fixer la graine et prédire les résultats (triche).
- Les tests importent `src/core/rng.js` directement pour l'utiliser, et appellent `semer(null)` à la fin.

## 6. Test de conformité (à écrire)

Pris en charge par le G1 avec le G5 (répartition en cours dans la discussion G1 #9), une fois les PR #28 et #67 fusionnées. Il doit vérifier :

- paquet de 1 et de 2 jeux construit avec les `RANKS` / `SUITS` du G2, puis mélangé par `melanger()` ;
- le paquet mélangé contient les `52 × deckCount` cartes attendues, sans perte ni doublon ;
- des mains tirées de ce paquet passent dans `blackjackTotal`, `baccaratTotal` et `evaluatePokerHand` sans `TypeError`.

## 7. Qui fait quoi

| Groupe | Responsabilité |
|---|---|
| G1 — Core | `melanger()` et ses garanties ; exposition via `coreService` ; `semer()` réservé aux tests |
| G2 — Jeux | Format des cartes, construction du paquet, pioche, règles et évaluation des mains |
| G5 — Qualité | Validation de ce contrat et du test de conformité |
