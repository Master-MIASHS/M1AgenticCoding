---
name: assertion-strength-checker
description: Detecte les tests unitaires faibles ou creux (assertions toujours vraies, tests sans assertion, over-mocking qui teste le mock plutot que le code). A utiliser en revue de PR sur tout fichier tests/unit/*.test.js.
---

# Assertion Strength Checker

## Quand l'utiliser

- En revue de PR, sur tout fichier `tests/unit/**/*.test.js` ajouté ou modifié.
- Quand la couverture de test est élevée (`test-coverage-report`) mais que des bugs passent quand même en prod — souvent le signe de tests creux plutôt qu'un manque de couverture.
- Avant une release, en passe de qualité sur les tests des modules critiques (Core, invariants).

## Ce que fait cette skill

Passe chaque `test(...)` au crible des patterns de tests faibles suivants :

1. **Assertion toujours vraie** : `assert.ok(true)`, `assert.equal(1, 1)`, `assert.ok(result)` sans vérifier la valeur réelle de `result` — le test passe toujours, peu importe le code testé.
2. **Aucune assertion** : un `test(...)` dont le corps appelle du code mais ne contient aucun `assert.*` — un crash serait détecté, mais un mauvais résultat silencieux ne l'est pas.
3. **Test qui vérifie le mock, pas le code** : le test mocke une dépendance puis vérifie que le mock a été appelé avec certains arguments, sans jamais vérifier le résultat produit par le code réel — utile parfois (vérifier une interaction), mais insuffisant si c'est la SEULE assertion du test.
4. **Une seule assertion pour un comportement à plusieurs facettes** : ex. un test de `play()` qui vérifie seulement le nouveau solde mais pas le changement d'XP, alors que la fonction affecte les deux.
5. **Assertions non spécifiques** : `assert.ok(result)` là où `assert.deepEqual(result, {balance: 100, xp: 50})` donnerait un diagnostic bien plus clair en cas d'échec.
6. **Try/catch qui avale l'erreur** : un test qui attrape une exception sans réassert dessus (`try { ... } catch (e) {}`), ce qui masque silencieusement un vrai crash.

## Sortie attendue

```
Fichier : tests/unit/games/roulette/payout.test.js

| Test | Problème détecté | Sévérité |
|---|---|---|
| "calcule le gain sur plein" | assert.ok(gain) sans vérifier la valeur exacte | Important |
| "gère une mise invalide" | aucune assertion, juste un appel de fonction | Bloquant |
| "applique la mise sur rouge/noir" | vérifie seulement result.win, pas result.amount | Mineur |

Recommandation : remplacer assert.ok(gain) par assert.equal(gain, 350) (mise 10 sur plein, cote 35).
```

## Ce que cette skill ne fait PAS

- N'écrit pas les tests corrigés à la place de l'auteur — elle signale le problème et propose une piste, l'auteur ajuste.
- Ne pénalise pas les tests d'interaction légitimes (vérifier qu'une fonction a bien été appelée) quand c'est vraiment ce qui est testé (ex. un test de logging) — seulement quand c'est la seule assertion d'un test qui prétend vérifier un résultat métier.
- Ne compte pas comme "faible" un test qui vérifie explicitement qu'une exception est levée (`assert.throws(...)`) — c'est une assertion forte, pas un test creux.

## En cas de doute

Si un test semble faible mais que son intention réelle n'est pas claire (nom du test vague), le signaler avec la question plutôt que de supposer qu'il est creux — un renommage du test peut suffire à clarifier qu'il fait exactement ce qui est prévu.
