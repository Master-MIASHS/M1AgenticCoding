# Bingo contre bots — G2

Une partie utilise 75 boules tirées sans remise, une grille 5×5 pour le joueur
et chacune des trois IA. Chaque colonne B/I/N/G/O contient cinq cases avec des
numéros distincts issus de sa plage de 15, sauf N qui a quatre numéros autour
de sa case centrale gratuite. Le joueur
déclenche chaque tirage avec l'action `next`. Une ligne, une colonne ou une
diagonale complétée termine la partie.

L'ordre des boules et les numéros des grilles sont mélangés une seule fois au
démarrage par `core.melanger()` dans `draw.js`. Les règles restent pures et
réutilisent ces données pendant les actions.

La configuration doit fournir le multiplicateur de victoire mise incluse :

```js
{ paytable: { win: 4 } }
```

La valeur est illustrative ; aucun multiplicateur de gain par défaut n'est
fourni. Une victoire du joueur seul utilise `paytable.win`, une victoire des
bots seuls donne `loss` avec le multiplicateur contractuel 0, et une égalité
sur le même tirage donne `push` avec le multiplicateur contractuel 1.

Pendant la partie, `rules.view()` expose la grille cochée du joueur, les boules
sorties et, pour chaque bot, le nombre minimal de cases qu'il lui reste pour
compléter une combinaison gagnante. Les grilles des bots sont révélées dans la
vue du résultat.

Intégration :

```js
import { createGame } from '../_template/createGame.js';
import * as rules from './rules.js';
import { draw } from './draw.js';

const bingo = createGame({ id: 'bingo', rules, config, draw });
```
