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

## Quand l'utiliser

- Création ou modification d'un composant React.
- Ajout d'un nouvel état, d'un écouteur ou d'un timer dans un composant.
- Quand une logique métier commence à s'infiltrer dans un composant.

## Processus type

1. Identifier les données d'état du composant et leur source de vérité.
2. Extraire toute logique métier vers `coreService.js` (le composant ne fait que l'UI).
3. Implémenter le composant fonctionnel avec les Hooks standards.
4. Documenter toute fonction de `src/core/` ou `src/services/` en JSDoc (voir `jsdoc-et-documentation`).
5. Couvrir la logique métier par des tests (`node:test`, voir `dev-par-les-tests`).
6. Vérifier performance et cleanup avant de terminer.

## Drapeaux rouges

- Appel à `Math.random()` dans un composant (utiliser `src/core/rng.js`).
- Import direct depuis `src/core/` dans un composant (passer par `coreService.js`).
- `useEffect` avec écouteur ou timer sans cleanup dans le retour de l'effet.
- Dérivation d'état recalculée à chaque render sans `useMemo`/`useCallback` justifié.
- Nouvelle bibliothèque UI ajoutée sans validation préalable.

## Liens avec les autres skills

- `jsdoc-et-documentation` : documentation des fonctions métier extraites.
- `dev-par-les-tests` : tests de la logique métier extraite.
- `frontend-design` : qualité visuelle et typographique des interfaces.
- `relecture-et-qualite` : vérifie le respect de ces règles en code review.
- `feat-dev` : workflow feature qui consomme ces règles.
