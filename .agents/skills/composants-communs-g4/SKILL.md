---
name: composants-communs-g4
description: Comment utiliser les composants communs du Groupe 4 (XPBar, LevelBadge, BalanceDisplay, GameCard, Modal, Notification, Loader, PlayerHeader, Sidebar) depuis un autre groupe (G3 interface des jeux) ou une page G4 - props, exemples, valeurs de repli, et ce qu'il ne faut pas faire. À ouvrir dès qu'une tâche affiche un niveau, un solde, une barre d'XP, une carte de jeu, une fenêtre de résultat, un message ou un chargement, avant de créer un composant similaire.
---

# Skill composants-communs-g4 (Groupe 4)

Les composants communs sont dans `src/components/<Nom>/`. Chacun a un `README.md`
qui fait foi pour ses props. Cette skill dit **quand** les utiliser et **comment**.
En cas de désaccord entre cette skill et le README d'un composant, c'est le
README qui fait foi.

## Quand l'utiliser

| Tu veux afficher… | Composant | Section |
| --- | --- | --- |
| la progression d'XP vers le niveau suivant | `XPBar` | 1 |
| le niveau du joueur | `LevelBadge` | 2 |
| le solde du joueur | `BalanceDisplay` | 3 |
| un jeu (jouable ou verrouillé) dans une liste | `GameCard` | 4 |
| une fenêtre (résultat de partie, confirmation) | `Modal` | 5 |
| un message ponctuel (gain, erreur, solde insuffisant) | `Notification` | 6 |
| un état de chargement | `Loader` | 7 |
| le résumé du joueur (pseudo, niveau, solde, XP) | `PlayerHeader` | 8 |
| une navigation latérale (liens, repliable sur mobile) | `Sidebar` | 9 |

Avant d'écrire un composant qui ressemble à l'un de ceux-ci : **utilise le composant
commun**. Le dupliquer crée deux affichages du niveau ou du solde qui divergent.

## Règles communes à tous les composants

- Ce sont des composants de **présentation** : pas d'état métier, pas d'appel au Core,
  pas d'import de `coreService`. La page ou le composant appelant lit les données
  (via `src/services/coreService.js`) et les passe en **props**.
- Un composant n'affiche que la valeur reçue : il ne calcule jamais un niveau, un seuil
  d'XP, un gain ni un verrouillage.
- Une prop absente, non numérique ou invalide donne une valeur de repli lisible (`—`,
  « Progression indisponible », « Jeu »), jamais une erreur.
- Import depuis une page (`src/pages/<Page>/`) ou depuis `src/game-ui/<jeu>/` :
  `import X from '../../components/X/X.jsx';`
- Le style n'utilise que les variables de `src/styles/variables.css`.
- Chaque composant accepte `className` pour ajouter une classe au conteneur.

```jsx
import { getState } from '../../services/coreService.js';
import LevelBadge from '../../components/LevelBadge/LevelBadge.jsx';
import BalanceDisplay from '../../components/BalanceDisplay/BalanceDisplay.jsx';

function Header() {
  const state = getState(); // lu par la page, jamais par le composant
  return (
    <>
      <LevelBadge level={state.level} />
      <BalanceDisplay balance={state.balance} />
    </>
  );
}
```

## 1. XPBar : progression d'XP

```jsx
<XPBar xp={750} xpForNextLevel={1000} level={3} />
```

- `xp` et `xpForNextLevel` doivent être **sur la même échelle** : la barre affiche leur
  rapport, borné entre 0 et 100 %.
- `level` est facultatif (affiche « Niv. 3 »).
- XP absente, négative ou invalide, ou seuil absent ou nul : barre neutre avec
  « Progression indisponible ».
- **Piège** : le Core n'expose pas encore `xpForNextLevel`. Tant qu'il est absent, la barre
  reste neutre. Ne pas inventer de seuil côté UI.

## 2. LevelBadge : niveau du joueur

