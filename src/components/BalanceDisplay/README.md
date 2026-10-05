# BalanceDisplay

Composant de présentation sans état local ni appel au Core.

```jsx
import BalanceDisplay from '../../components/BalanceDisplay/BalanceDisplay.jsx';

<BalanceDisplay balance={5000} />
<BalanceDisplay balance={5000} label="Votre solde" />
```

Props :

- `balance` : solde à afficher, nombre fini. Formaté en français (`5 000`,
  deux décimales au maximum). Un solde négatif est affiché tel quel.
- `label` : texte avant le solde, « Solde » par défaut.
- `className` : classe ajoutée au conteneur.

Un solde absent ou non numérique affiche « Solde — ».

Le contrat du Core ne définit aucune devise : aucun symbole n'est ajouté.
Le composant n'anime pas les gains ou les pertes et ne garde pas d'historique :
il affiche la valeur reçue.

L'intégration dans les pages (Navbar, Profil, Boutique) et dans `PlayerHeader`
reste une tâche séparée.
