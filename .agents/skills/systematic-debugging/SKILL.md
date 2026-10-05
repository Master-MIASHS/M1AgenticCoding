---
name: systematic-debugging
description: À utiliser face à tout bug, échec de test ou comportement inattendu, avant de proposer un correctif — investigation de la cause racine obligatoire en premier.
license: MIT
metadata:
  source: https://github.com/obra/superpowers
  original: "Systematic Debugging (obra/superpowers)"
---

# Debugging systémique

## Principe fondamental

**Toujours identifier la cause racine avant de tenter un correctif. Corriger un symptôme est un échec.**

## Loi de fer

```
AUCUN CORRECTIF SANS INVESTIGATION DE LA CAUSE RACINE
```

Si la phase 1 n'est pas terminée, il est interdit de proposer un correctif.

## Quand l'utiliser

Pour tout problème technique :
- Échecs de tests (`npm test`, runner natif `node --test`)
- Bugs en local ou en production
- Comportement inattendu
- Problèmes de performance
- Échecs de build (`npm run build`)

**Surtout quand :**
- Sous pression temporelle (l'urgence rend le tir à l'aveugle tentant)
- « Un petit correctif rapide » semble évident
- Plusieurs correctifs ont déjà été essayés
- Le correctif précédent n'a pas fonctionné
- Le problème n'est pas entièrement compris

**Ne pas sauter quand :**
- Le problème semble simple (les bugs simples ont aussi une cause racine)
- On est pressé (se précipiter garantit les allers-retours)

## Les quatre phases

Chaque phase doit être complétée avant la suivante.

### Phase 1 : Investigation de la cause racine

**AVANT tout correctif :**

1. **Lire attentivement les messages d'erreur**
   - Ne pas sauter les erreurs ni les warnings
   - Lire les stack traces en entier
   - Noter numéros de ligne, chemins de fichiers, codes d'erreur

2. **Reproduire de façon fiable**
   - Déclenche-t-on le problème systématiquement ?
   - Quelles sont les étapes exactes ?
   - Non reproductible → rassembler plus de données, ne pas deviner

3. **Vérifier les changements récents**
   - `git diff`, commits récents
   - Nouvelles dépendances, changements de configuration
   - Différences d'environnement

4. **Rassembler des preuves sur les systèmes multi-composants**

   Quand le problème traverse plusieurs couches (CI → build → app, composant React → `coreService.js` → `src/core/`) :
   - Journaliser les données entrant et sortant de chaque composant
   - Vérifier la propagation de la configuration à chaque couche
   - Lancer une seule fois pour identifier OÙ ça casse
   - Puis n'investiguer que ce composant précis

5. **Traîner le flux de données**
   - D'où vient la mauvaise valeur ?
   - Qui a appelé ce code avec cette valeur ?
   - Remonter jusqu'à la source
   - Corriger à la source, pas au symptôme

### Phase 2 : Analyse de pattern

**Trouver le pattern avant de corriger :**

1. **Trouver des exemples qui fonctionnent** — du code similaire et sain dans le même codebase
2. **Comparer avec les références** — lire l'implémentation de référence en entier, pas en diagonale
3. **Identifier les différences** — lister chaque différence entre le code sain et le code cassé, même minime
4. **Comprendre les dépendances** — configuration, environnement, hypothèses implicites

### Phase 3 : Hypothèse et test

**Méthode scientifique :**

1. **Formuler UNE hypothèse** — « Je pense que X est la cause racine car Y ». L'écrire. Être précis, pas vague.
2. **Tester minimalement** — le plus petit changement possible pour tester l'hypothèse, une variable à la fois
3. **Vérifier avant de continuer** — ça marche → phase 4 ; sinon → formuler une NOUVELLE hypothèse, jamais empiler des correctifs
4. **Quand on ne sait pas** — le dire (« je ne comprends pas X »), demander de l'aide, creuser

### Phase 4 : Implémentation

**Corriger la cause racine, pas le symptôme :**

1. **Créer le test qui échoue** (voir la skill `dev-par-les-tests`)
   - La reproduction la plus simple possible
   - Obligatoire AVANT le correctif
   - `node:test` + `node:assert/strict`

2. **Implémenter UN correctif**
   - Une seule modification ciblant la cause racine
   - Aucune amélioration « au passage », aucun refactor embarqué

