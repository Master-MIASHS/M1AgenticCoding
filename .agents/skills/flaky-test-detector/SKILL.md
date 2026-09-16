---
name: flaky-test-detector
description: Relance une suite de tests plusieurs fois pour isoler les tests instables (flaky) et propose leur mise en quarantaine, sans masquer un vrai bug. A utiliser quand une CI echoue de facon intermittente ou avant une release pour fiabiliser la suite.
---

# Flaky Test Detector

## Quand l'utiliser

- Une PR échoue en CI puis passe au re-run sans aucun changement de code.
- Avant une release, pour fiabiliser la suite de tests et éviter de bloquer des PR saines.
- Un test échoue de façon non reproductible en local.

Ne pas l'utiliser pour un test qui échoue **systématiquement** — ce n'est pas un test flaky, c'est un vrai échec à corriger normalement (voir `pr-checklist` / `ci-triage`).

## Ce que fait cette skill

1. **Isoler le(s) test(s) suspect(s)** : à partir d'un run CI signalé comme intermittent, ou en relançant toute la suite plusieurs fois (`npm test` répété, minimum 5 runs consécutifs, plus si le taux d'échec observé est faible).
2. **Mesurer le taux d'échec** par test suspect (ex. 2 échecs sur 10 runs = 20%).
3. **Diagnostiquer la cause probable**, sans forcément la corriger :
   - Dépendance à l'ordre d'exécution des tests (état partagé non réinitialisé entre tests).
   - Dépendance au temps réel (`Date.now()`, timers, délais fixes trop courts).
   - Tirage aléatoire non maîtrisé dans un test touchant au RNG du Core — **vérifier en particulier que le test utilise bien une graine (seed) fixe et ne dépend pas d'un hasard non contrôlé**.
   - Appels réseau ou I/O non mockés.
   - Concurrence / async mal attendu (`await` manquant, race condition dans le test lui-même).
4. **Distinguer flaky vs vrai bug intermittent** : un flaky test a une cause dans le test (setup, timing, isolation) ; un vrai bug intermittent a une cause dans le code testé (ex. race condition réelle dans le Core). En cas de doute sur cette distinction, **ne pas classer en flaky** — remonter comme bug potentiel plutôt que de masquer le signal.
5. **Proposer une action** :
   - Si cause claire et corrigible simplement (ex. seed manquante) → suggérer le correctif précis.
   - Si cause non identifiée rapidement → proposer une **mise en quarantaine temporaire** (marquer le test comme `skip`/`quarantine` avec un commentaire renvoyant vers un ticket de suivi), jamais une suppression pure et simple.
6. **Tracer** : consigner le test quarantiné, la date, le taux d'échec observé et le ticket de suivi, pour que G5 garde une liste à jour des tests sous surveillance.

## Sortie attendue

```
Suite relancée 10 fois.

| Test | Échecs | Taux | Cause probable |
|---|---|---|---|
| blackjack.test.js > "gère un double as" | 2/10 | 20% | Pas d'await sur la résolution de la main asynchrone |
| roulette.test.js > "paye la mise sur zéro" | 0/10 | 0% | OK |

Recommandation : corriger l'await manquant (cause identifiée, fix simple) plutôt que quarantaine.
Si non corrigé sous 48h : quarantaine + ticket G5-142.
```

## Ce que cette skill ne fait PAS

- Ne supprime jamais un test sans quarantaine tracée et ticket associé — un test qui disparaît silencieusement fait perdre de la couverture réelle sans que personne ne le sache.
- Ne corrige pas le code métier testé — seulement le test, et seulement si la cause est clairement côté test.
- Ne classe pas un échec en « flaky » par défaut pour faire passer une CI plus vite : le doute profite au bug, pas au vert.

## En cas de doute

Si la cause d'instabilité touche potentiellement le Core (RNG, calculs, état partagé), s'arrêter et signaler à G5/G1 plutôt que de quarantainer un test qui masquerait un vrai bug de concurrence.
