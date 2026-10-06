# PlayerHeader

Résumé du joueur : initiale, pseudo, niveau, solde et progression d'XP.
Composant de présentation qui **assemble** `LevelBadge`, `BalanceDisplay` et
`XPBar` ; il n'a pas d'état local et n'appelle ni le Core ni `coreService`.

```jsx
import PlayerHeader from '../../components/PlayerHeader/PlayerHeader.jsx';

<PlayerHeader pseudo="alice" level={4} balance={5000} xp={750} xpForNextLevel={1000} />
```

Props :

- `pseudo` : nom du joueur, « Joueur Fantôme » s'il est absent ou vide.
- `level` : transmis à `LevelBadge`.
- `balance` : transmis à `BalanceDisplay`.
- `xp` et `xpForNextLevel` : transmis à `XPBar`. Le Core n'expose pas encore
  `xpForNextLevel` : sans lui, `XPBar` affiche « Progression indisponible »,
  ce qui est le comportement attendu.
- `className` : classe ajoutée au conteneur.

Chaque donnée manquante ne dégrade que sa propre partie de l'en-tête (« Niveau — »,
« Solde — », « Progression indisponible »), jamais l'ensemble. Le composant ne
calcule ni niveau ni seuil d'XP : c'est la page appelante qui lit les données
via `coreService` et les passe en props.

Le remplacement de l'en-tête déjà écrit dans la page Profil par ce composant
reste une tâche séparée.
