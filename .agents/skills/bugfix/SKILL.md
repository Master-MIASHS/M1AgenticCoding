---
name: bugfix
description: Corriger un bug depuis une issue GitHub en suivant le workflow reproduce-first. À utiliser quand on demande de corriger un bug, d'investiguer une issue, ou de déboguer un problème signalé. Prend en entrée une URL ou un numéro d'issue GitHub.
license: MIT
metadata:
  source: https://github.com/QwenLM/qwen-code
  original: "Bugfix Workflow (QwenLM/qwen-code)"
---

# Workflow Bugfix

Suivre ce workflow pour les corrections de bugs issues d'une issue GitHub. Ne pas sauter la reproduction : corriger sans d'abord reproduire le bug produit des corrections incomplètes et des régressions.

Ce workflow s'appuie sur `systematic-debugging` pour l'investigation et sur `dev-par-les-tests` pour le test de régression.

## Entrée

Une URL ou un numéro d'issue GitHub.

## Emplacement des artefacts

Utiliser `docs/bugs/` dans ce dépôt. Dans les étapes ci-dessous, `<issue-file>` désigne le fichier markdown de l'issue.

## Étape 1 : Lire l'issue

Créer le répertoire d'artefacts si besoin, puis dump l'issue directement dans un fichier markdown via `gh` :

```bash
mkdir -p docs/bugs
gh issue view <numéro> \
  --json number,title,body \
  -t '# Issue #{{.number}}: {{.title}}

{{.body}}

---

## Rapport de reproduction

_En attente — à compléter._

## Rapport de vérification

_En attente — à compléter._
' > docs/bugs/issue-<numéro>.md
```

## Étape 2 : Reproduire

Dispatcher un sous-agent (type `general`) et l'orienter vers `<issue-file>`. Énoncer uniquement l'objectif : reproduire le bug. Garder le prompt minimal ; le sous-agent possède la stratégie de reproduction.

Attendre la fin du sous-agent. Puis lire `<issue-file>` pour récupérer le rapport de reproduction. Si le statut est `NON_REPRODUIT`, le signaler et s'arrêter.

## Étape 3 : Corriger

Lire le code pertinent et faire la correction. Utiliser le rapport de reproduction pour le contexte ; il doit contenir le comportement observé, le comportement attendu et les chemins de code utiles.

Si le bug est assez complexe pour que la première tentative ne fonctionne pas, utiliser la skill `systematic-debugging` et travailler les hypothèses de façon systématique.

## Étape 4 : Vérifier

Exécuter le Quality Gate du projet (voir `ci-cd-et-automatisation`) :

```bash
npm run lint
npm test
npm run build
```

Dispatcher à nouveau un sous-agent (type `general`), orienté vers le même fichier d'issue. Énoncer l'objectif : vérifier la correction.

Si le statut de vérification est `ENCORE_CASSE`, lire le fichier d'issue mis à jour, revenir à l'étape 3 et itérer. Ne pas continuer tant que la vérification ne retourne pas `CORRECTION_VERIFIEE`.

## Étape 5 : Tests

Exécuter les tests unitaires des fichiers modifiés (runner natif `node --test`, voir `dev-par-les-tests`). Si le sous-agent a écrit un test qui échoue lors de la reproduction, s'assurer qu'il passe après la correction. Sinon, ajouter une couverture de régression ciblée sur le scénario d'échec.

## Étape 6 : Auto-audit et relecture

D'abord auto-auditer le diff complet : plusieurs passes ouvertes + vérification en présupposant l'erreur, jusqu'à deux passes consécutives propres (une passe propre suffit pour une correction triviale). Si l'audit modifie le code source, re-exécuter l'étape 4 avant de reprendre. Sauter la relecture ci-dessous uniquement pour une correction d'une ligne ou de config triviale. Pour tout le reste, utiliser la skill `requesting-code-review` en listant tous les fichiers modifiés. Trier chaque commentaire avec un verdict :

- **Valide** : vrai bug ou amélioration significative. Le corriger.
- **Faux positif** : le relecteur a manqué du contexte. L'ignorer.
- **Sur-analyse** : techniquement plausible mais pas worth la complexité. L'ignorer.

Après avoir corrigé les points valides, re-exécuter les tests unitaires et une vérification de bon sens rapide.

## Règles d'itération

- Si l'étape 4 échoue, revenir à l'étape 3 puis re-exécuter l'étape 4.
- Si l'étape 6 trouve des points valides, les corriger, re-exécuter l'étape 4 comme bon sens, et re-faire l'auto-audit.
- Ne pas boucler plus de 3 fois entre les étapes 3-6 sans demander au développeur.
- Chaque commit suit le format strict de `flux-git-et-versionnement` (type `fix`).
