---
name: jeux-ui-g3
description: Comment utiliser une UI de jeu du Groupe 3 depuis un autre groupe (G4 page de jeu, G5 / G2 branchement du vrai jeu) - liste des 11 UI disponibles dans src/game-ui/, props communes (balance, start, renderResult) et action des jeux multi-étapes, champs lus dans la réponse de l'orchestrateur, mode démonstration avec mock, répartition G3 / G4 / G2 / G5. À ouvrir dès qu'une tâche monte un jeu dans l'application ou remplace le mock d'une UI de jeu par l'orchestrateur G2.
---

# Skill jeux-ui-g3 (Groupe 3)

Le G3 possède `src/game-ui/` : l'affichage **à l'intérieur d'une partie** (jeu, animations,
choix du pari, mise, résultat). Cette skill décrit l'état **actuel** des composants. Si ce que
tu lis ici ne correspond plus au code de `src/game-ui/`, c'est le code qui fait foi.

## Quand l'utiliser

| Tu es… | Tu veux… | Section |
| --- | --- | --- |
| G4 (`src/pages/Game/`) | afficher l'UI d'un jeu dans la page de jeu | 1, 2, 3, 5 |
| G5 / G2 | remplacer le mock d'une UI par le vrai `start` / `action` de l'orchestrateur | 2, 4 |
| G3 | ajouter une nouvelle UI de jeu compatible avec la page de jeu | 2, 3, 6 |

## 1. UI disponibles

| Jeu (`id`) | Composant | Type | PR | Monté dans `GamePage` |
| --- | --- | --- | --- | --- |
| `slots` | `src/game-ui/slots/SlotsGame.jsx` | instantané | #92, #282 | oui, vrai jeu (#296) |
| `roulette` | `src/game-ui/roulette/RouletteGame.jsx` | instantané | #98, #192, #332 | oui, vrai jeu (#296) |
| `wheel` | `src/game-ui/wheel/WheelGame.jsx` | instantané | #193 | oui, démonstration (#197) |
| `plinko` | `src/game-ui/plinko/PlinkoGame.jsx` | instantané | #279 | oui, démonstration (#295) |
| `dice` | `src/game-ui/dice/DiceGame.jsx` | instantané | #286 | oui, démonstration (#363) |
| `scratch` | `src/game-ui/scratch/ScratchGame.jsx` | instantané | #358 | à monter (#386) |
| `blackjack` | `src/game-ui/blackjack/BlackjackGame.jsx` | **multi-étapes** | #360 | à monter (#386) |
| `video-poker` | `src/game-ui/video-poker/VideoPokerGame.jsx` | **multi-étapes** | #362 | à monter (#386) |
| `memory` | `src/game-ui/memory/MemoryGame.jsx` | **multi-étapes** | #380 | à monter (#386) |
| `quiz` | `src/game-ui/quiz/QuizGame.jsx` | **multi-étapes** | #383 | à monter (#386) |
| `bingo` | `src/game-ui/bingo/BingoGame.jsx` | **multi-étapes** | #385 | à monter (#386) |

