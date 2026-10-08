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
