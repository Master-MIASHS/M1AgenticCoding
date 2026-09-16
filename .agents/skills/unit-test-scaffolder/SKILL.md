---
name: unit-test-scaffolder
description: Genere le squelette d'un test unitaire node:test pour un fichier source donne, au bon emplacement et avec les bons imports. A utiliser des qu'un module n'a pas encore de test associe.
---

# Unit Test Scaffolder

## Quand l'utiliser

- Un fichier dans `src/` (core, games, services, components...) n'a pas de fichier de test associé.
- Avant de commencer à écrire la logique d'un module, pour poser la structure de test en premier (TDD léger).
- Après un refactor qui déplace un fichier source, pour déplacer/renommer son test en cohérence.

## Convention du projet

- Runner : **`node:test`** (pas Jest, pas Vitest — `package.json` définit `"test": "node --test"`).
- Assertions : **`node:assert/strict`**.
- Emplacement : miroir de `src/` sous `tests/unit/`, ex. `src/core/rng.js` → `tests/unit/core/rng.test.js`.
- Suffixe de fichier : `.test.js`.
- Import du module testé en chemin relatif explicite (voir `tests/unit/core.contract.test.js` comme référence de style).

## Ce que fait cette skill

1. **Repérer le fichier source** à tester et son chemin.
2. **Déduire le chemin de test** en miroir sous `tests/unit/` (créer les dossiers manquants si besoin).
3. **Générer un squelette minimal** :
   ```js
   import { test } from 'node:test';
   import assert from 'node:assert/strict';

   import { /* exports pertinents */ } from '<chemin-relatif-vers-la-source>';

   test('<nom du module> - <comportement attendu>', () => {
     // Arrange

     // Act

     // Assert
     assert.equal(/* ... */);
   });
   ```
4. **Lister les cas à couvrir**, à partir de la signature du module et des règles du projet :
   - Cas nominal.
   - Cas limite (valeurs vides, zéro, négatif si pertinent).
   - Cas d'erreur explicite si le module peut lever/rejeter.
   - Si le module touche un invariant métier (`AGENTS.md`) ou le RNG (`src/core/rng.js`), toujours prévoir un cas dédié — voir la skill `core-invariant-tests` pour celui-là spécifiquement.
5. **Ne jamais laisser un test vide ou un `assert.ok(true)` de remplissage** — chaque `test()` généré doit avoir au moins une assertion réelle, ou être explicitement marqué `// TODO: assertion à écrire` pour qu'il ne passe pas silencieusement pour rien.

## Ce que cette skill ne fait PAS

- N'écrit pas la logique métier du module testé — seulement le test.
- Ne invente pas de comportement non spécifié : si la fonction n'a pas de spec claire (pas de contrat, pas de description), le signaler plutôt que de deviner ce qu'elle est censée faire.
- Ne supprime pas de test existant.

## En cas de doute

Si le module touche l'API publique du Core, vérifier d'abord `docs/contracts/` (si présent) ou `.agents/skills/architecte-integration/SKILL.md` pour la forme attendue avant d'écrire le test.
