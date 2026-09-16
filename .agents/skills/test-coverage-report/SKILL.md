---
name: test-coverage-report
description: Génère un état des lieux de la couverture de tests par groupe/dossier pour reperer les zones a risque avant une release ou une revue G5. A utiliser pour un bilan qualite, pas pour une tache de code individuelle.
---

# Test Coverage Report

## Quand l'utiliser

- Avant une release, pour vérifier qu'aucune zone critique n'est sous-testée.
- En revue périodique G5, pour suivre l'évolution de la couverture par groupe.
- Après une vague de PR importantes sur un même périmètre (ex. plusieurs jeux G2 livrés d'un coup).

Ne pas l'utiliser pour écrire les tests d'une tâche donnée — ça reste la responsabilité de l'agent personnel qui livre la tâche (« Workflow d'une tâche », étape 3).

## Ce que fait cette skill

1. **Lancer la couverture** via la commande de test du projet (`npm test`, avec l'option de couverture si configurée — vérifier `package.json`).
2. **Répartir les résultats par groupe** en croisant les chemins de fichiers avec les périmètres définis dans `AGENTS.md` (G1 Core, G2 Jeux, G3 Rendu visuel, G4 Application, G5 Qualité/intégration).
3. **Signaler en priorité** :
   - Le code du **Core (G1)** touchant RNG, solde, XP ou sauvegarde — invariants métier critiques, doit être quasi entièrement couvert.
   - Les fichiers exposant l'**API publique** du Core, consommée par G2/G3/G4.
   - Les zones récemment modifiées sans test associé (croiser avec l'historique Git récent).
4. **Ne pas exiger 100%** partout : signaler la tendance (couverture qui baisse) autant que le chiffre absolu, et distinguer code critique (RNG, solde, permissions) de code d'affichage pur (G3).
5. **Croiser couverture et invariants métier** : vérifier explicitement qu'il existe au moins un test pour chacun des invariants listés dans `AGENTS.md` (XP ne redescend jamais, meilleur solde ne redescend jamais, pas de blocage à 0 jeton, solde/XP indépendants). Si un invariant n'a aucun test qui le vérifie directement, le signaler nommément — c'est plus grave qu'un simple pourcentage bas.
6. **Repérer les tests flaky** : si la commande de test est lancée plusieurs fois, noter les tests dont le résultat change d'un run à l'autre sans changement de code — à distinguer d'un vrai manque de couverture.
7. **Suivre la tendance dans le temps** : comparer au dernier rapport connu (si disponible) pour indiquer si la couverture globale et par groupe progresse, stagne ou régresse.
8. **Produire un rapport** : tableau groupe → % couverture → zones à risque nommées (fichier/fonction) → recommandation (qui doit agir, avec quel ticket si un manque de test bloque une release).

## Seuils indicatifs par type de code

| Type de code | Exemple | Seuil recommandé |
|---|---|---|
| Core critique (RNG, solde, XP, sauvegarde, permissions) | G1 | Très élevé — quasi exhaustif |
| API publique du Core | G1 | Élevé — chaque fonction exposée testée avec cas nominal + erreur |
| Logique de jeu (règles, calcul de gains) | G2 | Élevé |
| Orchestration / navigation | G4 | Moyen |
| Rendu visuel pur, animations | G3 | Faible — privilégier des tests de non-régression ciblés plutôt qu'une couverture exhaustive |

Ces seuils sont indicatifs, pas des règles absolues du projet — à ajuster par G5 selon le contexte.

## Exemple de sortie

```
Couverture globale : 71% (précédent rapport : 68%, ↑)

| Groupe | Couverture | Zones à risque |
|---|---|---|
| G1 Core | 92% | src/core/save.js non testé (fonction de sauvegarde) |
| G2 Jeux | 65% | blackjack/engine.js : calcul du split non couvert |
| G3 Rendu | 40% | acceptable (code d'affichage pur) |
| G4 Application | 78% | classement/ranking.js : tri en cas d'égalité non testé |

Invariants sans test direct : "jamais bloqué à 0 jeton" (aucun test trouvé sur le mécanisme de relance)
Tests flaky détectés : blackjack.test.js > "gère un double as" (échoue 1 run sur 5)

Recommandation : bloquer la release tant que le mécanisme de relance à 0 jeton n'a pas de test — ticket à ouvrir pour G1/G2.
```

## Ce que cette skill ne fait PAS

- N'écrit ni ne modifie de tests — elle identifie les manques et les remonte.
- Ne bloque pas seule une release — elle fournit l'évidence, la décision de bloquer reste humaine (G5).
- Ne juge pas le code hors couverture de tests (pas une revue de qualité générale — voir une skill dédiée pour ça si besoin).
- Ne diagnostique pas la cause d'un test flaky en détail (voir `flaky-test-detector` si elle existe) — se contente de le signaler.

## En cas de doute

Si le découpage groupe/dossier n'est pas clair pour un fichier (frontière ambiguë G2/G3 par exemple), le signaler comme « non attribué » dans le rapport plutôt que de deviner, et remonter à G5.
