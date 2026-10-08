# Contrat de l'API publique du Core — G1 ↔ G2, G3, G4

| | |
|---|---|
| **Ticket** | #267 |
| **Statut** | Proposition, en relecture G1 + G5 |
| **Source de vérité** | `src/core/core.js`, réexporté sans logique par `src/services/coreService.js` (état de `main` au 08/10, `7bd792f`) |
| **Contrats liés** | `docs/contracts/cards-contract.md` (format des cartes, `melanger`) |
| **Guide d'utilisation** | skill `.agents/skills/utiliser-core/SKILL.md` |

Toute évolution de ce contrat passe par une issue adressée au G1 et au G5 (règle 6 de `AGENTS.md`).

## 1. Règles communes

1. **Accès par la façade uniquement.** G3 et G4 importent depuis `src/services/coreService.js`. Le G2 reçoit le Core par injection (`draw(core, context)`, orchestrateur `createGame`) et n'importe jamais `src/core/`.
2. **Synchrone.** Toutes les fonctions sont synchrones ; aucune ne renvoie de `Promise`.
3. **Copies indépendantes.** Les objets et tableaux renvoyés sont des copies : les modifier ne change pas l'état du Core. Relire après une opération.
4. **Erreurs explicites, aucune écriture partielle.** Une entrée invalide ou une opération refusée lève une `Error` (ou `TypeError` / `RangeError`) et **ne modifie rien**. Les écritures passent par une mise à jour atomique de l'état (`updateState`, #139) : tout ou rien.
5. **Le Core décide, l'UI affiche** (règle 3). Les fonctions publiques ne prennent jamais d'option injectable (configuration, stockage, horloge) : l'appelant ne peut pas choisir un capital, un catalogue ou un réglage.
6. **Permissions dans le Core** (règle 5). Les fonctions marquées **admin** lisent le rôle dans l'état et lèvent une erreur si ce n'est pas `admin`. Masquer un bouton ne suffit pas.
7. **Jetons fictifs uniquement** (règle 1) et **hasard uniquement par le RNG du Core** (règle 2).
8. **Invariants garantis par le Core** : l'XP, le niveau et le meilleur solde ne diminuent jamais ; le solde ne passe jamais sous 0 par un achat ou un règlement.

**Statut des fonctions :** ✅ réel · 🟡 partiel (limite indiquée) · 🧪 mock (valeur fictive, à ne pas présenter comme réelle).

## 2. Vue d'ensemble

| Fonction | Rôle | Accès | Statut |
|---|---|---|---|
| `getState()` | Lire l'état du joueur | public | ✅ |
| `creerProfil(infos)` | Créer le profil du joueur | public | ✅ |
| `roll(gameId, params?)` | Hasard brut dans `[0, 1)` | public | ✅ |
| `tirageEntier(min, max)` | Entier uniforme, bornes incluses | public | ✅ |
| `tirageAvecPoids(elements, poids)` | Élément tiré selon des poids | public | ✅ |
| `melanger(liste)` | Permutation aléatoire | public | ✅ |
| `play(gameId, bet, gameResult)` | Régler une partie | public | 🟡 |
| `getBalance()` | Lire le solde | public | ✅ |
| `claimDailyBonus()` | Bonus quotidien à 0 jeton | public | ✅ |
| `requestLoan(amount)` | Prêt (abandonné) | public | 🧪 déprécié |
| `addXP(amount)` | Ajouter de l'XP | public | ✅ |
| `getLevel()` | Lire le niveau | public | ✅ |
| `getUnlockedGames()` | Jeux débloqués | public | 🟡 |
| `getLeaderboard()` | Classement | public | 🧪 |
| `getHistory()` | Historique des parties | public | 🧪 |
| `getShopCatalog()` | Catalogue de la boutique | public | ✅ |
| `getShopInventory()` | Articles possédés | public | ✅ |
| `purchaseShopItem(itemId)` | Acheter un article | public | ✅ |
| `exportSave()` | Exporter la sauvegarde | public | ✅ |
| `importSave(texte)` | Importer une sauvegarde | public | ✅ |
| `setGameConfig(gameId, config)` | Régler un jeu | **admin** | 🟡 |
| `getGlobalStats()` | Statistiques globales | public | 🧪 |

