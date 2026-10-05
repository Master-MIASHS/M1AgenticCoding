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

## Quand l'utiliser

- Avant tout push : exécuter le Quality Gate localement dans l'ordre complet.
- Quand la CI échoue sur une branche.
- Quand on modifie un workflow GitHub Actions ou ajoute un secret.

## Processus local (avant push)

```bash
npm ci
npm run lint
npm test
npm run build
```

Les quatre étapes s'exécutent dans cet ordre, et toutes doivent passer. Une étape verte n'annule pas les suivantes.

## Gestion d'une panne CI

1. Lire les logs du job en échec, identifier la commande et la sortie exacte.
2. Reproduire localement en exécutant la même commande.
3. Corriger (voir `systematic-debugging` si l'échec est intermittent ou incompréhensible).
4. Re-exécuter le Quality Gate complet, puis commiter au format strict (type `fix` ou `chore`).

## Drapeaux rouges

- Secret en clair dans un workflow ou dans le code.
- Quality Gate partiel (ex. `npm test` passé mais `npm run build` non exécuté).
- Affirmation « la CI est verte » sans avoir lu les logs.
- Échec CI « corrigé » en désactivant l'étape au lieu de corriger la cause.

## Liens avec les autres skills

- `flux-git-et-versionnement` : le Quality Gate est un prérequis au commit et au push.
- `verification-before-completion` : ne jamais affirmer un vert sans l'avoir exécuté.
- `prepare-pr` : la section « Vérifications » de la PR reprend ces résultats.
- `systematic-debugging` : investigation d'un échec CI incompréhensible.
