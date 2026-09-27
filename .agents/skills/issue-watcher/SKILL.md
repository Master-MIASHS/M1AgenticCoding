---
name: issue-watcher
description: À utiliser pour détecter et valider qu'une issue est prête à être codée, avant toute création de branche. Déclenchée par le label « To code » : lecture du fil complet, vérification du ticket lié, du label de groupe et de l'absence de doute. En cas de doute : arrêt et remontée à G5, jamais d'interprétation.
---

# Issue Watcher

## Quand l'utiliser

- Avant l'étape « Brancher » du Workflow d'une tâche, dès qu'une issue porte le label `To code`.
- Quand un agent se voit confier une issue et veut s'assurer que le besoin est compris et non ambigu avant de coder.

## Ce que fait cette skill

Valide qu'une issue labellisée `To code` est prête à être codée, puis livre un résumé court du besoin compris. Elle ne crée pas de branche (c'est le rôle de `branch-creator`) et n'écrit aucun code.

## Étapes

1. **Identifier l'issue** : obtenir son URL ou son numéro et confirmer qu'elle porte le label `To code`. Pas de label → la skill ne s'applique pas, l'issue n'est pas prête.
2. **Lire l'intégralité du fil** : titre, description complète, **tous les commentaires** (les derniers modifient souvent le périmètre), PRs liées, issues croisées. Utiliser tous les moyens disponibles : `gh` CLI, API GitHub, page de l'issue, ou copie du fil fournie par l'utilisateur. Ne jamais s'arrêter au titre seul.
3. **Vérifier le ticket** : un ticket doit exister et être explicitement lié à l'issue (référence dans le fil ou lien). Absent → s'arrêter : demander à G5 d'en créer un, puis reprendre.
4. **Vérifier le label de groupe** : l'issue doit porter un label `groupe: G1` à `groupe: G5` cohérent avec le groupe de l'agent qui la traite (variable `SKOTCKER` du `.env` local). Absent ou incohérent → s'arrêter, remonter à G5.
5. **Vérifier l'absence de doute** : périmètre, invariants métier, décisions ouvertes (section « Décisions ouvertes » de `AGENTS.md`). Si le fil laisse un doute sur le périmètre, le but ou une décision non tranchée → s'arrêter, poser la question à G5 (règle absolue n°10). **Ne jamais commencer To code sur une interprétation.**

### Remonter à G5 (étapes 3, 4 et 5)

- Ouvrir une issue pour G5 : label `groupe: G5`, le besoin précis, le numéro de l'issue bloquée, le ticket lié.
- Sans accès en écriture à GitHub (ni `gh`, ni token) : remettre à l'utilisateur le titre et le corps d'issue prêts à coller, puis s'arrêter.
- Ne jamais trancher à la place de G5 ni substituer une interprétation à la décision.

## Sortie attendue

Un résumé court (2-3 lignes) du besoin compris, servant de base à l'étape « Brancher » (`branch-creator`) :

> **Issue #<n> — <titre>**
> Besoin : <1 ligne>
> Périmètre : <1 ligne> | Ticket : <n°> | Groupe : <Gx> → prête à brancher / bloquée (raison + issue G5 ouverte)

## Ce que cette skill ne fait PAS

- Ne crée pas de branche, ne code pas, ne modifie pas de label, ne ferme pas l'issue.
- Ne répond pas à la place de G5 dans le fil de discussion.
- N'interprète pas l'ambiguïté : doute = arrêt.

## Cas particuliers

- **Issue labellisée `To code` mais fermée** : s'arrêter, l'issue n'est plus active.
- **Plusieurs labels `groupe: Gx`** : s'arrêter, remonter à G5 (chevauchement de périmètre).
- **Un commentaire récent modifie la demande initiale** : relire le fil complet et s'appuyer sur la version la plus récente du besoin ; si cela laisse un doute → s'arrêter (étape 5).
- **Ticket lié mais issue d'un autre groupe** : s'arrêter, c'est au groupe ciblé par le label de traiter l'issue.
