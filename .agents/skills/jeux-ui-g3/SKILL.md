---
name: jeux-ui-g3
description: Comment utiliser une UI de jeu du Groupe 3 depuis un autre groupe (G4 page de jeu, G2 branchement du vrai start) - liste des UI disponibles dans src/game-ui/, props communes (balance, start, renderResult), états affichés, mode démonstration avec mock, répartition G3 / G4 / G2. À ouvrir dès qu'une tâche monte un jeu dans l'application ou remplace le mock d'une UI de jeu par l'orchestrateur G2.
---

# Skill jeux-ui-g3 (Groupe 3)

Le G3 possède `src/game-ui/` : l'affichage **à l'intérieur d'une partie** (jeu, animations,
choix du pari, mise, résultat). Cette skill décrit l'état **actuel** des composants. Si ce que
tu lis ici ne correspond plus au code de `src/game-ui/`, c'est le code qui fait foi.

## Quand l'utiliser

| Tu es… | Tu veux… | Section |
| --- | --- | --- |
| G4 (`src/pages/Game/`) | afficher l'UI d'un jeu dans la page de jeu | 1, 2, 3, 5 |
| G2 (`src/games/`) | remplacer le mock d'une UI par le vrai `start` de l'orchestrateur | 2, 4 |
| G3 | ajouter une nouvelle UI de jeu compatible avec la page de jeu | 2, 3, 6 |

## 1. UI disponibles

| Jeu (`id`) | Composant | Statut |
| --- | --- | --- |
| `slots` | `src/game-ui/slots/SlotsGame.jsx` | sur `main`, monté dans `GamePage` (#175) |
| `roulette` | `src/game-ui/roulette/RouletteGame.jsx` | sur `main`, monté dans `GamePage` (#175) |
| `wheel` | `src/game-ui/wheel/WheelGame.jsx` | sur `main` (#193), monté dans `GamePage` (#197) |

Composant commun réutilisé par tous les jeux : `src/game-ui/common/BetPanel.jsx` (saisie de la
mise + bouton « Jouer »). Les autres jeux n'ont pas encore d'UI.

## 2. Props communes

Chaque UI de jeu accepte les mêmes props, pour que la page de jeu les monte toutes de la même
façon :

```jsx
<GameUI balance={balance} renderResult={renderResult} />
```

| Prop | Obligatoire | Rôle |
| --- | --- | --- |
| `balance` | oui | solde affiché et borne haute de la mise (lu par la page via `coreService.getBalance()`) |
| `renderResult(gameResult, bet)` | non | fonction de la page qui affiche le résultat ; appelée quand la partie est finie. `bet` = mise du tour, le gain total est `bet × gameResult.multiplier` (contrat G2 § 2.2) |
| `start(bets)` | non | lance la partie. **Par défaut : le mock du jeu.** À remplacer par le `start` de l'orchestrateur G2 (section 4) |

Props propres à un jeu :

| Jeu | Props | Rôle |
| --- | --- | --- |
| `wheel` | `segments`, `betTypes` | disposition de la roue et types de pari, issus de la config admin : `segments` et clés de `paytable` de `coreService.getGameConfig('wheel')` (schéma validé dans #122). Pas encore exposé (#158) : données fictives du mock par défaut |

L'UI ne lit jamais le Core elle-même et ne modifie ni le solde ni l'XP : le règlement est fait
par l'orchestrateur G2 et le Core.

## 3. Ce que l'UI affiche

- **États** : `playing` (prêt à jouer), `loading` (partie en cours), `terminal` (résultat),
  `error` (message « Une erreur est survenue, réessaie. »).
- **Choix du pari** (roulette, roue) : le bouton « Jouer » reste désactivé tant qu'aucun pari
  n'est choisi.
- **Résultat** : l'UI n'affiche pas elle-même « Gagné » ou « Perdu ». Elle appelle
  `renderResult` ; c'est la page qui décide de la mise en forme du résultat.
- La roue n'appelle `renderResult` qu'à l'arrêt de son animation (environ 3 s, aucune animation
  si l'utilisateur a activé `prefers-reduced-motion`).

## 4. Mode démonstration et vrai `start`

- Sans prop `start`, l'UI utilise le mock de son dossier (`<jeu>.mock.js`). Le mock renvoie la
  même forme que `start(bets)` de l'orchestrateur G2 (skill `jeux-g2` § 2) :
  `{ sessionId, renderPayload, availableActions, terminal, gameResult }`. Ses résultats sont
  **fictifs** : la page doit l'indiquer (bandeau « Mode démonstration » de `GamePage`).
- Pour jouer pour de vrai, passer le `start` d'un jeu créé par l'orchestrateur :

```js
import { createGame } from '../../games/_template/createGame.js';
const game = createGame({ id: 'wheel', rules, config });
<WheelGame balance={balance} renderResult={renderResult} start={game.start} />
```

- L'UI appelle `start([{ type, amount }])` (un tableau, même pour une seule mise, contrat G2
  § 2.1) et accepte une réponse directe ou une `Promise` (slots : à partir de la PR #282).
- Données lues dans la réponse :

| Jeu | Champs lus |
| --- | --- |
| `slots` | `renderPayload.raw.symbols` (3 rouleaux, comme les règles #216, PR #282), `gameResult` |
| `roulette` | `renderPayload.number`, `renderPayload.color`, `gameResult` ⚠️ |
| `wheel` | `renderPayload.raw` (segment tiré, comme les règles #128), `gameResult` |

⚠️ **Roulette** : les vraies règles (#233) renvoient seulement le nombre tiré dans
`renderPayload.raw` (entier 0 à 36), sans couleur. L'UI roulette lit encore `number` / `color`
de son mock : elle doit être alignée avant de brancher son vrai `start` (la couleur d'un nombre
relève de la config, à voir avec le G2).

Brancher le vrai `start` d'un jeu est une **tâche séparée**, avec un ticket.

## 5. Qui fait quoi

| Action | Groupe |
| --- | --- |
| Écrire ou modifier une UI dans `src/game-ui/` | G3 |
| Monter une UI dans `GamePage` (table `GAME_UIS`), afficher le solde et le résultat, le bandeau démonstration | G4 |
| Fournir `start` / `action`, le `renderPayload` et le `gameResult` | G2 |
| Régler la partie (solde, XP) | G1, appelé par l'orchestrateur G2 |

- Le G3 ne modifie pas `GamePage` : pour monter une nouvelle UI, il ouvre une issue « G3 → G4 »
  avec le chemin du composant et ses props (skill `pages-et-routage-g4` § 4).
- Le G4 ne modifie pas `src/game-ui/` : s'il manque une prop ou un comportement, il ouvre une
  issue avec le label « Groupe 3 - Rendu Visuel ».

## 6. Ajouter une UI de jeu (G3)

1. Suivre la skill `game-ui` (périmètre, interdits, mocks, Definition of Done).
2. Exposer les props communes de la section 2 et un `start` par défaut vers le mock du jeu.
3. Ajouter le jeu au tableau de la section 1 et ses champs lus à la section 4.
4. Ouvrir l'issue « G3 → G4 » pour le montage dans `GamePage`.

## À ne jamais faire

- Calculer un résultat, un gain ou un bouton actif dans la page ou dans l'UI.
- Importer `src/core/` depuis `src/game-ui/` ou `src/pages/` : seulement via `coreService`.
- Présenter les résultats d'un mock comme réels (pas de bandeau démonstration = bug).
