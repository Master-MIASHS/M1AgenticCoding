# Conception — Boutique côté Core (G1, tâche n°37, #205)

## Objectif

Permettre au joueur d'**acheter un article de la boutique avec ses jetons fictifs** : le Core fournit le catalogue, l'inventaire du joueur et l'achat, selon la proposition de contrat du G4 (`src/pages/Shop/SHOP_CORE_CONTRACT.md`).

## Non-objectifs

- **Aucun écran** : la page Boutique est au G4 (#20, PR #103).
- **Aucun contenu inventé** : le contenu de la boutique est une décision ouverte d'`AGENTS.md`. Le catalogue par défaut est vide ; les articles du mock du G4 ne sont pas repris.
- **Aucun effet des articles** (avatar, thème, effet visuel) : leur affichage relève du G3 / G4.
- **Pas de modification de `state.js`** ni d'exposition dans `core.js` / `coreService.js` : branchement (n°8) et exposition (n°6) par @ahmed-abc73.
- **Aucun vrai argent** (règle 1) : uniquement des jetons fictifs.

## Conception

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `src/core/config/shop.config.js` | Catalogue de la boutique (vide par défaut) |
| `src/core/shop.js` | Validation du catalogue et opérations de la boutique |
| `tests/unit/shop.test.js` | Tests unitaires (`node:test`) |

### Article du catalogue (contrat G4)

```js
{
  id: 'avatar_chapeau',     // chaîne non vide, unique dans le catalogue
  name: 'Le Grand Chapeau',
  description: '…',
  category: 'avatars',
  price: 200,               // entier ≥ 0, en jetons fictifs
  visual: '🎩',             // facultatif
  available: true,          // false : visible mais pas achetable
}
```

### Fonctions de `src/core/shop.js`

| Fonction | Rôle |
|---|---|
| `validerCatalogue(catalogue)` | Vérifie la forme de chaque article et l'unicité des identifiants |
| `createShop({ getState, updateState }, options)` | Renvoie les trois opérations, avec le stockage injecté et le catalogue de la config (ou `options.catalogue`) |
| `getShopCatalog()` | Copie du catalogue |
| `getShopInventory()` | `{ ownedItemIds }`, copie de l'inventaire du joueur (`[]` s'il n'a rien acheté) |
| `purchaseShopItem(itemId)` | `{ status, itemId, balance, message? }` |

### Statuts d'un achat (vérifiés dans cet ordre)

| Statut | Cas | Écriture |
|---|---|---|
| `rejected` | `itemId` n'est pas une chaîne ou n'existe pas dans le catalogue | aucune |
| `unavailable` | l'article a `available: false` | aucune |
| `already-owned` | l'article est déjà dans l'inventaire | aucune |
| `insufficient-funds` | le solde est inférieur au prix | aucune |
| `purchased` | sinon : solde débité **et** article ajouté, en une seule écriture `updateState` | une |

`balance` est toujours le solde après l'opération (inchangé si l'achat est refusé).

## Décisions

| Décision | Pourquoi |
|---|---|
| Stockage injecté (`getState`, `updateState`) | Règle commune du G1 (comme `createProgression(store)`, validé dans #79) : implémenter et tester sans attendre le branchement (n°8). |
| Une seule écriture `updateState` par achat | Solde et inventaire changent ensemble ou pas du tout (#139). |
| Achat seulement si `solde ≥ prix` | Le solde ne passe jamais sous 0 : on n'a pas à trancher la décision ouverte « le solde peut-il passer sous 0 ? ». |
| Meilleur solde, XP et niveau inchangés | Invariants d'`AGENTS.md` : l'XP se gagne en jouant, le meilleur solde ne redescend jamais. |
| Prix entiers ≥ 0 | Évite les erreurs d'arrondi ; un prix nul reste possible. |
| Catalogue vide par défaut | Contenu = décision ouverte ; question posée au G5 dans #205. |
| Inventaire dans le champ `ownedItemIds` de l'état | Nom proposé par le G4 ; à confirmer par @ahmed-abc73 (propriétaire de `state.js`). |
| Erreurs de stockage propagées | Comme `updateState` (#139) : ne jamais annoncer un achat qui n'a pas été enregistré. |
| Erreurs `Error` avec message en français | Cohérent avec `rng.js`, `player.js` et `ai/poker.js`. |

## Points ouverts

- **Contenu du catalogue** : articles et prix à fixer par le G5 (#205).
- **Champ `ownedItemIds`** dans le schéma de `casino_state` : à confirmer et à ajouter par @ahmed-abc73 au branchement.
- **Synchrone ou `Promise`** : le G4 accepte les deux ; le Core reste synchrone comme le reste de son API.

## Risques

- Tant que le catalogue est vide, la boutique n'affiche aucun article.
- Sans branchement (n°8) ni exposition (n°6), le G4 ne peut pas encore appeler ces fonctions via `coreService`.
- Si `ownedItemIds` est renommé dans l'état, seul `shop.js` est à adapter.

## Plan de tests

Commande : `npm test` (fichier `tests/unit/shop.test.js`). Le stockage est simulé par un faux `getState` / `updateState` qui imite le contrat de #139.

| `describe` / `it` | Avant implémentation | Après |
|---|---|---|
| `shop.config` — fournit un catalogue vide par défaut | échec (module absent) | succès |
| `shop.config` — ne peut pas être modifiée par erreur | échec | succès |
| `validerCatalogue` — accepte un catalogue valide | échec | succès |
| `validerCatalogue` — rejette un article mal formé (id, nom, prix non entier ou négatif, `available` non booléen) | échec | succès |
| `validerCatalogue` — rejette deux articles de même identifiant | échec | succès |
| `createShop` — rejette un stockage ou un catalogue invalide | échec | succès |
| `getShopCatalog` — renvoie une copie indépendante du catalogue | échec | succès |
| `getShopInventory` — renvoie `[]` sans achat, puis une copie de l'inventaire | échec | succès |
| `purchaseShopItem` — `rejected` pour un article inconnu, sans écriture | échec | succès |
| `purchaseShopItem` — `unavailable` pour un article indisponible, sans écriture | échec | succès |
| `purchaseShopItem` — `already-owned` pour un article déjà possédé, sans écriture | échec | succès |
| `purchaseShopItem` — `insufficient-funds` si le solde est inférieur au prix, sans écriture | échec | succès |
| `purchaseShopItem` — `purchased` : débite le solde et ajoute l'article en une seule écriture | échec | succès |
| `purchaseShopItem` — ne modifie ni le meilleur solde, ni l'XP, ni le niveau | échec | succès |
| `purchaseShopItem` — vérifie la possession avant le solde | échec | succès |
| `purchaseShopItem` — accepte un solde égal au prix et un article gratuit | échec | succès |
| `purchaseShopItem` — refuse un second achat du même article | échec | succès |
| `purchaseShopItem` — propage une erreur d'écriture | échec | succès |
| `purchaseShopItem` — fonctionne avec le vrai `getState` / `updateState` de `state.js` (#139) | échec | succès |
