---
name: verification-before-completion
description: À utiliser avant de déclarer un travail terminé, un bug corrigé ou des tests au vert — exécuter les commandes de vérification et confirmer la sortie avant toute affirmation de succès. Preuves d'abord, affirmations ensuite.
license: MIT
metadata:
  source: https://github.com/obra/superpowers
  original: "Verification Before Completion (obra/superpowers)"
---

# Vérification avant déclaration de complétion

## Principe fondamental

**Preuves d'abord, affirmations ensuite. Toujours.**

## Loi de fer

```
AUCUNE AFFIRMATION DE COMPLETION SANS PREUVE DE VÉRIFICATION FRAÎCHE
```

Si la commande de vérification n'a pas été exécutée dans ce message, il est interdit de déclarer qu'elle passe.

## Fonction de contrôle

```
AVANT de déclarer un statut ou d'exprimer la satisfaction :

1. IDENTIFIER : quelle commande prouve cette affirmation ?
2. EXÉCUTER : la commande COMPLÈTE (fraîche, en entier)
3. LIRE : la sortie complète, vérifier le code de sortie, compter les échecs
4. VÉRIFIER : la sortie confirme-t-elle l'affirmation ?
   - NON : énoncer le statut réel avec la preuve
   - OUI : énoncer l'affirmation AVEC la preuve
5. ENFIN : formuler l'affirmation

Sauter une étape = mentir, pas vérifier
```

## Tableau de correspondance

| Affirmation | Preuve requise | Insuffisant |
|-------------|----------------|-------------|
| Les tests passent | Sortie de `npm test` : 0 échec | Ancienne exécution, « devrait passer » |
| Le lint est clean | Sortie de `npm run lint` : 0 erreur | Vérification partielle, extrapolation |
| Le build réussit | `npm run build` : code de sortie 0 | Le lint passe, « les logs ont l'air bons » |
| Le bug est corrigé | Le test du symptôme original passe | Le code a changé, correction supposée |
| Le test de régression fonctionne | Cycle rouge-vert vérifié | Le test passe une seule fois |
| L'agent a terminé | Le diff git montre les changements | L'agent a rapporté « succès » |
| Les exigences sont remplies | Checklist point par point | Les tests passent |

Alignement avec le Quality Gate du projet (`ci-cd-et-automatisation`) : `npm ci` → `npm run lint` → `npm test` → `npm run build`.

## Drapeaux rouges — STOP

- Utiliser « devrait », « probablement », « semble »
- Exprimer la satisfaction avant vérification (« Super ! », « Parfait ! », « C'est bon ! »)
- S'apprêter à committer / pousser / ouvrir une PR sans vérification
- Faire confiance aux rapports de succès d'un agent
- S'en tenir à une vérification partielle
- Penser « juste cette fois-ci »
- Être fatigué et vouloir en finir
- **TOUTE formulation impliquant le succès sans avoir exécuté la vérification**

## Prévention des rationnalisations

| Excuse | Réalité |
|--------|---------|
| « Ça devrait marcher maintenant » | EXÉCUTER la vérification |
| « J'en suis sûr » | La confiance ≠ la preuve |
| « Juste cette fois-ci » | Aucune exception |
| « Le lint est passé » | Le lint ≠ le build |
| « L'agent a dit que c'est bon » | Vérifier indépendamment |
| « Je suis fatigué » | L'épuisement n'est pas une excuse |
| « Une vérification partielle suffit » | Le partiel ne prouve rien |
| « J'ai changé les mots, donc la règle ne s'applique plus » | L'esprit prime sur la lettre |

## Patterns clés

**Tests :**
```
✅ [npm test] [Sortie : 34/34 pass] « Tous les tests passent »
❌ « Devrait passer » / « Ça a l'air bon »
```

**Tests de régression (cycle rouge-vert, voir la skill `dev-par-les-tests`) :**
```
✅ Écrire → Exécuter (passe) → Révert le correctif → Exécuter (DOIT ÉCHOUER) → Restaurer → Exécuter (passe)
❌ « J'ai écrit un test de régression » (sans vérification rouge-vert)
```

**Build :**
```
✅ [npm run build] [Sortie : exit 0] « Le build passe »
❌ « Le lint est passé » (le lint ne vérifie pas la compilation)
```

**Exigences :**
```
✅ Relire le plan → Créer une checklist → Vérifier chaque point → Reporter les manques ou la complétion
❌ « Les tests passent, phase terminée »
```

**Délégation à un agent :**
```
✅ L'agent rapporte le succès → Vérifier le diff git → Vérifier les changements → Reporter l'état réel
❌ Faire confiance au rapport de l'agent
```

## Quand l'appliquer

**TOUJOURS avant :**
- Toute variante d'affirmation de succès ou de complétion
- Toute expression de satisfaction
- Tout énoncé positif sur l'état du travail
- Un commit, une création de PR, la fin d'une tâche
- Le passage à la tâche suivante
- La délégation à un agent

La règle s'applique aux phrases exactes, aux reformulations, aux synonymes et à toute implication de succès.

## Liens avec les autres skills

- `ci-cd-et-automatisation` : le Quality Gate est la preuve à produire, pas une affirmation.
- `prepare-pr` : la section « Vérifications » de la PR ne liste que ce qui a été exécuté.
- `dev-par-les-tests` : vérifier le RED (échec) avant le GREEN (succès).
- `flux-git-et-versionnement` : ne jamais affirmer un état git sans l'avoir vérifié.
- `bugfix` et `feat-dev` : les étapes de vérification de ces workflows.
