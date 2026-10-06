# Proposition de contrat Core — Boutique

> **Statut : non validé.** Aucune des opérations ci-dessous n'est actuellement
> exposée par le Core ou par `coreService`. Ce document sert uniquement de
> point de coordination avec le Groupe 1 ; les achats restent indisponibles
> jusqu'à validation puis implémentation du contrat.

L'écran Boutique utilise temporairement `src/mocks/shop.mock.js` pour son catalogue et ses états de présentation. Il n'implémente aucune règle économique et n'écrit pas dans `localStorage`.

Proposition à discuter avec le Groupe 1 : exposer les opérations suivantes
depuis `src/core/core.js`, puis les ré-exporter sans logique dans
`src/services/coreService.js` :

```js
getShopCatalog()
// -> Array<{ id, name, description, category, price, visual?, available }>

getShopInventory()
// -> { ownedItemIds: string[] }

purchaseShopItem(itemId)
// -> {
//      status: 'purchased' | 'already-owned' | 'unavailable' |
//              'insufficient-funds' | 'rejected',
//      itemId: string,
//      balance: number,
//      message?: string
//    }
```

`purchaseShopItem` est l'unique responsable de la validation de disponibilité, de possession, du solde et de toute mutation économique. La page devra alors :

1. charger le catalogue et l'inventaire via la façade ;
2. calculer uniquement l'état visuel à partir de ces réponses ;
3. envoyer l'identifiant de l'article au Core ;
4. afficher le résultat retourné, puis recharger le solde et l'inventaire.

Le format asynchrone (`Promise`) est accepté et recommandé si le Core évolue, mais les trois opérations doivent conserver ces données et ces responsabilités.
