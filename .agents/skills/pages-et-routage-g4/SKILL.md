---
name: pages-et-routage-g4
description: Comment fonctionne la navigation de l'application du Groupe 4 (routage par hash dans App.jsx, Navbar, pages dans src/pages/) et comment s'y brancher - ajouter une page ou un lien, pointer vers un jeu /game/:gameId, lire les données du joueur via coreService. À ouvrir dès qu'une tâche ajoute un écran, un lien de navigation ou relie un jeu à l'application.
---

# Skill pages-et-routage-g4 (Groupe 4)

Le G4 possède `src/app/`, `src/pages/`, `src/layouts/` et `src/components/`. Cette skill
décrit l'état **actuel** de la navigation. Le routage est **provisoire** : la décision de
bibliothèque (par exemple `react-router`) n'est pas prise. Si ce que tu lis ici ne
correspond plus à `src/app/App.jsx`, c'est le code qui fait foi.

## Quand l'utiliser

| Tu es… | Tu veux… | Section |
| --- | --- | --- |
| G4 | ajouter une page ou un lien de navigation | 2 |
| G3 (`src/game-ui/`) | relier un jeu à l'application, créer un lien vers un jeu | 3, 4 |
| G1 / G2 | savoir où une donnée du Core est affichée | 5 |

## 1. Comment fonctionne le routage

- Navigation **par hash** : l'URL de la page est dans `window.location.hash`
  (`#/profile`, `#/leaderboard`, `#/game/slots`). Cela fonctionne sur GitHub Pages sans
  réécriture d'URL côté serveur.
- `src/app/App.jsx` lit le hash (`getPath`), le garde dans un état, et le compare à la table
  `pages` (chemin → composant de page). Un chemin inconnu affiche `NotFound`.
- Les pages de la table s'affichent dans `MainLayout` (Navbar + zone de contenu). Les chemins
  `/game/...` sont traités à part, **hors** de la Navbar.
- Un lien interne s'écrit `href="#/chemin"`.

Chemins actuels : `/` (Lobby), `/leaderboard`, `/shop`, `/statistics`, `/profile`,
`/progression`, `/game/:gameId`. `/admin` n'est pas encore routé.

## 2. Ajouter une page (G4)

1. Créer `src/pages/<Nom>/<Nom>.jsx` (et son `.css`) ; lire les données via `coreService`.
2. L'importer dans `src/app/App.jsx` et ajouter son chemin à la table `pages`.
3. Si elle doit être dans le menu, l'ajouter à `mainLinks` ou `profileLinks` dans
   `src/components/Navbar/Navbar.jsx`.
4. Tant qu'une fonction du Core n'existe pas, utiliser un mock (`src/mocks/`) et le dire dans
   le README ou la PR. Ne jamais inventer la donnée côté UI.
5. Une issue, une branche `feat/groupe4-<nom>`, une PR vers `main` avec `Closes #N`.

## 3. Pointer vers un jeu

Chaque jeu est décrit dans `src/config/gameRegistry.js` : `{ id, name, unlockLevel, category }`
(`slots`, `dice`, `scratch`, `blackjack`, `wheel`, `roulette`, `baccarat`, `plinko`,
`video-poker`, `poker`). Le lien d'un jeu est `#/game/<id>` :

```jsx
<a href={`#/game/${game.id}`}>Jouer</a>
```

Pour une liste de jeux, utiliser le composant `GameCard` (skill `composants-communs-g4`),
en lui passant `href`. Le composant ne construit pas d'URL.

## 4. Brancher un jeu sur `/game/:gameId` (G3)

État actuel, à connaître avant de coder :

- `App.jsx` rend `GamePage` pour tout chemin `/game/...`. `GamePage` est aujourd'hui une page
  d'attente : elle n'affiche pas encore la partie.
- `App.jsx` transmet l'identifiant du jeu à `GamePage` (`gameId`, lu dans `#/game/<gameId>`).
  `GamePage` retrouve le jeu dans `gameRegistry` ; pour un identifiant inconnu, elle affiche
  un message d'erreur.
- **Le point d'intégration des jeux du G3 n'est pas encore défini.** Ne modifie pas
  `App.jsx` ni `GamePage` toi-même : ouvre une issue « G3 → G4 » qui décrit ce dont tu as
  besoin (par exemple « `GamePage` doit monter le composant de `src/game-ui/<jeu>/` »).

## 5. Lire les données du joueur

Toujours via `src/services/coreService.js`, jamais `src/core/*` :

```js
import { getState, getLeaderboard } from '../../services/coreService.js';

const state = getState();      // balance, bestBalance, xp, level, unlockedGames, history, role
const ranking = getLeaderboard(); // [{ pseudo, balance, level }]
```

- Le schéma de l'état est documenté dans `src/core/state.js`. Un champ optionnel (par exemple
  `pseudo`) peut être absent : prévoir un repli, comme le fait l'écran Profil.
- `getLeaderboard()` ne renvoie pas de rang : le rang est la position dans la liste, dont
  l'ordre fait foi. Ne pas retrier côté UI.
- Les seuils d'XP (`xpForNextLevel`) ne sont pas encore exposés par le Core.

## Ce qu'il ne faut pas faire

- Importer `src/core/*` depuis une page ou un composant (règle absolue, vérifiée par le G5).
- Utiliser `Math.random()` (seul `src/core/rng.js` produit du hasard).
- Calculer côté UI un niveau, un seuil d'XP, un gain, un classement ou un verrouillage.
- Ajouter une page ou un lien depuis un autre groupe sans passer par le G4.
- Écrire dans `localStorage` depuis une page : la persistance est dans le Core.

## Limites connues (à jour au moment de l'écriture)

- Routage provisoire par hash, à remplacer si l'équipe choisit une bibliothèque.
- Le Lobby (`/`) liste les jeux de `GAME_REGISTRY` avec `GameCard` et lit les jeux débloqués via
  `getUnlockedGames()`. Exemple à suivre pour une page qui affiche des jeux.
- `/admin` n'est pas routé.
