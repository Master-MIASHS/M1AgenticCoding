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

- `raw` : le tirage brut (segment de roue, case plinko, nombre entier de
  roulette 0–36…), pour l'animation.
- `interpretation` : les `details` du résultat (à la fin).
- `economy` : `{ newBalance, xpGained, leveledUp }` renvoyé par le Core (à la
  fin).
- 🟠 Le contenu **par jeu** n'est pas encore figé (contrat § 5.2). Il faut
  l'aligner avec le responsable du jeu dans la discussion #8. Si une donnée
  manque pour l'affichage, la demander au G2, ne jamais la deviner.
- **Jeux de cartes** (blackjack, vidéo poker ; le poker suivra quand ses
  règles seront livrées, #196) : ils fournissent `rules.view(...)` et l'UI
  reçoit `{ gameId, phase, view, economy? }`, **sans** `raw` ni
  `interpretation` (#168). `view` ne contient que ce qui est visible.
- La **disposition** d'un jeu (segments de la roue, types de pari…) n'est pas
  dans le `renderPayload` : c'est de la configuration, à lire via
  `coreService.getGameConfig(id)` quand il sera exposé (#158).

### Blackjack (#189) : `renderPayload.view`

Le blackjack fournit `rules.view()` : G3 lit `renderPayload.view`, jamais de
`raw` (le paquet mélangé et la carte cachée ne sont pas envoyés, #168).

```js
// pendant la manche (phase 'playing')
{ phase: 'playing', playerHand, playerTotal, dealerHand: [carteVisible], dealerHiddenCards: 1 }
// à la fin (phase 'result')
{ phase: 'result', playerHand, playerTotal, dealerHand, dealerTotal, outcome, natural }
```

- Cartes au format `{ rank, suit }` (contrat cartes).
- `availableActions` : `['hit', 'stand', 'double']` à la distribution, puis
  `['hit', 'stand']` après une carte ; `double` absent si le solde connu ne
  couvre pas la mise doublée.
- Blackjack naturel : la manche se termine dès `start(bets)` (`terminal: true`).

## 4. La `config` d'un jeu

`config` est transmise **telle quelle** aux règles. Aucune valeur par défaut :
les règles lèvent une erreur si elle manque (règle 4, rien en dur).

| Jeu | Forme lue par les règles |
| --- | --- |
| `wheel` | `{ bets: { <type>: { match: { <champ>: <valeur> }, multiplier } } }` |
| `plinko` | `{ paytable: number[] }`, index = numéro de case |
| `blackjack` | `{ paytable: { blackjack, win } }`, multiplicateurs mise incluse (ex. `{ blackjack: 2.5, win: 2 }`) ; égalité → 1, perte → 0 (#189) |
| `video-poker` | « Jacks or Better » 9/6 (#125) : `paytable` par `category` de `evaluatePokerHand()`, mise incluse : 10 → 250, 9 → 50, 8 → 25, 7 → 9, 6 → 6, 5 → 4, 4 → 3, 3 → 2, 2 → 1 seulement pour une paire de valets ou mieux (sinon 0), 1 → 0 |
| `roulette` | `{ bets: { <type>: { match: number[], multiplier } } }`, `match` = liste des nombres gagnants (#191) |

Forme côté Core / admin, **validée dans #122** (G1, G2, G4) :

- roue : `{ paytable: { <type>: { match, multiplier } }, segments: [{ id,
  label, color, …champs de match, weight }] }`. L'ordre du tableau donne
  l'ordre d'affichage, et `weight` est le poids du tirage (distinct des
  gains). G2 assemble `{ bets: config.paytable }` pour `rules.js` ;
- plinko : `{ paytable: number[], weights: number[] }`, de même longueur.

La source finale sera `getGameConfig` via `coreService` (#158, pas encore
exposé).

## 5. Brancher un nouveau jeu (G2)

1. `src/games/<jeu>/rules.js`, **pur** : aucun import du Core, pas de
   `Math.random()`.
   - instantané : `resolve(raw, { bets, config, balance })` → `gameResult`
   - multi-étapes : `start(raw, { bets, config, balance })` → session avec
     `needsDraw: true`, puis `step(session, action, raw)` → session (toujours
     `needsDraw: true`) ou `gameResult` (fin)
2. Si le brut attendu n'est pas `roll()` → `{ value }`, fournir un
   `draw(core, context)` dans le fichier du jeu (**pas** dans `rules.js`), qui
   appelle la bonne primitive : `core.tirageEntier`, `core.tirageAvecPoids`,
   `core.melanger` (PR #141 pour `draw`, PR #115 pour les primitives).
   Jeux de cartes : `core.melanger(buildDeck(n))` (de `src/games/deck.js`) au
   début de la manche, `null` pendant les actions (pioche au curseur dans la
   session). Modèles : `blackjack/index.js`, `video-poker/draw.js`.
   Exemples livrés : `src/games/roulette/index.js` → `core.tirageEntier(0, 36)`
   (#191) ; la roue passe son propre draw dans le test de montage
   (`core.tirageAvecPoids`).
3. **Mise qui augmente** (double, relance) : la session en cours porte
   `totalBet`, et le résultat final `details.totalBet`. L'orchestrateur règle
   ce montant (#166). Une hausse au-delà du solde est refusée : l'action lève
   une erreur, la session reste inchangée et la manche continue (#199).
   `balance` (le solde, en simple donnée) permet aux règles de masquer une
   action non payable.
4. **Ce que voit G3** : un jeu de cartes fournit `view({ phase, raw,
   session, gameResult })` (§ 3, #168).
5. Cartes : `{ rank, suit }` et utilitaires de `src/games/cardUtils.js`
   (`blackjackTotal`, `baccaratTotal`, `evaluatePokerHand`, `hasPair`,
   `RANKS`, `SUITS`).
6. Tests unitaires des règles + un test de montage dans
   `tests/integration/g2/` (modèles : `montage.wheel-plinko.test.js`,
   `montage.blackjack.test.js` ; fixtures `tests/fixtures/g2/rolls.js`).

## À ne jamais faire

- Appeler `coreService.play()` ou `roll()` depuis l'UI ou depuis un `rules.js` :
  c'est le rôle de l'orchestrateur.
- Décider d'un gain, d'un résultat ou d'un bouton actif côté UI.
- Lancer une partie par mise pour un même tour (roulette) : toutes les mises
  d'un tour vont dans un seul `start(bets)`, qui fait un seul règlement.
- Modifier `src/games/` depuis un autre groupe : ouvrir une issue
  `groupe: G2`.
