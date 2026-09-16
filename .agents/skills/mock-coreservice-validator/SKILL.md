---
name: mock-coreservice-validator
description: Verifie que les mocks de coreService.js utilises dans les tests unitaires de G2/G3/G4 ont exactement la meme forme (fonctions, signatures) que le vrai coreService.js. A utiliser des qu'un test unitaire mock le Core.
---

# Mock CoreService Validator

## Quand l'utiliser

- Un test unitaire (G2, G3 ou G4) importe une version mockée de `coreService.js` au lieu du vrai module.
- Avant de remplacer un mock par l'appel réel dans les tests (bascule mock → réel).
- En revue de PR, dès qu'un fichier sous `tests/` contient `jest.mock`, un stub manuel, ou un objet littéral qui imite `coreService`.

C'est la version **spécifique aux tests unitaires** de la vérification que fait `.agents/skills/architecte-integration/SKILL.md` au niveau de l'intégration globale — ici on regarde uniquement la cohérence mock/réel dans le code de test.

## Ce que fait cette skill

1. **Lister les exports réels de `src/services/coreService.js`** (la liste de référence actuelle, à vérifier à chaque usage car elle évolue) :
   `getState`, `roll`, `play`, `getBalance`, `claimDailyBonus`, `requestLoan`, `addXP`, `getLevel`, `getUnlockedGames`, `getLeaderboard`, `getHistory`, `setGameConfig`, `getGlobalStats`, `exportSave`, `importSave`.
   (Cette liste est déjà vérifiée par `tests/unit/core.contract.test.js` — s'appuyer sur ce test comme source de vérité plutôt que de la recopier à l'aveugle si le fichier a évolué.)
2. **Comparer à chaque mock trouvé dans les tests** :
   - Toutes les fonctions mockées existent-elles réellement dans `coreService.js` ? (sinon, le mock teste une API imaginaire)
   - Le mock a-t-il oublié une fonction utilisée ailleurs dans le test ? (sinon, `undefined is not a function` en silence si le test ne l'appelle jamais, ou crash si mal placé)
   - Les types de retour du mock correspondent-ils à ce que la vraie fonction renvoie (objet vs primitive, présence des bons champs) ?
3. **Vérifier la valeur des retours mockés** : un mock qui renvoie toujours un cas nominal (ex. `getBalance()` renvoie toujours un nombre positif) masque les cas limites — signaler si aucun test du même fichier ne mocke un cas d'erreur ou une valeur limite (solde à 0, historique vide, etc.).
4. **Rapporter** : liste des mocks vérifiés, écarts trouvés (fonction manquante, forme différente), et fichiers de test concernés.

## Sortie attendue

```
Mock trouvé : tests/unit/games/blackjack.test.js

| Fonction mockée | Existe dans coreService.js | Forme cohérente |
|---|---|---|
| getBalance | ✅ | ✅ |
| play | ✅ | ⚠️ le mock renvoie {result}, le vrai coreService.play renvoie {result, newBalance} |
| getXP | ❌ n'existe pas dans coreService.js (c'est addXP) | — |

Action : corriger le mock avant que ce test masque une vraie régression au moment de la bascule vers l'API réelle.
```

## Ce que cette skill ne fait PAS

- Ne modifie pas `coreService.js` lui-même pour coller au mock — c'est toujours le mock qui doit suivre le réel, jamais l'inverse.
- N'écrit pas les tests à la place de l'auteur — elle vérifie la cohérence du mock utilisé, pas la qualité des assertions (voir une skill dédiée pour ça si besoin).
- Ne bloque pas l'usage de mocks en général — les mocks sont légitimes en attendant l'API réelle (cf. `AGENTS.md`), elle vérifie juste leur fidélité.

## En cas de doute

Si `coreService.js` n'expose pas encore une fonction utilisée dans un mock (fonctionnalité pas encore développée côté Core), signaler comme dépendance bloquante vers G1 plutôt que de valider un mock qui invente une API qui n'existera peut-être jamais sous cette forme.
