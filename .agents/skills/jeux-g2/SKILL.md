---
name: jeux-g2
description: Comment utiliser un jeu du Groupe 2 depuis un autre groupe (G3 rendu, G4 application) ou brancher un nouveau jeu dans l'orchestrateur G2 - interface start(bets) / action(sessionId, playerAction), format de gameResult et de renderPayload, config et tirage par jeu. À ouvrir dès qu'une tâche lance une partie, affiche son résultat, ou ajoute des règles de jeu dans src/games/.
---

# Skill jeux-g2 (Groupe 2)

Source de vérité : contrat G2 (issue #68, version consolidée). Cette skill en
est le mode d'emploi. En cas de doute ou de désaccord avec le contrat, c'est le
contrat qui fait foi : ne rien inventer, ouvrir une issue `groupe: G2`.

## Quand l'utiliser

| Tu es… | Tu veux… | Section |
| --- | --- | --- |
| G3 (`src/game-ui/`) | lancer une partie, envoyer une action du joueur, afficher le résultat | 1, 2, 3 |
| G4 (`src/pages/`, admin) | savoir quels jeux existent et quelle `config` leur passer | 1, 4 |
| G2 (`src/games/`) | brancher les règles d'un nouveau jeu sur l'orchestrateur | 4, 5 |

## 1. Créer un jeu et jouer une partie

```js
import { createGame } from '../../games/_template/createGame.js';
import * as rules from '../../games/wheel/rules.js';

const game = createGame({ id: 'wheel', rules, config });

// Jeu instantané (slots, dés, gratter, roue, plinko, roulette, baccarat)
const res = game.start([{ type: 'red', amount: 10 }]);
// res.terminal === true, res.gameResult est présent : la partie est finie.

// Jeu multi-étapes (blackjack, vidéo poker, poker)
let step = game.start([{ type: 'main', amount: 20 }]);   // terminal: false
step = game.action(step.sessionId, 'hit');              // tant que !terminal
step = game.action(step.sessionId, 'stand');            // terminal: true
```

- `bets` est **toujours un tableau** `[{ type, amount }]`, même pour une seule
  mise. Plusieurs mises (roulette) = plusieurs entrées : le G2 règle tout en
  **une seule** fois.
- `id` : `slots`, `dice`, `scratch`, `blackjack`, `wheel`, `roulette`,
  `baccarat`, `plinko`, `video-poker`, `poker`.
- `start()` / `action()` sont dans `main` depuis la PR #136. `playRound(bets)`
  reste disponible pour un jeu instantané joué en un seul appel.
- Tant que les règles d'un jeu ne sont pas livrées, G3 utilise un mock qui
  renvoie exactement le format ci-dessous.

## 2. Ce que renvoient `start()` et `action()`

```js
{
  sessionId,          // à garder et à renvoyer tel quel à action()
  renderPayload,      // de quoi afficher l'étape (voir § 3)
  availableActions,   // boutons à activer maintenant, ex. ['hit', 'stand'] ; [] si fini
  terminal,           // true quand la partie est finie
  gameResult,         // seulement si terminal : { outcome, multiplier, details }
}
```

- **Le G2 garde l'état de la partie.** L'UI ne stocke que le `sessionId` et
  ne recalcule rien.
- `gameResult.outcome` : `'win' | 'loss' | 'push'` (`push` = mise rendue).
- `gameResult.multiplier` **inclut la mise** : total reversé = mise totale ×
  `multiplier`, arrondi au centième par le Core. Pas de champ `payout`.
- `playerAction` est une valeur de `availableActions`, jamais une chaîne libre.
  Vidéo poker : `hold-0` … `hold-4` (bascule la carte gardée), puis `draw`
  (validé G3, #8).

## 3. `renderPayload`

```js
{ gameId, phase: 'playing' | 'result', raw, interpretation, economy }
```

- `raw` : le tirage brut (segment de roue, case plinko…), pour l'animation.
- `interpretation` : les `details` du résultat (à la fin).
- `economy` : `{ newBalance, xpGained, leveledUp }` renvoyé par le Core (à la
  fin).
- **Jeux de cartes** (blackjack, vidéo poker ; le poker suivra quand ses
  règles seront livrées, #196) : le brut serait le paquet mélangé. Ces jeux fournissent donc `rules.view(...)` et l'UI reçoit
  `{ gameId, phase, view, economy? }`, **sans** `raw` ni `interpretation`.
  `view` ne contient que ce qui est visible (pas la carte cachée du croupier,
  pas la main de l'IA, pas les cartes à venir). PR #168.
- La **disposition** d'un jeu (segments de la roue, types de pari…) n'est pas
  dans le `renderPayload` : c'est de la configuration, à lire via
  `coreService.getGameConfig(id)` quand il sera exposé (#122).
- 🟠 Le contenu **par jeu** n'est pas encore figé (contrat § 5.2). Il faut
  l'aligner avec le responsable du jeu dans la discussion #8. Si une donnée
  manque pour l'affichage, la demander au G2, ne jamais la deviner.

## 4. La `config` d'un jeu

`config` est transmise **telle quelle** aux règles. Aucune valeur par défaut :
les règles lèvent une erreur si elle manque (règle 4, rien en dur).

| Jeu | Forme lue par les règles |
| --- | --- |
| `wheel` | `{ bets: { <type>: { match: { <champ>: <valeur> }, multiplier } } }` |
| `plinko` | `{ paytable: number[] }`, index = numéro de case |
| `video-poker` | « Jacks or Better » 9/6 (#125, @Zelyx21) : `paytable` par `category` de `evaluatePokerHand()`, mise incluse : 10 → 250, 9 → 50, 8 → 25, 7 → 9, 6 → 6, 5 → 4, 4 → 3, 3 → 2, 2 → 1 seulement pour une paire de valets ou mieux (sinon 0), 1 → 0 |

🟠 La forme côté Core / admin est en discussion dans #122. La source finale
sera `getGameConfig` via `coreService`.

## 5. Brancher un nouveau jeu (G2)

1. `src/games/<jeu>/rules.js`, **pur** : aucun import du Core, pas de
   `Math.random()`.
   - instantané : `resolve(raw, { bets, config })` → `gameResult`
   - multi-étapes : `start(raw, { bets, config })` → session avec
     `needsDraw: true`, puis `step(session, action, raw)` → session (toujours
     `needsDraw: true`) ou `gameResult` (fin)
2. Si le brut attendu n'est pas `roll()` → `{ value }`, fournir un
   `draw(core, context)` dans le fichier du jeu (**pas** dans `rules.js`), qui
   appelle la bonne primitive : `core.tirageEntier`, `core.tirageAvecPoids`,
   `core.melanger`. Jeux de cartes : `core.melanger(buildDeck(n))` (de
   `src/games/deck.js`) au début de la manche, `null` pendant les actions
   (pioche au curseur dans la session).
3. **Mise qui augmente** (double, relance) : la session en cours porte
   `totalBet`, et le résultat final `details.totalBet`. L'orchestrateur règle
   ce montant et refuse une hausse au-delà du solde (PR #199). Le solde est
   reçu en donnée dans `ctx.balance` pour masquer une action non payable.
4. **Ce que voit G3** : un jeu de cartes fournit `view({ phase, raw, session,
   gameResult })` (§ 3).
5. Cartes : `{ rank, suit }` et utilitaires de `src/games/cardUtils.js`
   (`blackjackTotal`, `baccaratTotal`, `evaluatePokerHand`, `hasPair`,
   `RANKS`, `SUITS`).
6. Tests unitaires des règles + un test de montage dans
   `tests/integration/g2/` (modèles : `montage.wheel-plinko.test.js`, `montage.dice.test.js`, fixtures
   `tests/fixtures/g2/rolls.js`).

## À ne jamais faire

- Appeler `coreService.play()` ou `roll()` depuis l'UI ou depuis un `rules.js` :
  c'est le rôle de l'orchestrateur.
- Décider d'un gain, d'un résultat ou d'un bouton actif côté UI.
- Lancer une partie par mise pour un même tour (roulette) : toutes les mises
  d'un tour vont dans un seul `start(bets)`, qui fait un seul règlement.
- Modifier `src/games/` depuis un autre groupe : ouvrir une issue
  `groupe: G2`.
