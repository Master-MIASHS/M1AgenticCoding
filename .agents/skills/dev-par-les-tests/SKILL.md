---
name: dev-par-les-tests
description: Méthodologie TDD pour la logique métier et les correctifs.
---

## Compétence : dev-par-les-tests

- **Cycle TDD :** Écrire le test d'abord (`RED`), implémenter le code minimal (`GREEN`), puis nettoyer (`REFACTOR`).
- **Correction de bugs :** Obligation d'écrire un test unitaire reproduisant le bug avant de toucher au code source.
- **Runner natif Node.js :** Utiliser exclusivement `describe` et `it` depuis `node:test`, et `assert` depuis `node:assert/strict`. Ne pas injecter Jest ou Vitest.

## Quand l'utiliser

- Toute nouvelle logique métier dans `src/core/` ou `src/services/`.
- Tout correctif de bug (un test reproduit d'abord, voir `bugfix`).
- Toute fonction non triviale ajoutée ou modifiée.

## Processus TDD

1. **RED** : écrire le test (`describe`/`it`) qui exprime le comportement attendu. L'exécuter : il doit échouer, et l'échec doit montrer le comportement manquant ou erroné.
2. **GREEN** : écrire le code minimal pour faire passer le test. Rien de plus.
3. **REFACTOR** : nettoyer (noms, doublons, structure) en gardant tous les tests verts.
4. Re-exécuter `npm test` en entier avant de considérer l'étape terminée.

## Exemple

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('tirerCarte', () => {
  it('retourne une carte du paquet fourni', () => {
    const carte = tirerCarte(['7♠', 'A♣']);
    assert.ok(carte === '7♠' || carte === 'A♣');
  });
});
```

## Drapeaux rouges

- Test écrit après la correction, sans phase rouge observée.
- Test qui passe avant même d'avoir écrit le code (le test ne vérifie rien).
- Import de Jest ou Vitest.
- Test dépendant de l'ordre d'exécution ou d'un état global non isolé.

## Liens avec les autres skills

- `bugfix` : étape 5 du workflow bugfix (test de régression).
- `systematic-debugging` : comprendre le comportement avant d'écrire le test.
- `jsdoc-et-documentation` : la fonction testée est documentée si elle est dans `src/core/` ou `src/services/`.
- `ci-cd-et-automatisation` : `npm test` fait partie du Quality Gate.
- `verification-before-completion` : vérifier que le test échoue bien avant (RED) et passe bien après (GREEN).