## 3. État et profil

### `getState()` ✅

```js
getState() // → { balance, bestBalance, xp, level, unlockedGames, history, role, pseudo?, birthDate?, ownedItemIds? }
```

| Champ | Type | Sens |
|---|---|---|
| `balance` | nombre fini ≥ 0 | Solde de jetons fictifs |
| `bestBalance` | nombre fini ≥ `balance` | Meilleur solde atteint (score du classement), ne diminue jamais |
| `xp` | nombre fini ≥ 0 | XP cumulée, ne diminue jamais |
| `level` | entier ≥ 1 | Niveau, ne diminue jamais |
| `unlockedGames` | `string[]` | Identifiants des jeux débloqués |
| `history` | `Array` | Historique des parties (vide tant que `play()` n'enregistre rien, voir § 5) |
| `role` | `'player'` \| `'admin'` | Rôle du joueur (`'player'` par défaut) |
| `pseudo`, `birthDate` | chaîne ; date `AAAA-MM-JJ` ou `null` | **Présents seulement après `creerProfil()`** : prévoir un affichage par défaut |
| `ownedItemIds` | `string[]` | **Présent seulement après un premier achat** (voir § 7) |

- Copie indépendante ; aucune erreur attendue (au démarrage, un état enregistré illisible est remplacé par l'état par défaut avec un avertissement, #240).
- `xpForNextLevel` n'existe pas encore (voir § 10).

### `creerProfil(infos)` ✅

```js
creerProfil({ pseudo: 'Olti', dateNaissance: '2002-03-15' }) // dateNaissance facultative
// → copie de l'état enregistré, avec pseudo et birthDate
```

- Construit le joueur (capital de départ lu dans la configuration, jeux de niveau 1) et l'enregistre **en une seule écriture**.
- Seul `infos` est accepté : l'appelant ne choisit ni le capital ni les jeux.
- **Erreurs** (rien n'est enregistré) : pseudo absent ou vide (espaces retirés) ; date au mauvais format, inexistante ou future ; **profil déjà existant** ; **état déjà utilisé** (partie jouée, solde dépensé, article acheté, jeux ou rôle différents d'un nouveau joueur) ; capital inférieur au meilleur solde de l'état.
- Un seul profil pour l'instant (plusieurs profils : non disponible).

## 4. Hasard

Seule source de hasard du projet (règle 2) : aucune de ces fonctions ne décide d'un gain ou d'une perte, c'est le jeu (G2) qui interprète la valeur tirée.

### `roll(gameId, params?)` ✅

```js
roll('slots') // → { gameId: 'slots', value: 0.4183…, nonce: 418392 }
```

- `value` : flottant dans `[0, 1)`. `nonce` : entier brut, **non garanti unique** (ne pas l'utiliser comme identifiant). `params` est ignoré.

### `tirageEntier(min, max)` ✅

```js
tirageEntier(0, 36) // → entier entre 0 et 36 inclus
```

- **Erreur** si une borne n'est pas un entier sûr (`Number.isSafeInteger`), si `min > max` ou si la largeur de l'intervalle dépasse les entiers sûrs.

### `tirageAvecPoids(elements, poids)` ✅

```js
tirageAvecPoids(['rouge', 'noir', 'vert'], [18, 18, 1]) // → 'noir'
```

- Renvoie **l'élément tiré, pas son index** (pour un index : passer `[0, 1, …, n-1]`). Un élément de poids 0 n'est jamais tiré. Les poids n'ont pas besoin de sommer à 1.
- **Erreur** si les tableaux sont vides ou de longueurs différentes, si un poids n'est pas un nombre fini ≥ 0, ou si la somme est nulle ou infinie.

### `melanger(liste)` ✅

```js
melanger(paquet) // → nouveau tableau, mêmes éléments, ordre aléatoire
```

- Fisher-Yates non biaisé ; `liste` n'est jamais modifiée ; copie superficielle (mêmes références d'objets). **Erreur** si `liste` n'est pas un tableau.
- Garanties détaillées et format des cartes : `docs/contracts/cards-contract.md`.

## 5. Économie

### `play(gameId, bet, gameResult)` 🟡

```js
play('roulette', 10, { outcome: 'win', multiplier: 2, details: {…} })
// → { newBalance: 1010, xpGained: 10, leveledUp: false }
```

| Paramètre | Contrainte |
|---|---|
| `bet` | **Mise totale** de la manche (nombre fini > 0, ≤ solde). Mises multiples : leur somme, ou `details.totalBet` si la mise a augmenté en cours de partie (#166) |
| `gameResult.multiplier` | Nombre fini ≥ 0, **mise incluse** : 2 = mise doublée, 1 = mise rendue, 0 = mise perdue |
| `gameResult.outcome` | `'win'` si multiplicateur > 1, `'push'` s'il vaut 1, `'loss'` s'il est < 1 : un écart lève une erreur |
| `gameResult.details` | Facultatif, opaque pour le Core |

- Montant reversé = mise × multiplicateur, arrondi **une seule fois au centime**.
- Appelée **une seule fois par manche**, à l'étape finale, par l'orchestrateur du G2.
- **Erreurs** : mise non finie, ≤ 0 ou supérieure au solde ; `gameResult` absent ; `outcome` inconnu ou incohérent ; multiplicateur non fini ou négatif ; montant hors des nombres supportés.
- **Limite actuelle** : le résultat est **calculé mais pas enregistré** (solde, XP, meilleur solde et historique inchangés) et `xpGained` vaut toujours 10. Branchement réel en cours (#131) : voir § 10.

### `getBalance()` ✅

```js
getBalance() // → 1000
```

### `claimDailyBonus()` ✅

```js
claimDailyBonus()
// → { claimed: true, amount: 100, newBalance: 100, nextClaimAt: 1760…}
// → { claimed: false, reason: 'balance_not_zero', remainingMs: 0 }
// → { claimed: false, reason: 'cooldown', remainingMs: 3600000 }
```

- Relance d'un joueur ruiné (invariant « jamais bloqué à 0 ») : crédite le bonus **uniquement si le solde vaut 0**, au plus une fois par délai (100 jetons et 24 h par défaut, lus dans `config/economy.config.js`).
- Solde et meilleur solde mis à jour en une seule écriture ; l'XP ne change pas. Un refus n'écrit rien.
- Limite : la date du dernier bonus n'est pas conservée après rechargement de la page.

### `requestLoan(amount)` 🧪 déprécié

- Mock historique (`{ approved: true, amount }`, rien n'est crédité). Décision G5 du 05/10 : **bonus quotidien, pas de prêt**. Ne pas l'utiliser.

## 6. Progression, classement et historique

### `addXP(amount)` ✅

```js
addXP(25) // → { xp: 125, level: 2 }
```

- Ajoute de l'XP et enregistre XP et niveau **ensemble** (#238). Le niveau est calculé avec les seuils de `config/progression.config.js` (**temporaires** : 0, 100, 250, 500, 1000) et ne diminue jamais.
- **Erreur** si `amount` n'est pas un nombre fini ≥ 0, ou si l'écriture échoue (rien n'est modifié).
- Quand `play()` appliquera l'XP (#131), ne **pas** appeler `addXP()` en plus après une partie : double gain.

### `getLevel()` ✅

```js
getLevel() // → 2
```

### `getUnlockedGames()` 🟡

```js
getUnlockedGames() // → ['slots', 'dice']
```

- Copie de `unlockedGames` de l'état. **Limite** : la liste n'est pas encore recalculée quand le niveau monte (calcul en cours : #263).

### `getLeaderboard()` 🧪

- Renvoie aujourd'hui des **joueurs fictifs** (`[{ pseudo: 'alice', balance: 5000, level: 12 }, …]`). Forme cible (`AGENTS.md`) : pseudo, meilleur solde, niveau, badges.

### `getHistory()` 🧪

- Renvoie aujourd'hui `[]`. Les entrées seront créées par `play()` (#131, format préparé dans #266) : `{ roundId, gameId, bet, outcome, payout, netGain, playedAt }`.
