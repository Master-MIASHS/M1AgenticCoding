# Contrat Core intégré — Boutique

> **Statut : implémenté sur `main`.** La page G4 consomme les opérations
> publiques de `coreService`; elle n'importe aucun module interne du Core.

## API consommée

```js
getShopCatalog();
// -> Array<{ id, name, description, category, price, visual?, available }>

getShopInventory();
// -> { ownedItemIds: string[] }

purchaseShopItem(itemId);
// -> {
//      status: 'purchased' | 'already-owned' | 'unavailable' |
//              'insufficient-funds' | 'rejected',
//      itemId: string,
//      balance: number,
//      message?: string
//    }
```

Ces appels sont synchrones dans l'implémentation actuelle. `purchaseShopItem`
est seul responsable de la disponibilité, de la possession, du solde et de la
mutation atomique. L'UI transmet l'identifiant, affiche le résultat et ne
calcule jamais de débit.

## Intégration G4

1. charger catalogue, inventaire et solde via la façade ;
2. afficher `available`, la présence dans `ownedItemIds` et les données reçues ;
3. envoyer l'identifiant de l'article au Core lors d'un achat ;
4. utiliser le solde retourné et relire l'inventaire ;
5. afficher une erreur si l'appel lève, sans annoncer de succès.

Seul `purchased` modifie l'état Core. Les refus ne modifient pas le solde. Le
meilleur solde, l'XP et le niveau ne sont pas modifiés par un achat.

## Limite documentaire externe

`docs/contracts/core-api.md` indique encore que le catalogue est vide, alors
que `src/core/config/shop.config.js` et les tests Core exposent quatre articles.
Cette incohérence relève de G1/G5 ; elle est signalée ici sans modifier leur
contrat.
