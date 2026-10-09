# Memory casino — règles et intégration

Cette note décrit le contrat G2 proposé pour le Memory casino. Le jeu suit le
principe classique des paires : G2 décide des règles et du résultat ; G3
affiche le plateau et les animations. Ce document ne remplace pas le contrat
G2/G3.

## Règles d'une partie

- Le plateau contient 16 cartes, soit huit symboles de casino en deux
  exemplaires. G2 fournit ces identifiants : `chip`, `card`, `dice`,
  `roulette-wheel`, `slot-machine`, `horseshoe`, `bell` et `jackpot`.
- Deux cartes sont révélées par tour. Une paire trouvée reste face visible.
- Une paire manquée reste visible jusqu'à l'action `continue`, envoyée par G3
  après l'animation.
- La partie prend fin dès que les huit paires sont trouvées ou que 16 tours
  sont utilisés. Une paire trouvée au seizième tour compte comme une réussite.
- Une mise unique est réglée par le Core à la fin. La configuration doit
  fournir `paytable` avec un multiplicateur mise incluse pour chaque réussite
  de 8 à 16 tours. Une partie non terminée dans la limite paie `0`.

Exemple de forme attendue par les règles (valeurs illustratives uniquement) :

```js
{
  paytable: {
    8: 20,
    9: 19,
    10: 18,
    11: 17,
    12: 16,
    13: 15,
    14: 14,
    15: 13,
    16: 12
  }
}
```

Les nombres ci-dessus illustrent seulement le schéma ; aucun multiplicateur
par défaut n'est fourni par les règles.

## Actions et vue

- `reveal-0` à `reveal-15` révèlent une carte encore cachée et non appariée.
- Après une paire manquée, la seule action disponible est `continue`.
- Le module `memoryRules.view()` fournit `cards`, `turnsUsed`,
  `turnsRemaining`, `maxTurns`, `pairsFound` et `pendingMismatch`. Chaque carte
  contient `position`, `symbol`, `revealed` et `matched`. `symbol` vaut `null`
  tant que la carte n'est pas révélée ou appariée.
- À la fin, la vue révèle le plateau complet et ajoute `result`.

Le module `rules.js` reste pur. `draw.js` crée le plateau et demande son
mélange une seule fois via le `core.melanger()` injecté par `createGame`.
Les actions suivantes n'appellent pas le Core pour obtenir du hasard.

## Intégration G2/G3

Le montage suit la forme multi-étapes de `createGame` : `start(bets)`, puis
`action(sessionId, playerAction)` jusqu'au résultat terminal. Le plateau
mélangé et la paytable restent dans la session privée ; les cartes non
révélées ne sont jamais envoyées dans `renderPayload.view`.

L'alignement des actions (`reveal-<index>`, `continue`), du tirage et de
`rules.view()` avec le contrat G2 v0.8 a été confirmé par le référent
d'intégration dans l'issue
[#274](https://github.com/maximiliense/M1AgenticCoding/issues/274). Le
branchement dans `games.config.js` (G1) et `gameRegistry.js` (G4) reste à faire
par les groupes concernés ; il n'est pas inclus dans cette implémentation G2.
