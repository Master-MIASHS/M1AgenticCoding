# XPBar

Composant de présentation sans état local ni appel au Core.

```jsx
import XPBar from '../../components/XPBar/XPBar.jsx';

<XPBar xp={750} xpForNextLevel={1000} level={3} />
```

Les props xp et xpForNextLevel doivent utiliser la même échelle, comme dans
le placeholder de Progression. Le remplissage affiche leur rapport borné
entre 0 et 100 %. Les valeurs textuelles restent celles fournies.
Le composant ne calcule ni niveau, ni seuil, ni gain ou XP restante.

level est facultatif ; className ajoute une classe au conteneur.
Une XP absente, invalide ou négative, ou un seuil absent, invalide ou non
positif produit une barre neutre avec « Progression indisponible ».
Un seuil absent ne signifie pas que le niveau maximal est atteint.

Le contrat actuel ne fournit pas nécessairement xpForNextLevel : aucun
seuil de remplacement n’est inventé. L’intégration dans Progression reste
une tâche séparée. Aucun fichier de cette page ne doit être modifié ici.