3. **Vérifier le correctif** (voir la skill `verification-before-completion`)
   - Le test passe-t-il maintenant ?
   - Les autres tests passent-ils toujours ?
   - Le problème est-il vraiment résolu ?

4. **Si le correctif ne marche pas**
   - STOP. Combien de correctifs essayés ?
   - Moins de 3 : retour à la phase 1 avec les nouvelles informations
   - 3 ou plus : STOP et questionner l'architecture (point 5)

5. **Si 3+ correctifs ont échoué : questionner l'architecture**

   Signaux d'un problème d'architecture :
   - Chaque correctif révèle un nouvel état partagé / un nouveau couplage ailleurs
   - Chaque correctif crée de nouveaux symptômes dans un autre endroit
   - Les correctifs exigent des refactors « massifs »

   **STOP et questionner les fondamentaux :**
   - Ce pattern est-il fondamentalement sain ?
   - Faut-il refactoring architectural ou continuation du traitement des symptômes ?
   - Discuter avec le développeur avant tout nouveau correctif

   Ce n'est pas une hypothèse ratée : c'est une mauvaise architecture.

## Drapeaux rouges — STOP et reprendre le processus

Si tu te surprends à penser :
- « Correctif rapide pour l'instant, j'investiguerai plus tard »
- « J'essaie juste de changer X et je vois si ça marche »
- « J'ajoute plusieurs changements et je lance les tests »
- « Je saute le test, je vérifierai à la main »
- « C'est probablement X, je corrige ça »
- « Je ne comprends pas totalement mais ça devrait marcher »
- « Un dernier essai » (après 2+ échecs)
- Chaque correctif révèle un nouveau problème ailleurs

**Tous ces signaux veulent dire : STOP. Retour à la phase 1.**

**Si 3+ correctifs ont échoué :** questionner l'architecture (phase 4, point 5).

## Rationnalisations courantes

| Excuse | Réalité |
|--------|---------|
| « Le problème est simple, pas besoin de processus » | Les problèmes simples ont des causes racines. Le processus est rapide sur les bugs simples. |
| « Urgence, pas le temps » | Le debugging systémique est PLUS RAPIDE que le tir à l'aveugle. |
| « J'essaie ça d'abord, je creuse ensuite » | Le premier correctif fixe le pattern. Bien faire d'entrée. |
| « J'écrirai le test une fois le correctif confirmé » | Un correctif non testé ne tient pas. Le test d'abord le prouve. |
| « Plusieurs correctifs d'un coup, ça gagne du temps » | Impossible d'isoler ce qui a marché. Cause de nouveaux bugs. |
| « La référence est trop longue, j'adapte le pattern » | La compréhension partielle garantit les bugs. Lire en entier. |
| « Je vois le problème, je le corrige » | Voir un symptôme ≠ comprendre la cause racine. |
| « Un dernier essai » (après 2+ échecs) | 3+ échecs = problème d'architecture. Questionner, pas corriger encore. |

## Référence rapide

| Phase | Activités clés | Critère de succès |
|-------|----------------|-------------------|
| **1. Cause racine** | Lire les erreurs, reproduire, vérifier les changements, rassembler des preuves | Comprendre le QUOI et le POURQUOI |
| **2. Pattern** | Trouver des exemples qui marchent, comparer | Différences identifiées |
| **3. Hypothèse** | Théoriser, tester minimalement | Hypothèse confirmée ou nouvelle hypothèse |
| **4. Implémentation** | Test qui échoue, correctif unique, vérification | Bug résolu, tests au vert |

## Quand le processus révèle « aucune cause racine »

Si l'investigation montre que le problème est réellement environnemental, dépendant du timing ou externe :
1. Le processus est complet
2. Documenter ce qui a été investigué
3. Mettre en place un traitement adapté (retry, timeout, message d'erreur)
4. Ajouter du logging pour de futures investigations

**Mais :** 95 % des cas « sans cause racine » sont des investigations incomplètes.

## Liens avec les autres skills

- `bugfix` : workflow bug qui s'appuie sur cette skill pour l'investigation.
- `dev-par-les-tests` : l'étape « Implémentation » produit un test d'abord (RED → GREEN).
- `ci-cd-et-automatisation` : investiguer un échec CI incompréhensible.
- `verification-before-completion` : vérifier chaque hypothèse, pas seulement la dernière.
- `relecture-et-qualite` : l'axe « exactitude métier » recoupe l'investigation.
