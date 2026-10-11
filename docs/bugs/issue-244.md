# Issue #244 : Groupe 1 — Refuser un meilleur solde inférieur au solde restauré

## Problème
Signalé par Ania dans #61 et #240 : restoreState/importSave acceptent un état avec bestBalance < balance alors que updateState le refuse. Une sauvegarde à hash correct peut donc installer un état incohérent.

## Correction ciblée (Ahmed, state.js)
Appliquer bestBalance >= balance dans la validation commune de l’état. Un import manuel invalide doit conserver mémoire et stockage sans écriture ; au démarrage, le repli robuste de #240 doit s’appliquer sans écraser la sauvegarde.

## Vérification
Reproduire via importSave avec hash valide ; tester refus/absence d’écriture, démarrage sur données incohérentes, égalité acceptée et restauration d’une ancienne sauvegarde cohérente avec XP/meilleur solde inférieurs (règle de restauration inchangée). Tests, lint, build et revue indépendante avant PR.

Pas de changement de format de sauvegarde, ni de modification de storage.js, des contrats ou des règles de solde négatif. Lié à #61 et #240.


## Rapport de reproduction

**Statut : REPRODUIT** — processus Node isolés, code source et Git inchangés.

### Import manuel avec empreinte valide

Depuis la racine, exécuter `node --input-type=module` avec :

```js
const writes = [];
const saved = new Map();
globalThis.localStorage = {
  getItem: key => saved.get(key) ?? null,
  setItem: (key, value) => { writes.push(key); saved.set(key, value); },
};
const { getState, importSave } = await import('./src/services/coreService.js');
const { computeIntegrityHash } = await import('./src/core/storage.js');
const { updateState } = await import('./src/core/state.js');
const data = { ...getState(), balance: 2000, bestBalance: 1000 };
const hash = computeIntegrityHash(JSON.stringify(data));
importSave(JSON.stringify({ version: 1, hash, data }));
console.log({ hash, state: getState(), writes });
updateState(state => state);
```

Preuve observée : hash `665775c4`, import accepté sans erreur, état mémoire et `casino_state` avec `balance: 2000`, `bestBalance: 1000`, une écriture sur `casino_state`. L'appel suivant à `updateState(state => state)` lève `state: progression ou meilleur solde invalide.` même sans modifier l'état. La reproduction a capturé cette erreur ; son processus termine avec le code 0.

Attendu : l'import refuse l'état incohérent et conserve le précédent état en mémoire et le stockage, sans écriture.

### Chargement au démarrage

Dans un second processus neuf, un faux `localStorage.getItem` renvoie le JSON brut du même état incohérent avant le premier import de `state.js`. Résultat : `getState()` renvoie `balance: 2000`, `bestBalance: 1000` ; zéro avertissement et zéro écriture. Le démarrage accepte donc lui aussi cet état au lieu d'appliquer le repli robuste vers l'état par défaut, tout en conservant la sauvegarde brute.

Cause confirmée dans `src/core/state.js` : `validateState` vérifie seulement que les deux soldes sont finis. La relation `bestBalance >= balance` est contrôlée uniquement dans `updateState`, tandis que `restoreState` et `readInitialState` passent uniquement par la validation commune.

## Rapport de vérification

**Statut : CORRECTION_VERIFIEE** — revue indépendante du diff courant, sans modification du code ni de Git.

- `node --test tests/unit/state-restoration.test.js tests/unit/core.contract.test.js` : 11 tests réussis, zéro échec, code 0. Couverture du refus d'import à hash valide sans mutation ni écriture, du refus interne, du repli au démarrage sans écrasement du stockage, et de la restauration d'une ancienne sauvegarde cohérente à progression inférieure.
- Processus Node indépendant : le cas initial `balance: 2000, bestBalance: 1000` est désormais refusé ; mémoire et chaîne stockée restent strictement identiques, zéro écriture. Des imports avec égalité (1000/1000), meilleur solde supérieur (500/1000) et solde négatif cohérent (-10/0) sont acceptés. Ce dernier cas vérifie uniquement que le correctif ne change pas les règles existantes concernant les soldes négatifs.
- Lecture du diff : l'invariant est placé dans `validateState`, commun à la restauration et au démarrage ; aucune comparaison avec la progression de la session courante n'est ajoutée. Le format et `storage.js` sont inchangés. Les fixtures de contrat sont rendues cohérentes et le test d'échec de persistance vérifie précisément `storage unavailable`.

Aucun problème critique ou requis identifié. La suite globale, le lint et le build restent couverts par les commandes de l'agent principal ; ils n'ont pas été relancés dans cette revue ciblée.
