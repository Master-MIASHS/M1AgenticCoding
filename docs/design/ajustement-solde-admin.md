# Conception — Ajustement du solde par l'admin et rôle admin en mode dev (G1, #322)

## Objectif

Débloquer l'écran Admin du G4 (#269) avec les deux points validés par le G5 dans #255 (@Nina253, 09/10) :

1. l'admin ajoute ou retire des jetons au joueur, avec une trace dans l'historique ;
2. un moyen explicite de devenir admin pendant le développement, car le rôle vaut `player` pour tout le monde et toutes les fonctions protégées sont refusées.

## Non-objectifs

- `userId` : les profils multiples (n°5) n'existent pas. L'ajustement porte sur le **profil courant** ; la signature recevra un identifiant avec n°5.
- `updatePlayerRole`, `setPlayerStatus` (#255, points 3 et 4) : profils multiples et modération (n°34).
- `state.js` (Ahmed) et `economy.js` (Amina, #287) ne changent pas : tout passe par `updateState`.
- Contrat `docs/contracts/core-api.md` : jamais modifié par un agent (règle 6), demande au G5.

## Conception

`src/core/admin.js` (nouveau) :

| Fonction | Rôle |
|---|---|
| `TYPE_AJUSTEMENT_ADMIN` | `'ADMIN_ADJUSTMENT'`, type des entrées d'historique créées par l'admin |
| `estAjustementAdmin(entree)` | Vrai pour une entrée d'ajustement (les parties n'ont pas de `type`) |
| `createAdministration({ getState, updateState, maintenant, estModeDev })` | Fabrique testable : `ajusterSolde(montant)`, `activerRoleAdminDev()` |
| `ajusterSoldeAdmin(montant)`, `activerRoleAdminDev()` | Instance partagée sur le vrai état, exposée par `core.js` → `coreService` |

Noms dans la façade : `updatePlayerBalance(amount)` (nom déjà appelé par `Admin.jsx`) et `activerRoleAdminDev()`.

### Ajustement du solde

```js
updatePlayerBalance(-150);
// → { type: 'ADMIN_ADJUSTMENT', amount: -150, balanceBefore: 400, balanceAfter: 250,
//     adjustedAt: '2026-10-10T18:00:00.000Z' }
```

- `amount` : nombre fini, non nul, au centime près (positif = ajout, négatif = retrait).
- Le rôle est relu **dans la transaction** (`assertCanModifyConfig(etat.role)`), jamais reçu de l'UI.
- Solde final `< 0` → `RangeError`, rien n'est modifié (le G5 laissait le choix « échec ou troncature » : l'échec évite un retrait silencieusement différent de celui demandé).
- `bestBalance = max(bestBalance, balanceAfter)` : il monte avec un ajout, ne baisse jamais avec un retrait.
- XP, niveau et jeux débloqués ne changent pas : ce n'est pas une partie.
- L'entrée est ajoutée à `history` dans la même écriture que le solde.

### Rôle admin en mode dev

- `activerRoleAdminDev()` passe le rôle du profil courant à `admin` et renvoie `'admin'`.
- Accepté seulement si `import.meta.env.DEV === true` (application lancée par Vite en développement). Dans le site compilé et sous Node, refus avec une erreur : la bascule ne contourne pas les permissions en production.

### Historique partagé

Les entrées d'ajustement vivent dans `history` à côté des parties. Les consommateurs qui comptent des parties doivent les ignorer :

- `stats.js` (`getGlobalStats`) : ignorées (sinon `validerPartie` lèverait une erreur) ;
- badges (#273) : le compteur `partiesJouees` les ignore aussi.

## Décisions

| Décision | Pourquoi |
|---|---|
| Refus si le solde passerait sous 0 | Invariant G5 ; pas de retrait partiel caché |
| Montant au centime | Même précision que le règlement (#131) |
| Rôle lu dans `updateState` | Pas de rôle venant de l'UI (règle 5), pas de course entre lecture et écriture |
| Bascule réservée au mode dev | Option « bascule explicite en mode dev » validée par le G5 |
| Façade sans options | Leçon de #227 : l'horloge et le mode dev ne sont injectables que dans les tests |

## Tests

- `tests/unit/admin.test.js` : fabrique avec un faux état (ajout, retrait, refus sous 0, rôle `player` refusé, montant invalide, `bestBalance`, entrée d'historique, bascule dev / hors dev).
- `tests/unit/admin.facade.test.js` : via `coreService`, rôle `player` refusé et bascule refusée hors dev.
- `tests/unit/stats.test.js` : une entrée d'ajustement n'est pas comptée comme une partie.
