---
name: requesting-code-review
description: À utiliser en fin de tâche, après une fonctionnalité majeure ou avant un merge, pour vérifier que le travail respecte les exigences — dispatcher un relecteur avec un contexte précis.
license: MIT
metadata:
  source: https://github.com/obra/superpowers
  original: "Requesting Code Review (obra/superpowers)"
---

# Demande de relecture de code

Dispatcher un sous-agent relecteur pour attraper les problèmes avant qu'ils ne se propagent. Le relecteur reçoit un contexte précisément construit pour l'évaluation — jamais l'historique de ta session.

**Principe fondamental :** relier tôt, relier souvent.

## Quand demander une relecture

**Obligatoire :**
- Après chaque tâche d'une feature majeure
- Avant le merge vers main (via Pull Request, voir `flux-git-et-versionnement`)

**Optionnel mais valuable :**
- Quand on est bloqué (œil neuf)
- Avant un refactor (vérification de la base)
- Après la correction d'un bug complexe

## Comment demander

**1. Récupérer les SHAs git :**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # ou origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatcher un sous-agent relecteur** (type `general`) avec le template ci-dessous, en remplissant les placeholders :
- `{DESCRIPTION}` — résumé court de ce qui a été construit
- `{PLAN_OR_REQUIREMENTS}` — ce que le travail doit faire (issue, plan, exigences)
- `{BASE_SHA}` — commit de départ
- `{HEAD_SHA}` — commit d'arrivée

**3. Agir sur les retours :**
- Corriger immédiatement les `[CRITIQUE]`
- Corriger les `[REQUIS]` avant de continuer
- Noter les `[SUGGESTION]` pour plus tard
- Contester avec des arguments techniques si le relecteur a tort (voir `receiving-code-review`)

La grille d'analyse suit `relecture-et-qualite` : 4 axes, chasse au code mort, classification `[CRITIQUE]` / `[REQUIS]` / `[SUGGESTION]`.

## Template du relecteur

```
Tu es un Senior Code Reviewer expert en architecture logicielle et bonnes pratiques.
Ta mission : relire un travail terminé par rapport à ses exigences et identifier les
problèmes avant qu'ils ne se propagent.

## Ce qui a été implémenté
{DESCRIPTION}

## Exigences / Plan
{PLAN_OR_REQUIREMENTS}

## Plage git à relire
Base : {BASE_SHA}
Head : {HEAD_SHA}

git diff --stat {BASE_SHA}..{HEAD_SHA}
git diff {BASE_SHA}..{HEAD_SHA}

## Relecture en lecture seule
Ne modifier ni l'arborescence de travail, ni l'index, ni HEAD, ni l'état de la branche.
Utiliser git show, git diff, git log pour inspecter. Ne pas dispatcher de sous-agents :
toute la relecture se fait par toi. Si le diff est trop gros, faire plusieurs passes.

## Points à vérifier

Alignement avec le plan :
- L'implémentation correspond-elle au plan / aux exigences ?
- Les écarts sont-ils des améliorations justifiées ou des dérives ?
- Toute la fonctionnalité prévue est-elle présente ?

Qualité du code :
- Séparation UI / métier respectée (coreService.js, jamais d'import direct de src/core/) ?
- Gestion d'erreurs propre ?
- DRY sans abstraction prématurée ?
- Cas limites gérés ?

Architecture :
- Décisions de design saines ?
- Performance front-end (pas de dérivation d'état inutile, cleanup des useEffect) ?
- Intégration propre avec le code environnant ?

Tests :
- Les tests vérifient un comportement réel (node --test) ?
- Cas limites couverts ?
- Tous les tests passent ?

Production :
- Documentation JSDoc complète sur src/core/ et src/services/ ?
- Aucun secret en clair ?
- Aucun bug évident ?

## Calibrage
Classer les problèmes par sévérité réelle (voir relecture-et-qualite).
Tout n'est pas CRITIQUE. Reconnaître ce qui est bien fait avant de lister les problèmes.
Si le plan lui-même a des problèmes (et non l'implémentation), le dire explicitement.

## Format de sortie

### Points forts
[Ce qui est bien fait, avec des références fichier:ligne]

### Problèmes
#### [CRITIQUE] (bloquant)
[Bugs, sécurité, perte de données, fonction cassée]
#### [REQUIS] (à corriger avant merge)
[Problèmes d'architecture, fonctionnalités manquantes, tests absents]
#### [SUGGESTION] (optionnel)
[Style, optimisations, documentation]

Pour chaque problème : référence fichier:ligne, ce qui ne va pas, pourquoi c'est important,
comment corriger (si ce n'est pas évident).

### Recommandations
[Améliorations de qualité, d'architecture ou de processus]

### Verdict

**Prêt à merger ?** [Oui | Non | Avec corrections]

**Justification :** [1-2 phrases techniques]

## Règles critiques
- Classer par sévérité réelle, ne pas surqualifier
- Être précis (fichier:ligne, pas de vague)
- Expliquer POURQUOI chaque problème compte
- Donner un verdict clair
```

## Rationnalisations courantes

| Excuse | Réalité |
|--------|---------|
| « Je relis le diff moi-même plutôt que de dispatcher un relecteur » | Le diff et l'évaluation vivent dans le contexte du relecteur ; seules les conclusions reviennent. Relier en ligne brûle le contexte dont tu as besoin pour piloter le travail. |
| « Le relecteur a besoin de toute l'historique de ma session » | Non : lui donner un contexte précisément construit, jamais l'historique de session. Le relecteur reste sur le travail produit, pas sur ton raisonnement. |

## Drapeaux rouges

**Jamais :**
- Sauter la relecture parce que « c'est simple »
- Ignorer des problèmes `[CRITIQUE]`
- Continuer avec des `[REQUIS]` non corrigés
- Arguer contre un feedback technique valide

**Si le relecteur a tort :**
- Contester avec des arguments techniques
- Montrer le code / les tests qui prouvent que ça marche
- Demander de la clarification

## Liens avec les autres skills

- `receiving-code-review` : le côté auteur qui répond aux retours.
- `relecture-et-qualite` : grille des 4 axes utilisée par le relecteur.
- `verification-before-completion` : fournir des preuves (tests exécutés) et non des affirmations.
- `bugfix` et `feat-dev` : leur dernière étape est une relecture demandée via cette skill.
- `flux-git-et-versionnement` : la relecture précède le merge sur `main`.