```jsx
<LevelBadge level={4} />              // « Niveau 4 »
<LevelBadge level={4} label="Niv." /> // « Niv. 4 »
```

- `level` : nombre fini, positif ou nul, formaté en français. Sinon « Niveau — ».
- Ne calcule ni palier ni titre.

## 3. BalanceDisplay : solde du joueur

```jsx
<BalanceDisplay balance={5000} />                     // « Solde 5 000 »
<BalanceDisplay balance={5000} label="Votre solde" />
```

- `balance` : nombre fini, formaté en français (2 décimales au plus). Un solde négatif est
  affiché tel quel. Absent ou invalide : « Solde — ».
- **Aucune devise n'est affichée** : le contrat du Core n'en définit pas. Ne pas en ajouter.
- N'anime pas les gains ou les pertes.

## 4. GameCard : carte d'un jeu

```jsx
import { GAME_REGISTRY } from '../../config/gameRegistry.js';

{GAME_REGISTRY.map((g) => (
  <GameCard
    key={g.id}
    name={g.name}
    category={g.category}
    locked={level < g.unlockLevel}        // calculé par la page
    unlockLevel={g.unlockLevel}
    href={`#/game/${g.id}`}               // fourni par la page
  />
))}
```

- **Le composant ne décide pas du verrouillage** : `locked` est calculé par la page.
- Jouable : lien « Jouer » si `href` est fourni, sinon bouton « Jouer » (utiliser `onSelect`).
  Le nom accessible est « Jouer à <nom> ».
- Verrouillé : bouton désactivé « Niveau N requis » (ou « Verrouillé » sans `unlockLevel`).
  `href` et `onSelect` sont **ignorés** : une carte verrouillée ne déclenche jamais d'action.
- Le composant ne construit aucune URL (le routage n'est pas définitif, voir la skill
  `pages-et-routage-g4`).

## 5. Modal : fenêtre modale

```jsx
<Modal isOpen={open} onClose={() => setOpen(false)} title="Résultat" variant="success"
  footer={<button type="button" onClick={() => setOpen(false)}>Continuer</button>}>
  <p>Vous avez gagné.</p>
</Modal>
```

- Props : `isOpen`, `title`, `children`, `onClose`, `footer` (facultatif, pour les boutons
  d'action), `variant` (`neutral` par défaut, `success`, `error`), `closeOnBackdrop`
  (`false` par défaut).
- **Le parent contrôle l'ouverture** : il doit passer `isOpen` à `false` dans `onClose`.
  Échap et le bouton « × » appellent `onClose`.
- Elle utilise le `<dialog>` natif : le focus est confiné dans la fenêtre puis restauré à la
  fermeture. Mettre des `type="button"` sur les boutons et éviter `<form method="dialog">`.
- Cas typique du G3 : afficher `gameResult` quand `terminal` est `true`.

## 6. Notification : message ponctuel

```jsx
{message && (
  <Notification type="error" onClose={() => setMessage(null)}>
    Solde insuffisant.
  </Notification>
)}
```

- Props : `type` (`info` par défaut, `success`, `warning`, `error`), `children`, `onClose`
  (facultatif : sans lui, ni bouton de fermeture ni minuterie), `autoClose` (`false` par
  défaut, sinon une durée en millisecondes).
- **Le parent contrôle l'affichage** : il retire la notification dans `onClose`. Pour un
  nouveau message, changer la `key` pour obtenir une durée complète.
- Les erreurs utilisent `role="alert"`, les autres `role="status"`.
- **Ne pas activer `autoClose` sur un message qui demande une lecture ou une action** (une
  erreur à corriger, par exemple) : il disparaît sans que le joueur puisse le lire.

## 7. Loader : indicateur de chargement

```jsx
<Loader variant="inline" size="sm" label="Chargement…" />
{loading && <Loader variant="overlay" label="Veuillez patienter…" />}
```

- Props : `variant` (`inline` par défaut, ou `overlay`), `size` (`sm`, `md`, `lg`), `label` et
  `showLabel` (`true` par défaut ; masqué, le texte reste lu par les lecteurs d'écran).
- `inline` s'insère dans une zone (par exemple dans le bouton « Jouer »). `overlay` bloque
  toute l'interface (clavier et clics) jusqu'à son démontage ; Échap ne le ferme pas.
- **Le parent DOIT démonter un `overlay` quand le chargement se termine, y compris en cas
  d'erreur**, sinon l'interface reste bloquée.
- Il n'a aucune logique de chargement : c'est le parent qui sait quand charger.

## 8. PlayerHeader : résumé du joueur

```jsx
import PlayerHeader from '../../components/PlayerHeader/PlayerHeader.jsx';

