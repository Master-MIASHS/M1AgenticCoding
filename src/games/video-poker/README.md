# Vidéo Poker — règles et intégration

Cette note décrit l’interface produite par le Groupe 2 pour aider G3 à préparer
le rendu. Les règles métier vivent dans `rules.js`; le mélange, le Core et le
rendu visuel restent hors de ce module. Ce fichier complète les contrats du
projet, il ne les remplace pas.

## Variante et paiements

La variante retenue pour cette tâche G2 est **Jacks or Better**. Les valeurs
ci-dessous sont des multiplicateurs de retour **mise incluse**, pour une mise
de référence; il n’y a pas de bonus de mise maximale :

| Catégorie `evaluatePokerHand()` | Main | Multiplicateur |
| ---: | --- | ---: |
| 10 | Quinte royale | 250 |
| 9 | Quinte flush | 50 |
| 8 | Carré | 25 |
| 7 | Full | 9 |
| 6 | Couleur | 6 |
| 5 | Quinte | 4 |
| 4 | Brelan | 3 |
| 3 | Double paire | 2 |
| 2 | Paire de valets ou mieux | 1 |
| 1 | Carte haute | 0 |

La paytable vient obligatoirement de la configuration, elle n’est pas intégrée
aux règles :

```js
{
  paytable: {
    10: 250,
    9: 50,
    8: 25,
    7: 9,
    6: 6,
    5: 4,
    4: 3,
    3: 2,
    2: 1
  }
}
```

Les catégories absentes de la table paient `0`. `evaluatePokerHand()` regroupe
toutes les paires sous la catégorie `2`; la règle ne verse donc le multiplicateur
de cette catégorie que si le premier `tiebreaker` vaut au moins `11` (valet,
dame, roi ou as). Une paire plus basse paie `0`.

Le résultat respecte la forme Core `{ outcome, multiplier, details }`.
`multiplier` inclut la mise : une valeur supérieure à `1` donne `win`, `1`
donne `push` (mise rendue, aucun gain net) et `0` donne `loss`.

## Déroulement et actions

1. L’appelant fait démarrer la partie via `createGame.start(bets)`. Le callback
   de tirage de l’orchestrateur fournit ensuite le paquet déjà mélangé à
   `videoPokerRules.start(shuffledDeck, { bets, config })`, qui distribue les
   cinq premières cartes et démarre la session.
2. `availableActions` contient `hold-0` à `hold-4`, puis `draw`.
3. Une action `hold-i` bascule la conservation de la carte à l’index `i` (index
   zéro-based, de gauche à droite). Elle ne pioche aucune carte et ne termine
   pas la manche.
4. `draw` remplace, dans leur position d’origine, les cartes non conservées,
   puis termine la manche et produit `gameResult`.

Chaque session possède son propre paquet et curseur. G3 envoie une action au
moyen de `createGame.action(sessionId, playerAction)`; les règles copient les
cartes reçues, n’utilisent aucun hasard et ne modifient pas les entrées. Si la
pioche ne contient pas assez de cartes, elles lèvent une `RangeError`.

## Données destinées au rendu

`videoPokerRules.view({ phase, session, gameResult })` fournit une vue publique
filtrée :

- pendant `playing` : `{ hand, held }`, avec cinq cartes `{ rank, suit }` et
  cinq booléens indiquant les cartes gardées ;
- pendant `result` : `{ hand, held, result }`, où `result` contient
  `{ outcome, multiplier, category, tiebreakers }`.

La vue ne contient ni le paquet restant, ni son curseur, ni la paytable. `hand`
reste dans l’ordre des cinq positions visuelles. Les noms de couleurs sont
`hearts`, `diamonds`, `clubs` et `spades`; les rangs vont de `2` à `10`, puis
`J`, `Q`, `K`, `A`.

L’orchestrateur appelle désormais `rules.view()` (PR #168 fusionnée) et place
son retour dans `renderPayload.view`; quand cette fonction existe, le paquet
brut et la session privée ne sont pas envoyés. G3 doit afficher `view`, et non
chercher des cartes dans `renderPayload.raw`. Les tests d’intégration vérifient
que le paquet restant n’apparaît pas dans la réponse.

## Frontière Core / règles

Le module `rules.js` ne dépend ni du Core, ni de `coreService`, ni de l’UI. Au
démarrage, `drawVideoPoker` construit un paquet via `buildDeck(1)` et demande
son mélange au Core public avec `melanger`. Pendant les actions, il renvoie
`null` : les règles utilisent le shoe et le curseur privé de session via
`createShoe` / `draw`, sans redemander de hasard. Les tests d’intégration
injectent un mélange déterministe au lieu d’appeler le RNG réel.

Le constructeur commun est disponible dans `src/games/deck.js` (PR #169
fusionnée), et `melanger` est exposée par la façade `coreService` (PR #115
fusionnée). La règle ne dépend directement d’aucun fichier du Core.
