# 🤖 Instructions Système : Casino Fantôme

Projet front-end collaboratif (React 18, Vite, Node.js, 25 développeurs). Ce fichier est la source de vérité pour tous les agents IA. Pour consulter le détail des règles ou proposer de nouvelles compétences, veuillez utiliser le sous-dossier `/skills/`.

---
name: flux-git-et-versionnement
description: Gère le cycle de vie Git, le nommage des branches, l'hygiène pré-commit et le format strict des messages de commit.
---

## Compétence : flux-git-et-versionnement

- **Interdiction formelle de pousser directement sur main.** Tout passe par une branche dédiée poussée vers l'origine, puis une Pull Request vers `develop`.
- **Branches éphémères :** durée de vie de 1 à 3 jours max, basées sur `develop` à jour.
- **Commits atomiques :** 1 commit = 1 seule action logique.
- **Nommage des branches :** `feat/<nom>`, `fix/<nom>`, `chore/<nom>`, `docs/<nom>`.
- **Format strict des commits :**
  `<type>(<périmètre>): [Groupe X] <description à l'infinitif> (#<issue>)`
  Types autorisés : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`. En français, tout en minuscules, sans point final.
- **Hygiène pré-commit :** Aucun secret (.env), aucun dossier de build (dist/, node_modules/), tests validés via `npm test`.

---
name: ingenierie-ui-frontend
description: Conception et règles d'architecture pour les composants de l'interface React.
---

## Compétence : ingenierie-ui-frontend

- **Composants fonctionnels uniquement** avec Hooks standards (`useState`, `useEffect`, `useMemo`, `useCallback`).
- **Séparation UI et Métier :** Obligation d'utiliser `coreService.js`. Interdiction formelle d'importer directement depuis `src/core/`.
- **Règles Casino :** Zéro appel à `Math.random()` dans les composants. Utiliser exclusivement `src/core/rng.js`.
- **Performance :** Pas de dérivation d'état inutile. Cleanup obligatoire sur les `useEffect` avec écouteurs ou timers.
- **Dépendances :** Aucune nouvelle bibliothèque UI sans validation préalable.

---
name: relecture-et-qualite
description: Grille d'évaluation et règles pour la relecture de code (Code Review).
---

## Compétence : relecture-et-qualite

- **4 axes d'analyse :** Exactitude métier, lisibilité (noms explicites), respect de l'architecture (`coreService.js`), sécurité et performance front-end.
- **Chasse au code mort :** Repérer et lister le code orphelin (imports inutilisés, anciens composants) sans le supprimer de ton propre chef.
- **Classification des retours :** Préfixer par `[CRITIQUE]` (bloquant), `[REQUIS]` (à corriger avant merge) ou `[SUGGESTION]` (optionnel).

---
name: ci-cd-et-automatisation
description: Pipeline CI/CD GitHub Actions pour valider la qualité du code.
---

## Compétence : ci-cd-et-automatisation

- **Quality Gate obligatoire :**
  1. `npm ci`
  2. `npm run lint`
  3. `npm test` (runner natif `node --test`)
  4. `npm run build`
- **Secrets :** Aucun secret en clair dans le code ou les workflows. Utiliser `${{ secrets.NOM_DU_SECRET }}`.
- **Gestion des pannes :** En cas d'échec CI, analyser les logs, reproduire localement, corriger et commiter.

---
name: dev-par-les-tests
description: Méthodologie TDD pour la logique métier et les correctifs.
---

## Compétence : dev-par-les-tests

- **Cycle TDD :** Écrire le test d'abord (`RED`), implémenter le code minimal (`GREEN`), puis nettoyer (`REFACTOR`).
- **Correction de bugs :** Obligation d'écrire un test unitaire reproduisant le bug avant de toucher au code source.
- **Runner natif Node.js :** Utiliser exclusivement `describe` et `it` depuis `node:test`, et `assert` depuis `node:assert/strict`. Ne pas injecter Jest ou Vitest.

---
name: jsdoc-et-documentation
description: Standardise la documentation du code via JSDoc pour garantir la lisibilité entre les 25 développeurs.
---

## Compétence : jsdoc-et-documentation

- **Documentation obligatoire :** Toute fonction ou logique métier dans `src/core/` et `src/services/` doit posséder un bloc JSDoc.
- **Format requis :** Explication brève en français de l'utilité, balises `@param` avec les types, et balise `@returns`.
- **Pertinence :** Les commentaires expliquent le "pourquoi" et non le "comment". Ne pas documenter les hooks React standards ou le code évident.