---
name: core-invariant-tests
description: Verifie qu'il existe un test unitaire dedie pour chaque invariant metier du jeu liste dans AGENTS.md, et genere les tests manquants. A utiliser sur le Core (G1) et avant toute release.
---

# Core Invariant Tests

## Quand l'utiliser

- Avant une release, pour vérifier que chaque invariant métier a une preuve de test, pas juste une couverture de ligne.
- Après une modification du Core touchant solde, XP, niveau, ou sauvegarde.
- Complémentaire de `.agents/skills/test-coverage-report/SKILL.md` (qui mesure le %), cette skill vérifie la **présence** d'un test par invariant, indépendamment du pourcentage global.

## Invariants à couvrir (source : `AGENTS.md`, section "Invariants métier")

1. Le solde de jetons peut monter et descendre librement (gains/pertes).
2. L'XP et le niveau **ne redescendent jamais**, même après une perte ou une faillite.
3. Un joueur ruiné (solde à 0) garde son niveau et ses jeux débloqués.
4. Le **meilleur solde atteint** ne redescend jamais, même si le solde actuel baisse.
5. Un joueur n'est **jamais bloqué à 0 jeton** (mécanisme de relance).

## Ce que fait cette skill

1. **Pour chaque invariant**, chercher dans `tests/unit/` (et `tests/integration/`) un test dont le nom ou le contenu prouve explicitement ce comportement — pas seulement un test qui "passe par là" incidemment.
2. **Marquer chaque invariant** : ✅ couvert (avec le fichier/test qui le prouve), ❌ non couvert.
3. **Pour chaque invariant non couvert**, générer un squelette de test `node:test` qui :
   - Met en place un état initial pertinent (ex. solde élevé, niveau donné).
   - Déclenche l'action qui pourrait violer l'invariant (perte importante, faillite, gain, etc.).
   - Vérifie explicitement que l'invariant tient (ex. `assert.ok(newLevel >= previousLevel)`).
4. **Porter une attention particulière au RNG** : tout test touchant un invariant qui dépend d'un résultat de jeu doit utiliser une graine fixe / un mock déterministe de `src/core/rng.js`, jamais un vrai tirage aléatoire — sinon le test est flaky par construction (voir `.agents/skills/flaky-test-detector/SKILL.md`).
5. **Rapporter** un tableau invariant → statut → fichier de test, à inclure dans le compte rendu de la tâche ou dans le rapport de release.

## Exemple de test généré (invariant n°4 — meilleur solde)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as coreService from '../../src/services/coreService.js';

test('le meilleur solde ne redescend jamais après une perte', () => {
  // Arrange : simuler un solde élevé puis une perte
  // (adapter selon l'API réelle de coreService une fois stabilisée)
  const before = coreService.getState();
  const bestBefore = before.bestBalance;

  // Act : simuler une perte importante
  // coreService.play(...) avec un résultat perdant mocké

  // Assert
  const after = coreService.getState();
  assert.ok(after.bestBalance >= bestBefore, 'bestBalance ne doit jamais redescendre');
});
```

## Ce que cette skill ne fait PAS

- Ne modifie jamais le Core lui-même pour faire passer un test — si un invariant est cassé, c'est un bug à signaler, pas un test à assouplir.
- Ne remplace pas une couverture de test complète — elle vérifie spécifiquement les 5 invariants listés, pas l'ensemble du Core.
- N'invente pas l'API exacte de `coreService.js` si elle n'est pas encore stable — dans ce cas, signaler le squelette comme dépendant d'un contrat à confirmer plutôt que de deviner les noms de fonctions.

## En cas de doute

Si un invariant semble violé par le comportement actuel du Core, ne pas modifier le test pour le faire passer — remonter en `BLOQUANT` (cf. `.agents/skills/pr-checklist/SKILL.md`, point invariants).
