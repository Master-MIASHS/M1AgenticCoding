# LevelBadge

Composant de présentation sans état local ni appel au Core.

```jsx
import LevelBadge from '../../components/LevelBadge/LevelBadge.jsx';

<LevelBadge level={4} />
<LevelBadge level={4} label="Niv." />
```

Props :

- `level` : niveau à afficher, nombre fini et positif ou nul. Formaté en
  français (`1 234`).
- `label` : texte avant le niveau, « Niveau » par défaut.
- `className` : classe ajoutée au conteneur.

Un niveau absent, non numérique ou négatif affiche « Niveau — ». Le composant
ne calcule ni palier, ni titre, ni progression : il affiche la valeur reçue.

L'intégration dans les pages (Profil, Progression, Classement) et dans
`PlayerHeader` reste une tâche séparée.
