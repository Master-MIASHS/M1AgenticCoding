# Loader

```jsx
import Loader from '../../components/Loader/Loader.jsx';

<Loader label="Chargement des résultats…" size="md" />
```

Props : label (texte, Chargement… par défaut), size (sm/md/lg, md par défaut),
showLabel (true par défaut). Un label vide revient au texte par défaut.
Avec showLabel={false}, le texte reste accessible aux lecteurs d'écran.
Le parent décide du montage du loader et de aria-busy sur la zone chargée.
Pas de plein écran ou blocage des interactions implicite. Animation désactivée
avec prefers-reduced-motion. Aucun hook ni appel service.