Composant commun réutilisé par tous les jeux : `src/game-ui/common/BetPanel.jsx` (saisie de la
mise + bouton « Jouer », thème sombre #357). Pas encore d'UI : poker (en cours, #375), baccarat.

## 2. Props

Chaque UI de jeu accepte les mêmes props, pour que la page de jeu les monte toutes de la même
façon :

```jsx
<GameUI balance={balance} renderResult={renderResult} start={start} action={action} />
```

| Prop | Obligatoire | Rôle |
| --- | --- | --- |
| `balance` | oui | solde affiché et borne haute de la mise (lu par la page via `coreService.getBalance()`) |
| `renderResult(gameResult, bet)` | non | fonction de la page qui affiche le résultat ; appelée quand la partie est finie (après l'animation). `bet` = mise réellement engagée (doublée au blackjack après « Doubler »), le gain total est `bet × gameResult.multiplier` (contrat G2 § 2.2) |
| `start(bets)` | non | lance la partie. **Par défaut : le mock du jeu.** À remplacer par le `start` de l'orchestrateur G2 (section 4) |
| `action(sessionId, playerAction)` | non, **jeux multi-étapes seulement** | envoie l'action du joueur. **Par défaut : le mock du jeu.** Doit venir de la **même** instance `createGame` que `start` (la session vit dans l'instance, contrat G2 § 5.4) |

Props propres à un jeu (config admin, à lire par la page via `getGameConfig`, #377) :

| Jeu | Props | Source |
| --- | --- | --- |
| `wheel` | `segments`, `betTypes` | `getGameConfig('wheel')` : `segments` (ordre d'affichage) et clés de `paytable` (schéma #122) |
| `plinko` | `paytable` | `getGameConfig('plinko')` : un multiplicateur par case, pour l'affichage |

Sans ces props, l'UI utilise les données fictives de son mock. L'UI ne lit jamais le Core
elle-même et ne modifie ni le solde ni l'XP : le règlement est fait par l'orchestrateur G2 et
le Core.

## 3. Ce que l'UI affiche

- **États** : `playing` (prêt à miser), `loading`, `round` (jeux multi-étapes : partie en
  cours), `terminal` (résultat), `error` (message « Une erreur est survenue, réessaie. »).
- **Boutons d'action** (multi-étapes) : seulement ceux présents dans `availableActions`. L'UI
  ne décide jamais quel bouton est actif.
- **Mise bloquée** pendant toute la partie et pendant les animations.
- **Résultat** : l'UI n'affiche pas elle-même « Gagné » ou « Perdu ». Elle appelle
  `renderResult` ; c'est la page qui met en forme le résultat.
- **Animations** rythmées par une minuterie (jamais par `transitionend`) : roue ≈ 3 s, plinko
  ≈ 1,5 s, lancers de dés successifs, paire ratée du memory ≈ 0,9 s. Pas d'animation avec
  `prefers-reduced-motion`.

## 4. Mode démonstration et vrai jeu

- Sans `start` (ni `action`), l'UI utilise le mock de son dossier (`<jeu>.mock.js`). Le mock
  renvoie la même forme que l'orchestrateur G2 (skill `jeux-g2` § 2) :
  `{ sessionId, renderPayload, availableActions, terminal, gameResult }`. Ses résultats sont
  **fictifs** : la page doit l'indiquer (bandeau « Mode démonstration »).
- Pour jouer pour de vrai, passer `start` (et `action`) d'une instance `createGame` :

```js
const game = createGame({ id: 'blackjack', rules, draw, config });
<BlackjackGame balance={balance} renderResult={renderResult} start={game.start} action={game.action} />
```

- L'UI accepte une réponse directe ou une `Promise`.
- Ce que chaque UI envoie et lit :

| Jeu | `start` envoie | Actions | Champs lus |
| --- | --- | --- | --- |
| `slots` | `[{ type: 'mise', amount }]` | – | `renderPayload.raw.symbols`, `gameResult` |
| `roulette` | `[{ type: <pari>, amount }]` (`red`, `black`, `even`, `odd`) | – | `renderPayload.raw` (numéro), `renderPayload.interpretation.color` (#321) |
| `wheel` | `[{ type: <pari>, amount }]` | – | `renderPayload.raw` (segment tiré) |
| `plinko` | `[{ type: 'slot', amount }]` | – | `renderPayload.raw` (case d'arrivée) |
| `dice` | `[{ type: 'pass', amount }]` | – | `gameResult.details.rolls`, `.point` (#303) |
| `scratch` | `[{ type: 'mise', amount }]` | – | `gameResult.details.symbol` |
| `blackjack` | `[{ type: 'main', amount }]` | `hit`, `stand`, `double` | `renderPayload.view` (#203), `details.totalBet` |
| `video-poker` | `[{ type: 'main', amount }]` | `hold-0` … `hold-4`, `draw` | `renderPayload.view.hand`, `.held`, `.result` (#204) |
| `memory` | `[{ type: 'main', amount }]` | `reveal-<i>`, `continue` | `renderPayload.view.cards`, tours, paires (#300) |
| `quiz` | `[{ type: 'main', amount }]` | `answer-<i>`, `next`, `stop` | `renderPayload.view` (question, options, correction après réponse) (#302) |
| `bingo` | `[{ type: 'main', amount }]` | `next` | `renderPayload.view` (grille, boules, bots) (#310) |

Pour les jeux de cartes et multi-étapes, l'UI ne lit **que** `renderPayload.view` : jamais le
paquet, la carte cachée, le plateau ou la bonne réponse avant que la `view` les donne (#168).

Brancher le vrai jeu (`start` / `action`) est une **tâche séparée**, avec un ticket (#386).

## 5. Qui fait quoi

| Action | Groupe |
| --- | --- |
| Écrire ou modifier une UI dans `src/game-ui/` | G3 |
| Monter une UI dans `GamePage` (table `GAME_UIS`), afficher le solde et le résultat, le bandeau démonstration | G4 |
| Créer les instances `createGame` et fournir `start` / `action` à la page (`gameRuntime.js`) | G5 (#296) |
| Règles, `renderPayload`, `view()` et `gameResult` | G2 |
| Régler la partie (solde, XP) | G1, appelé par l'orchestrateur G2 |

- Le G3 ne modifie pas `GamePage` ni `gameRuntime.js` : pour monter une nouvelle UI, il ouvre
  une issue « G3 → G4 » avec le chemin du composant et ses props (skill `pages-et-routage-g4` § 4).
- Le G4 et le G5 ne modifient pas `src/game-ui/` : s'il manque une prop ou un comportement, ils
  ouvrent une issue avec le label « Groupe 3 - Rendu Visuel ».

## 6. Ajouter une UI de jeu (G3)

1. Suivre la skill `game-ui` (périmètre, interdits, mocks, Definition of Done).
2. Exposer les props de la section 2 (`action` si le jeu est multi-étapes) et un mock par défaut
   au format de l'orchestrateur. Modèles : `wheel/` (instantané), `blackjack/` (multi-étapes).
3. Ajouter le jeu aux tableaux des sections 1 et 4.
4. Ouvrir l'issue « G3 → G4 » pour le montage dans `GamePage`.

## À ne jamais faire

- Calculer un résultat, un gain, une main ou un bouton actif dans la page ou dans l'UI.
- Importer `src/core/` ou `coreService` depuis `src/game-ui/`.
- Présenter les résultats d'un mock comme réels (pas de bandeau démonstration = bug).
