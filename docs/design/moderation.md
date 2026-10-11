# Conception — Modération minimale (G1, tâche n°34, #352)

## Objectif

AGENTS.md : le modérateur peut « désactiver un compte pour triche ». Décision du G5 (discussion #9, 05/10) : strict minimum dans le Core, un indicateur `isBanned`.

## Non-objectifs

- Profils multiples (n°5) : le statut porte sur le **profil courant**.
- Signalements, comptes suspects : modération avancée, « pas une priorité » (G5).
- `state.js` (Ahmed), `economy.js` (Amina, #287) et `shop.js` ne changent pas : le refus est ajouté dans `core.js`, comme le contrôle du rôle de `setGameConfig` (#211).

## Conception

`src/core/moderation.js` (nouveau) :

| Fonction | Rôle |
|---|---|
| `estCompteDesactive(etat)` | Pure : `etat.isBanned === true` |
| `assertCompteActif(etat)` | Lève une erreur si le compte est désactivé |
| `createModeration({ updateState })` | Fabrique testable : `setPlayerStatus(status)` |
| `setPlayerStatus(status)` | Instance partagée sur le vrai état, exposée par la façade |

- `status` : `'banned'` ou `'active'`. Autre valeur : `TypeError`.
- Rôle : **modérateur ou plus** (`hasMinimumRole(role, 'moderator')`), relu dans l'état **dans la transaction**. Un joueur est refusé et rien n'est écrit.
- Écriture : `isBanned: true|false` dans `casino_state`, une seule écriture. Solde, XP, niveau, jeux et historique sont inchangés : un compte désactivé garde ses acquis.
- Retour : le statut enregistré.

`core.js` : `play`, `purchaseShopItem` et `claimDailyBonus` deviennent des fonctions qui appellent `assertCompteActif(getState())` puis la fonction interne, avec les mêmes arguments. Les lectures (`getState`, `getBalance`, classement, historique, badges) restent ouvertes.

## Décisions

| Décision | Pourquoi |
|---|---|
| Modérateur ou plus | AGENTS.md : rôles cumulatifs, le modérateur désactive un compte |
| Refus dans le Core, avant écriture | Règle 5 : masquer un bouton ne suffit pas |
| Garde dans `core.js` | Ne touche pas aux fichiers d'Amina (#287), d'Ahmed et à la boutique ; même modèle que `setGameConfig` (#211) |
| Acquis conservés | Un compte désactivé n'est pas un compte supprimé ; `'active'` le rétablit tel quel |

## Tests

- `tests/unit/moderation.test.js` : faux état ; désactiver puis réactiver, joueur refusé, statut invalide, acquis conservés.
- `tests/unit/moderation.facade.test.js` : via `coreService`, compte désactivé → `play`, `purchaseShopItem` et `claimDailyBonus` refusés sans écriture, lectures possibles ; réactivé → achat possible.
