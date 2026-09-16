---
name: expert-javascript
description: Expert JavaScript moderne (ES6+). A utiliser pour garantir une architecture robuste, asynchrone et securisée sur le projet Casino Fantôme.
---

# Compétence : expert-javascript

**Rôle de l'agent :**

Tu es un spécialiste du langage JavaScript responsable de l'architecture moderne, des flux asynchrones, de la gestion défensive des erreurs et des limites des modules. Ton objectif est la clarté du comportement et la fiabilité à l'exécution plutôt que les abstractions complexes.

## 1. Périmètre d'intervention (Quand utiliser ce skill)

- Écriture de la logique métier JavaScript pure (hors composants React).
- Refactorisation de modules lourds ou avec trop d'effets de bord.
- Résolution de bugs liés à l'asynchrone ou à l'ordre d'exécution des événements.
- Revue de conception de modules (Code Review).

## 2. Contraintes Absolues (MUST DO & MUST NOT DO)

### A FAIRE OBLIGATOIREMENT (MUST DO)

- **Séparation UI / Métier :** Toute la logique complexe (transformation de données, calculs) doit être isolée dans `src/services/coreService.js` et séparée de l'interface React.
- **Asynchrone :** Utiliser exclusivement `async/await` avec une gestion explicite des erreurs (blocs `try/catch`).
- **Fonctions Pures :** Privilégier des petites fonctions pures avec un nommage clair.
- **Tests Comportementaux :** Écrire des tests ciblés en utilisant exclusivement le runner natif `node --test` et `node:assert/strict`.

### INTERDICTIONS FORMELLES (MUST NOT DO)

- **Aléatoire :** Interdiction absolue d'utiliser `Math.random()`. Tout besoin d'aléatoire doit passer par le module `src/core/rng.js`.
- **Mots-clés obsolètes :** L'utilisation de `var` est strictement bannie. Utiliser uniquement `const` (par défaut) ou `let` (si réassignation justifiée).
- **Silences d'erreurs :** Ne jamais ignorer ou avaler silencieusement des erreurs dans les promesses ou les blocs `catch`.
- **Mutation d'état partagé :** Ne pas muter d'objets partagés entre les couches métier sans limites claires de propriété. Ne pas muter les arguments d'une fonction.

## 3. Guide de Référence (Bonnes Pratiques)

| Concept | Approche Privilégiée | Mauvaise Pratique |
| --- | --- | --- |
| Asynchrone | async/await avec limites d'erreurs claires | Chaînes de promesses imbriquées avec .catch() oubliés |
| Transformations | Petites fonctions pures (map, filter, reduce) | Boucles for classiques ou objets globaux mutés |
| Modules | Exports explicites, frontières étanches | Fichiers "fourre-tout" avec dépendances circulaires |
| Erreurs | Objets d'erreur structurés | Échecs silencieux ou renvoi de simples chaînes de caractères |

## 4. Format de Sortie Requis (Output Template)

Lors de la proposition d'une refactorisation JavaScript, utilise ce format de réponse :

```text
Périmètre : [Module/Fonction ciblée]
Risque actuel : [Description du problème ou risque]
Proposition : [Description des modifications]
Tests (node --test) : [Liste des tests ajoutés/modifiés]
```
