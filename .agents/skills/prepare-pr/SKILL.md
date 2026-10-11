---
name: prepare-pr
description: Préparer le titre et le corps d'une Pull Request GitHub depuis le diff de la branche courante, en respectant le format strict du projet. À utiliser quand on demande de préparer une PR, d'écrire le titre ou le corps de PR, ou de finaliser une branche avant relecture.
license: MIT
metadata:
  source: https://github.com/QwenLM/qwen-code
  original: "Prepare PR Workflow (QwenLM/qwen-code)"
---

# Préparation de Pull Request

L'agent utilise cette skill pour rédiger le titre et le corps d'une PR. Pour s'assurer que la PR est techniquement prête avant l'envoi, l'agent doit utiliser `pr-checklist`.

## Entrée

Aucune. Travailler sur la branche courante. Si la branche courante est `main`, s'arrêter et demander de basculer sur une branche dédiée (règle de `flux-git-et-versionnement`).

## Étape 1 : Inspecter la branche

```bash
git status
git log --oneline origin/main..HEAD
git diff origin/main...HEAD
```

Comprendre ce que la branche change, fichier par fichier. Identifier le type principal (feat, fix, chore, docs, refactor, test) et le périmètre.

Si les commits de la branche ne respectent pas le format strict, le signaler avant d'écrire le titre (les corriger relève du développeur, pas de cette skill).

## Étape 2 : Titre

Le titre de PR reprend le format strict des commits :

```
<type>(<périmètre>): [Groupe X] <description à l'infinitif> (#<issue>)
```

- `type` : `feat`, `fix`, `chore`, `docs`, `refactor` ou `test`.
- `périmètre` : module ou composant concerné, en minuscules.
- `[Groupe X]` : le groupe du développeur auteur.
- `description` : à l'infinitif, en français, sans point final.
- `#<issue>` : le numéro d'issue GitHub.

Exemple : `feat(tirage): [Groupe 3] implémenter le tirage pondéré (#42)`.

## Étape 3 : Corps

Structurer le corps avec les sections suivantes, dans cet ordre. Supprimer une section seulement si elle est vraiment vide, jamais pour faire court.

```markdown
## Résumé

Ce que change cette PR et pourquoi. Deux à quatre phrases maximum.

## Changements

Liste à puces des changements notables, par fichier ou par zone. Une ligne par point.

## Vérifications

Ce qui a été exécuté localement, avec les résultats observés :

- `npm run lint` : OK / <résultat>
- `npm test` : <n> tests, OK / <résultat>
- `npm run build` : OK / <résultat>
- Vérification manuelle : <ce qui a été testé dans le navigateur, si applicable>

Ne lister que ce qui a réellement été exécuté. Si une vérification n'a pas été faite, l'écrire explicitement (« non testé »).

## Risques et limites

Ce qui pourrait casser ailleurs, ce qui n'est pas couvert par les tests, les décisions à confirmer.

## Issue liée

Fixes #<numéro>
```

## Étape 4 : Vérifier avant de proposer

- S'assurer que le Quality Gate (`npm run lint`, `npm test`, `npm run build`) passe localement avant de proposer la PR (voir `ci-cd-et-automatisation`).
- Ne jamais affirmer une vérification qui n'a pas été exécutée (règle de `verification-before-completion`).
- S'assurer qu'aucun secret, aucun dossier de build et aucun `node_modules/` ne figure dans le diff.

## Erreurs fréquentes

- Titre hors du format strict (type invalide, groupe manquant, description non à l'infinitif).
- Section « Vérifications » qui liste des commandes non exécutées.
- Corps qui résume le code ligne à ligne au lieu de décrire les changements et les risques.
- Oubli de la ligne `Fixes #<numéro>` qui empêche la fermeture automatique de l'issue.
