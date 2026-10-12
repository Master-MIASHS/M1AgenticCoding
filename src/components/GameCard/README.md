# GameCard

Carte d'un jeu pour le Lobby, en deux états : jouable ou verrouillée.
Composant de présentation sans état local ni appel au Core.

```jsx
import GameCard from '../../components/GameCard/GameCard.jsx';

<GameCard name="Slots" category="table" href="#/game/slots" />
<GameCard name="Poker" category="poker" locked unlockLevel={12} />
<GameCard name="Dice" onSelect={() => ouvrirLeJeu('dice')} />
```

Props :

- `name` : nom du jeu, « Jeu » par défaut s'il est absent.
- `category` : catégorie affichée en petit (facultatif).
- `locked` : le jeu est verrouillé. **Le composant ne décide pas du
  verrouillage** : la page le calcule (niveau du joueur, jeux débloqués).
- `comingSoon` : le jeu est débloqué mais n'a pas encore d'écran. La carte affiche un
  bouton désactivé « Bientôt ». Une carte verrouillée reste verrouillée (`locked` est
  prioritaire) ; `href` et `onSelect` sont ignorés.
- `unlockLevel` : niveau requis, affiché quand le jeu est verrouillé.
- `href` : lien vers le jeu, fourni par l'appelant. Le composant ne construit
  aucune URL, le choix de la bibliothèque de routage n'étant pas tranché.
- `onSelect` : appelé quand une carte jouable est sélectionnée.
- `className` : classe ajoutée au conteneur.

Jouable : un lien « Jouer » si `href` est fourni, sinon un bouton « Jouer ». Le
nom accessible est « Jouer à <nom> ».

Verrouillé : un bouton désactivé (`disabled`, `aria-disabled="true"`) portant
« Niveau N requis », ou « Verrouillé » si `unlockLevel` est absent ou invalide.
Une carte verrouillée n'a ni lien ni gestionnaire : `href` et `onSelect` sont
ignorés.

Le Lobby (liste des cartes, calcul du verrouillage, navigation) reste une
tâche séparée.
