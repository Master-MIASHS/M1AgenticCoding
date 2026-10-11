# Quiz « risque ton argent » — G2

La partie comporte cinq questions à choix multiples, chacune avec quatre
options. `draw.js` mélange la banque avec `core.melanger()` au démarrage ; les
règles consomment les cinq premières questions sans répétition. Le module de
règles reste pur et conserve les réponses correctes dans la session privée.

Une mise unique est engagée au démarrage. Une mauvaise réponse termine la
partie avec `loss` et un multiplicateur de zéro. Après une bonne réponse, le
joueur peut continuer avec `next` ou encaisser avec `stop`. `stop` n’est proposé
qu’après au moins une bonne réponse. Cinq bonnes réponses terminent
automatiquement la partie.

La configuration fournit obligatoirement `paytable` avec des multiplicateurs
mise incluse indexés de 1 à 5 bonnes réponses :

```js
{
  paytable: {
    1: 1.5,
    2: 2,
    3: 3,
    4: 5,
    5: 10
  }
}
```

Les valeurs illustrent uniquement la forme attendue ; les règles n’ajoutent
aucun barème par défaut. Une entrée manquante ou invalide lève une `TypeError`.
Comme ailleurs dans le contrat, un multiplicateur supérieur à 1 produit `win`,
égal à 1 `push`, inférieur à 1 `loss`.

Les actions de réponse sont `answer-0` à `answer-3`. Après une réponse correcte,
`availableActions` contient `next` et `stop`, sauf à la dernière question. La
vue publique expose la question et les options pendant le choix, sans la bonne
réponse ; après réponse, elle expose l’index choisi et l’index correct. La
banque de questions, `src/games/quiz/questions.js`, fournit vingt entrées
versionnées et validées au démarrage.

Intégration :

```js
import { createGame } from '../_template/createGame.js';
import * as rules from './rules.js';
import { draw } from './draw.js';

const quiz = createGame({ id: 'quiz', rules, config, draw });
```
