# Boutique

## Rôle et accès

`Shop` consulte et achète des articles avec des jetons fictifs. La route hash
actuelle est `#/shop`, déclarée dans `src/app/App.jsx`. La page ne calcule ni
prix, ni débit, ni droit de possession : ces règles relèvent du Core.

## Intégration au Core

Par défaut, le composant consomme uniquement `src/services/coreService.js` :

```js
getShopCatalog();
getShopInventory();
getBalance();
purchaseShopItem(itemId);
```

Le catalogue contient des articles `{ id, name, description, category, price,
visual?, available }`. L'inventaire est `{ ownedItemIds }`. L'écran déduit
seulement son rendu : un article est indisponible si `available` est faux,
possédé si son identifiant est dans `ownedItemIds`, sinon disponible.

Au clic, la page envoie uniquement `itemId` à `purchaseShopItem`. Elle affiche
le `status` et le `message` renvoyés par le Core, puis met à jour le solde avec
`result.balance` et relit l'inventaire. Une demande en cours désactive les
boutons pour éviter les appels répétés.

Après un `purchased`, `Shop` appelle le callback UI `onPlayerUpdated` fourni par
`App`. Celui-ci relit `getState()` afin que la Navbar utilise le même instantané
public du joueur. Aucun solde n'est recopié ni calculé entre les composants.

| Statut Core          | Affichage                                    |
| -------------------- | -------------------------------------------- |
| `purchased`          | Confirmation, solde et inventaire actualisés |
| `already-owned`      | Article marqué « Déjà possédé »              |
| `unavailable`        | Article et bouton marqués indisponibles      |
| `insufficient-funds` | Message de solde insuffisant                 |
| `rejected`           | Message d'article refusé/inconnu             |

Une exception (notamment une erreur d'écriture) affiche une erreur et ne
présente pas l'achat comme réussi.

## Chargement, erreur et catalogue vide

Le chargement est différé d'un tour pour conserver un état visible. Une erreur
de lecture du catalogue, de l'inventaire ou du solde affiche « Réessayer ». Un
catalogue Core vide affiche son état dédié.

La prop optionnelle `shopService` existe uniquement pour les tests composants
et les prévisualisations explicites. Elle doit fournir les quatre mêmes
fonctions que la façade. Les données fictives de
`src/mocks/shop.mock.js` ne sont jamais la source par défaut de production.

## Accessibilité et contrôle manuel

- Les chargements, résultats d'achat, erreurs et catalogue vide sont annoncés.
- Les boutons possédés, indisponibles ou temporairement en cours d'achat sont
  désactivés ; le focus visible est conservé.
- La grille est adaptative et l'en-tête passe en colonne sous 620 px.

Pour vérifier localement : lancer `npm run dev`, ouvrir `#/shop`, tester le
catalogue à 375 px puis à largeur bureau, acheter un article disponible et
contrôler le solde, le statut, le message annoncé et la navigation avec Tab,
Entrée et Espace.

## Point de coordination

Le catalogue effectif du Core contient actuellement quatre articles, alors que
`docs/contracts/core-api.md` mentionne encore un catalogue vide. Ce document de
contrat relève de G1/G5 et n'est pas modifié par cette tâche G4.