<PlayerHeader pseudo={state.pseudo} level={level} balance={state.balance}
  xp={state.xp} xpForNextLevel={state.xpForNextLevel} />
```

- Il **assemble** `LevelBadge`, `BalanceDisplay` et `XPBar` : ne pas les juxtaposer à la main
  pour refaire un en-tête de joueur.
- Props : `pseudo` (« Joueur Fantôme » si absent ou vide), `level`, `balance`, `xp`,
  `xpForNextLevel`, `className`. Toutes sont transmises telles quelles aux composants.
- Une donnée manquante ne dégrade que sa partie (« Niveau — », « Solde — », « Progression
  indisponible »), jamais l'ensemble.
- Comme les autres, il ne lit pas le Core : la page lit via `coreService` et passe les props.

## 9. Sidebar : navigation latérale

```jsx
import Sidebar from '../../components/Sidebar/Sidebar.jsx';

<Sidebar
  items={[
    { path: '/profile', label: 'Mon profil', icon: '👤' },
    { path: '/progression', label: 'Ma progression' },
  ]}
  currentPath="/profile"
  getHref={(path) => '#' + path}
/>
```

- Props : `items` (`{ path, label, icon?, href? }`, un élément sans `path` ou sans `label` est
  ignoré), `currentPath` (le lien identique reçoit `aria-current="page"`), `getHref`,
  `ariaLabel`, `className`.
- **Il ne construit aucune URL** : `getHref` est fournie par la page (sans elle, le `path` est
  utilisé tel quel).
- Au-dessus de 768 px la liste est toujours visible ; en dessous, elle est derrière un bouton
  (Échap la referme).
- Aucune logique d'autorisation : afficher ou non un lien (par exemple Administration) se décide
  dans la page, en filtrant `items`. Les permissions se vérifient côté Core, pas en masquant un lien.
- La Navbar couvre la navigation principale : la `Sidebar` sert à une navigation secondaire
  (par exemple l'écran Admin). Elle n'est branchée dans aucun layout ni aucune page pour le moment.

## Ce qu'il ne faut pas faire

- Importer `src/core/*` dans un composant, ou appeler `coreService` depuis un composant commun.
- Passer à un composant une valeur recalculée par l'UI (niveau, seuil d'XP, gain) : la lire
  telle quelle depuis `coreService`.
- Recréer un `LevelBadge`, un affichage du solde, une barre d'XP ou un en-tête de joueur dans une page ou un jeu.
- Mettre des couleurs en dur : utiliser les variables de `src/styles/variables.css`.
- Modifier un composant commun depuis un autre groupe : ouvrir une issue au G4.

## Ajouter un composant commun (G4)

1. Issue avec le label du groupe 4, puis branche `feat/groupe4-<nom>` depuis `main`.
2. Dossier `src/components/<Nom>/` : `<Nom>.jsx`, `<Nom>.css`, `README.md`, `<Nom>.test.js`
   (modèle : `XPBar`). Supprimer le `.gitkeep` du dossier.
3. `npm run lint`, `npm run build`, `npm test` doivent passer.
4. PR vers `main` avec `Closes #N`, un composant par PR.
