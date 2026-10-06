# Boutique

## Rôle et intégration

`Shop` est l'écran de consultation du catalogue temporaire de la Boutique.
Il n'applique aucune règle économique et ne réalise aucun achat. Il lit le
solde courant exclusivement par la façade publique `src/services/coreService.js`.

Sur cette branche, `src/app/App.jsx` ne référence pas encore l'écran. Lors de
la revue, `origin/main` utilise une navigation temporaire par hash et associe
la Boutique à `#/shop`. Ce raccordement appartient aux travaux de navigation
et doit être vérifié lors de l'intégration ; ce composant ne modifie ni
`App.jsx`, ni `MainLayout`, ni la Navbar.

```jsx
import Shop from './pages/Shop/Shop.jsx';

<Shop />;
```

## Entrées réelles du composant

```jsx
function Shop({ shopData = shopMock, balanceReader = getBalance })
```

- `shopData` est un objet `{ items: Item[] }`. Un `Item` affiché comporte
  `id`, `name`, `description`, `category`, `price`, `visual` et
  `availability`.
- `availability` est une valeur de présentation parmi `available`, `owned` et
  `unavailable`. Une valeur inconnue est affichée comme indisponible.
- `balanceReader` est une fonction synchrone qui renvoie un nombre fini. Par
  défaut, il s'agit de `getBalance` importé depuis `coreService`.

Ces deux entrées permettent de rendre les états sans modifier l'état du Core :

| Cas            | Entrée à fournir                                                                 | Résultat attendu                                             |
| -------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Chargement     | rendre `Shop`, avant le timer de chargement                                      | « Chargement du catalogue… » et solde en cours de chargement |
| Catalogue      | aucune, les valeurs par défaut sont utilisées                                    | quatre articles du mock temporaire                           |
| Catalogue vide | `shopData={shopMockScenarios.empty}`                                             | message de catalogue vide                                    |
| Erreur         | `shopData={shopMockScenarios.invalid}` ou un `balanceReader` qui lève une erreur | message d'erreur et bouton « Réessayer »                     |

Le chargement différé (`setTimeout(..., 0)`) conserve un cycle asynchrone
compatible avec un futur contrat Core. Les scénarios `empty` et `invalid` sont
exportés par `src/mocks/shop.mock.js`; ils ne viennent pas du Core.

## Données et statuts actuels

Le catalogue, les prix, les catégories, les visuels et les statuts d'articles
viennent entièrement de `src/mocks/shop.mock.js`. Ils sont temporaires : le
contenu de la Boutique reste une décision ouverte du projet. Le solde, lui,
vient de l'API publique existante `getBalance()` via `coreService`.

Un article marqué `available` signifie seulement qu'il est présentable dans le
catalogue temporaire. Le bouton annonce « Achat indisponible » et explique
dans une zone accessible que le contrat d'achat manque : il n'envoie aucune
demande, ne modifie pas le solde et n'écrit pas dans le stockage.

## Contrat Core

Le seul contrat aujourd'hui disponible et utilisé par cet écran est
`getBalance()` de `coreService`. Il n'existe pas encore d'opération publique
pour charger un catalogue, lire l'inventaire ou acheter un article.

[`SHOP_CORE_CONTRACT.md`](./SHOP_CORE_CONTRACT.md) est une **proposition non
validée**, destinée à la coordination avec le Groupe 1. Elle ne doit pas être
traitée comme une API implémentée : les achats restent indisponibles jusqu'à sa
validation puis son exposition par le Core et `coreService`.

## Accessibilité et vérification manuelle

Les messages de chargement, d'erreur, de catalogue vide et de retour du
bouton utilisent des régions annoncées. Les boutons désactivés correspondent
aux articles possédés ou indisponibles ; le bouton actif sert uniquement à
expliquer l'absence d'achat. La grille utilise des colonnes adaptatives et
l'en-tête passe en colonne sous 620 px.

Pour une inspection visuelle locale après intégration du routage :

1. lancer `npm run dev` ;
2. ouvrir l'URL affichée par Vite, puis `#/shop` ;
3. vérifier le catalogue à largeur bureau puis à 375 px ;
4. parcourir les boutons avec Tab et activer « Achat indisponible » ;
5. rendre temporairement `Shop` avec les scénarios `empty` puis `invalid` et
   vérifier les messages et le bouton « Réessayer ».

Les tests du dépôt ne contiennent pas encore de test d'intégration Boutique.
