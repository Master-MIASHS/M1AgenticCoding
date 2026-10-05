---
name: receiving-code-review
description: À utiliser en recevant un feedback de code review, avant d'implémenter les suggestions — surtout si le feedback semble flou ou techniquement douteux. Rigueur technique et vérification, pas accord performatif ni implémentation aveugle.
license: MIT
metadata:
  source: https://github.com/obra/superpowers
  original: "Receiving Code Review (obra/superpowers)"
---

# Réception de la relecture de code

## Principe fondamental

La code review exige une évaluation technique, pas une performance émotionnelle.

**Vérifier avant d'implémenter. Poser la question avant de supposer. La justesse technique prime sur le confort social.**

## Pattern de réponse

```
QUAND on reçoit un feedback de code review :

1. LIRE : le feedback complet sans réagir
2. COMPRENDRE : reformuler la demande avec ses propres mots (ou demander)
3. VÉRIFIER : confronter à la réalité du codebase
4. ÉVALUER : la suggestion est-elle techniquement saine POUR CE codebase ?
5. RÉPONDRE : acknowledgment technique ou contestation argumentée
6. IMPLÉMENTER : un point à la fois, tester chaque point
```

## Réponses interdites

**JAMAIS :**
- « Vous avez absolument raison ! »
- « Excellente remarque ! » / « Super feedback ! » (performatif)
- « Je l'implémente tout de suite » (avant vérification)

**À LA PLACE :**
- Reformuler la demande technique
- Poser des questions de clarification
- Contester avec des arguments techniques si c'est erroné
- Simplement commencer à travailler (l'action vaut mieux que les mots)

## Feedback flou

```
SI un point est flou :
  STOP — ne rien implémenter
  DEMANDER une clarification sur les points flous

POURQUOI : les points sont souvent liés. Compréhension partielle = mauvaise implémentation.
```

**Exemple :**
```
Développeur : « Corrige les points 1 à 6 »
Tu comprends 1, 2, 3, 6. Flou sur 4 et 5.

❌ MAUVAIS : implémenter 1, 2, 3, 6 maintenant, demander 4 et 5 plus tard
✅ BON : « Je comprends 1, 2, 3, 6. J'ai besoin de clarifier 4 et 5 avant de continuer. »
```

## Selon la source du feedback

### Du développeur
- **Source fiable** — implémenter après avoir compris
- **Poser la question** si le périmètre est flou
- **Pas d'accord performatif**
- **Passer à l'action** ou acknowledgment technique

### D'un relecteur externe (agent IA, autre projet, bot)
```
AVANT d'implémenter :
  1. Vérifier : techniquement correct POUR CE codebase ?
  2. Vérifier : ne casse-t-il pas une fonctionnalité existante ?
  3. Vérifier : existe-t-il une raison à l'implémentation actuelle ?
  4. Vérifier : respecte-t-il les règles du projet (coreService.js, node --test, rng.js) ?
  5. Vérifier : le relecteur a-t-il tout le contexte ?

SI la suggestion semble erronée :
  Contester avec des arguments techniques

SI impossible de vérifier facilement :
  Le dire : « Je ne peux pas vérifier ceci sans [X]. Je [creuse / demande / continue] ? »

SI contradiction avec une décision antérieure du développeur :
  STOP et discuter avec le développeur d'abord
```

## Vérification YAGNI pour les « fonctions professionnelles »

```
SI le relecteur suggère « l'implémenter proprement » :
  Chercher l'usage réel dans le codebase

  SI non utilisé : « Cette fonction n'est appelée nulle part. On la supprime (YAGNI) ? »
  SI utilisée : alors l'implémenter proprement
```

## Ordre d'implémentation

```
POUR un feedback multi-points :
  1. Clarifier d'abord tout ce qui est flou
  2. Puis implémenter dans cet ordre :
     - Problèmes bloquants (cassé, sécurité)
     - Corrections simples (typos, imports)
     - Corrections complexes (refactor, logique)
  3. Tester chaque correction individuellement
  4. Vérifier l'absence de régression (voir verification-before-completion)
```

## Quand contester

Contester quand :
- La suggestion casse une fonctionnalité existante
- Le relecteur n'a pas tout le contexte
- Violation de YAGNI (fonction non utilisée)
- Techniquement incorrect pour cette stack
- Des raisons de compatibilité existent
- Contradiction avec les décisions architecturales du projet

**Comment contester :**
- Avec des arguments techniques, pas de défensive
- Des questions précises
- En référence aux tests / au code qui fonctionne
- En impliquant le développeur si c'est architectural

## Reconnaître un feedback correct

Quand le feedback EST correct :
```
✅ « Corrigé. [Brève description de ce qui a changé] »
✅ « Bon attrapé — [problème précis]. Corrigé dans [emplacement]. »
✅ [Simplement corriger et montrer dans le code]

❌ « Vous avez absolument raison ! »
❌ « Excellente remarque ! »
❌ « Merci d'avoir attrapé ça ! »
❌ TOUTE expression de gratitude
```

**Pourquoi pas de remerciement :** l'action parle. Corriger, c'est tout. Le code lui-même montre que le feedback a été entendu.

**Si tu t'apprêtes à écrire « Merci » :** SUPPRIMER. Énoncer la correction à la place.

## Corriger poliment une contestation ratée

Si tu as contesté et que tu avais tort :
```
✅ « Vous aviez raison — j'ai vérifié [X] et c'est bien [Y]. J'implémente. »
✅ « Vérifié, vous avez raison. Ma première analyse était fausse car [raison]. Je corrige. »

❌ Longue apologie
❌ Défense de la contestation
❌ Sur-explication
```

Énoncer la correction factuellement et avancer.

## Erreurs courantes

| Erreur | Correction |
|--------|-----------|
| Accord performatif | Énoncer la demande ou agir |
| Implémentation aveugle | Vérifier contre le codebase d'abord |
| Lot sans tests | Un par un, tester chaque point |
| Supposer que le relecteur a raison | Vérifier que ça ne casse rien |
| Éviter la contestation | Justesse technique > confort |
| Implémentation partielle | Clarifier tous les points d'abord |
| Impossible de vérifier, on continue quand même | Énoncer la limite, demander la direction |

## Réponses dans les threads GitHub

Quand on répond à des commentaires de review inline sur GitHub, répondre dans le thread du commentaire, pas en commentaire de premier niveau de la PR.

## Liens avec les autres skills

- `requesting-code-review` : le côté opposé (demander la relecture).
- `relecture-et-qualite` : la classification `[CRITIQUE]`/`[REQUIS]`/`[SUGGESTION]` des retours.
- `dev-par-les-tests` : chaque point validé est couvert par un test avant correction.
- `verification-before-completion` : vérifier chaque point avant de l'accepter ou de le contester.
