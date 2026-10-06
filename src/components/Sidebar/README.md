# Sidebar

Barre latérale de navigation. Composant de présentation : il affiche les liens
qu'on lui donne, ne lit rien du Core et **ne construit aucune URL**, le choix de
la bibliothèque de routage n'étant pas tranché. Il est repliable sur petit écran.

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

Props :

- `items` : liste de `{ path, label, icon?, href? }`. Un élément sans `path` ou sans
  `label` (non vide) est ignoré. Liste vide ou absente : rien n'est affiché.
- `currentPath` : l'élément dont le `path` est identique reçoit `aria-current="page"`.
- `getHref` : fonction `(path) => lien`, fournie par l'appelant. Sans elle, le `path`
  est utilisé tel quel. Un `href` porté par l'élément a priorité sur `getHref`.
- `ariaLabel` : nom accessible de la navigation, « Navigation latérale » par défaut
  (le préciser si la page contient plusieurs navigations).
- `className` : classe ajoutée au conteneur.

Comportement :

- Grand écran (768 px et plus) : la liste est toujours visible, sans bouton.
- Petit écran : la liste est masquée derrière un bouton (`aria-expanded`,
  `aria-controls`). Échap ou un clic sur un lien la referme ; Échap redonne le focus au
  bouton.
- `icon` est décoratif (`aria-hidden`).

Aucune logique d'autorisation : afficher ou non un lien (par exemple Administration) se
décide dans la page appelante, en filtrant `items`. La Navbar couvre déjà la navigation
principale : la `Sidebar` sert à une navigation secondaire (par exemple l'écran Admin).

L'intégration dans une page ou un layout reste une tâche séparée.
