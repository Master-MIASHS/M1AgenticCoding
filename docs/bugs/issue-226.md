# Issue #226 — sécuriser la création de profil (#227)

La création publique doit employer les dépendances autorisées du Core et refuser sans mutation un état déjà utilisé. Conserver l’injection interne pour les tests. Ne pas assouplir updateState ni initialiser via restoreState.

## Rapport de reproduction

**Statut : REPRODUIT** — Node v22.14.0, reproduction indépendante sur la branche courante, avant correction.

Chaque cas a été exécuté dans un processus Node neuf (`node --input-type=module`), avec un `localStorage` en mémoire dont les écritures sont comptées. Les appels métier passent par `src/services/coreService.js`. Le module interne `state.js` sert uniquement à préparer un état utilisé par `updateState`, sans `restoreState` ni modification du code.

### Procédure reproductible

Exécuter depuis la racine, une fois par cas en remplaçant `patch` et `options` par les valeurs du tableau :

```js
const writes = [];
globalThis.localStorage = {
  getItem: () => null,
  setItem: (key, value) => writes.push({ key, value }),
};
const { updateState } = await import('./src/core/state.js');
const { creerProfil, getState } = await import('./src/services/coreService.js');
const patch = {};
const options = { config: { capitalDeDepart: 999999 } };
updateState(s => ({ ...s, ...patch }));
writes.length = 0;
const before = getState();
let error = null;
try { creerProfil({ pseudo: 'Repro226' }, options); }
catch (e) { error = e.message; }
console.log({ before, after: getState(), error, writes: writes.length });
```

| Cas | `patch` | `options` | Résultat observé |
| --- | --- | --- | --- |
| Capital arbitraire public | `{}` | `{ config: { capitalDeDepart: 999999 } }` | `balance` et `bestBalance` passent de 1000 à 999999. |
| Solde déjà utilisé | `{ balance: 900 }` | `undefined` | `balance` repasse de 900 à 1000. |
| Inventaire existant | `{ ownedItemIds: ['souvenir'] }` | `undefined` | Profil créé malgré cet acquis ; inventaire conservé. |
| Jeu supplémentaire débloqué | `{ unlockedGames: ['slots', 'dice', 'blackjack'] }` | `undefined` | `unlockedGames` redevient `['slots', 'dice']` : blackjack perdu. |

Pour les quatre cas : `error: null`, `writes: 1`, ajout de `pseudo: 'Repro226'` et `birthDate: null`. Tous les processus terminent avec le code 0. Le cas inventaire a aussi été contrôlé via `getShopInventory()`, qui renvoie `{ ownedItemIds: ['souvenir'] }` après l'appel : le bug est l'acceptation d'un état utilisé, pas la suppression de l'inventaire.

### Attendu et cause identifiée

La façade doit employer les dépendances autorisées du Core ; le second argument public ne doit pas permettre d'imposer un capital. Tout état déjà utilisé doit être refusé sans mutation en mémoire ni écriture de persistance.

`src/core/core.js` réexporte directement `creerProfil` de `src/core/player.js`, qui est ensuite réexporté par `coreService.js` : l'injection interne (`config`, `jeux`, `stockage`, `maintenant`) est donc accessible publiquement. Dans `player.js`, `verifierPartieNeuve` ne contrôle que le pseudo, XP/niveau/historique et une baisse du meilleur solde. Elle ignore le solde courant, les possessions et les jeux déjà débloqués ; la fusion `{ ...courant, ...joueur }` réinitialise ensuite les champs du joueur.

## Rapport de vérification

**Statut : CORRECTION_VERIFIEE** — revue indépendante du diff non committé par rapport à `381f032`.

- `node --test tests/unit/creer-profil-security.test.js tests/unit/creer-profil.test.js` : 14 tests réussis, 0 échec, code de sortie 0.
- Reproduction indépendante rejouée dans sept processus Node isolés avec assertions : capital public injecté ignoré (1000 conservé), dépense à 900 / inventaire non vide / jeu acquis / rôle admin refusés avec état strictement identique et zéro écriture ; ordre inversé des mêmes jeux accepté ; horloge injectée publique ignorée (date de naissance 2000 acceptée malgré `options.maintenant` en 1900). Tous les processus terminent avec le code 0.
- Le wrapper public ne transmet que `infos` ; aucune des options internes ne franchit cette frontière. Le module interne conserve l'injection, vérifiée notamment avec le capital 2500 et un stockage de test initialisé au même capital.
- La garde reste exécutée avant et dans la transaction. `updateState` et `restoreState` ne sont pas modifiés par le correctif.

Revue des sources, tests et documentation : aucun problème critique ou requis identifié pour les exigences de #226/#227. La modification respecte la séparation façade publique / dépendances internes et protège les acquis concernés. Les résultats de la suite globale, du lint et du build relèvent du contrôle de l'agent principal ; ils n'ont pas été réexécutés dans cette vérification indépendante ciblée.
