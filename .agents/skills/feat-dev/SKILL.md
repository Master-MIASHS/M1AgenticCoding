---
name: feat-dev
description: "Workflow complet de bout en bout pour implémenter une feature non triviale : investigation, document de conception, plan de tests, implémentation, vérification, audit et relecture. À utiliser quand on demande d'ajouter une feature ou un comportement nouveau non trivial."
license: MIT
metadata:
  source: https://github.com/QwenLM/qwen-code
  original: "Feature Development Workflow (QwenLM/qwen-code)"
---

# Workflow de développement de feature

Workflow complet pour implémenter une feature non triviale dans ce dépôt. Chaque étape produit des artefacts écrits et des vérifications exécutées. Ne pas sauter les phases de conception ni de vérification : l'implémentation directe d'une feature complexe produit des relectures coûteuses et des régressions.

Ce workflow s'appuie sur `ingenierie-ui-frontend` (architecture des composants), `jsdoc-et-documentation` (documentation du code) et `dev-par-les-tests` (TDD).

## Entrée

Description de la feature, issue GitHub ou spécification.

## Emplacement des artefacts

Utiliser `docs/design/` pour les documents de conception et `docs/bugs/` si une reproduction de comportement existant est nécessaire.

## Étape 1 : Investiguer

Dispatcher un sous-agent (type `explore`) pour cartographier la surface d'impact. Exiger dans le rapport : les composants, services et utilitaires concernés ; l'existant réutilisable (jamais de réinvention) ; les points de contact avec `coreService.js` ; les tests existants couvrant ces zones.

L'investigation doit préciser si la logique métier concerne le tirage aléatoire : en cas d'usage, `src/core/rng.js` exclusivement (zéro `Math.random()`).

## Étape 2 : Document de conception

Écrire `docs/design/<feature>.md` avant d'écrire du code. Le document contient :

- **Objectif** : ce que la feature fait pour l'utilisateur, en une phrase.
- **Non-objectifs** : ce que la feature ne fait pas (borne le périmètre).
- **Conception** : composants créés/modifiés, données d'état, flux métier, API de `coreService.js`.
- **Décisions** : les choix d'architecture et le pourquoi de chacun.
- **Risques** : ce qui pourrait casser (performance, régressions, dépendances non validées).

Si une décision nécessite une nouvelle bibliothèque UI, la bloquer et demander validation (règle de `ingenierie-ui-frontend`).

## Étape 3 : Plan de tests

Écrire le plan de tests dans le même document de conception, sous la section **Plan de tests**. Pour chaque comportement, lister : le nom du test (`describe`/`it` du runner natif `node:test`), la commande d'exécution, et le résultat attendu avant (échec ou absence) et après (succès) l'implémentation.

Le plan doit couvrir au minimum : le comportement nominal, le comportement d'erreur, et une interaction utilisateur clé.

## Étape 4 : Rejouer à sec (dry run)

Exécuter le Quality Gate (`npm run lint && npm test && npm run build`) sur la base actuelle et noter les résultats. Ce baseline sert de référence : toute régression ultérieure doit pouvoir être distinguée d'un échec préexistant.

## Étape 5 : Implémenter

Implémenter la feature en suivant le document de conception. Règles applicables :

- Séparation UI/métier : toute logique métier passe par `coreService.js` (voir `ingenierie-ui-frontend`).
- Toute fonction de `src/core/` et `src/services/` porte un bloc JSDoc (voir `jsdoc-et-documentation`).
- Tests écrits d'abord pour la logique métier (voir `dev-par-les-tests`).
- Commits atomiques au format strict (voir `flux-git-et-versionnement`), type `feat`.

Exécuter `npm run lint`, `npm test` et `npm run build` après chaque unité de travail, pas seulement à la fin.

## Étape 6 : Vérifier

Exécuter le plan de tests de l'étape 3 en entier. Chaque test du plan doit passer. Comparer les résultats au baseline de l'étape 4 : tout nouvel échec est une régression à corriger avant de continuer.

Vérifier ensuite manuellement le comportement utilisateur clé dans le navigateur (Vite dev server), en particulier les interactions listées dans le plan de tests.

## Étape 7 : Auto-audit et relecture

D'abord auto-auditer le diff complet : plusieurs passes ouvertes + vérification en présupposant l'erreur, jusqu'à deux passes consécutives propres. Si l'audit modifie le code source, re-exécuter l'étape 6 avant de reprendre.

Puis utiliser la skill `requesting-code-review` en listant tous les fichiers modifiés et en attachant le document de conception. Trier chaque commentaire :

- **Valide** : vrai problème ou amélioration significative. Le corriger.
- **Faux positif** : le relecteur a manqué du contexte. L'ignorer.
- **Sur-analyse** : techniquement plausible mais pas worth la complexité. L'ignorer.

Après avoir corrigé les points valides, re-exécuter le plan de tests et `npm run lint && npm test && npm run build`.

## Étape 8 : Finaliser

- Vérifier que le document de conception reflète l'implémentation réelle (mettre à jour en cas de dérive).
- Préparer la PR avec la skill `prepare-pr`.
- Commit final au format strict, type `feat`, avec le périmètre et le groupe.

## Règles d'itération

- Si l'étape 6 échoue, revenir à l'étape 5 puis re-exécuter l'étape 6.
- Si l'étape 7 trouve des points valides, les corriger, re-exécuter l'étape 6, et re-faire l'auto-audit.
- Ne pas boucler plus de 3 fois entre les étapes 5-7 sans demander au développeur.
- Toute dérive par rapport au document de conception doit être soit corrigée, soit documentée dans le document.
