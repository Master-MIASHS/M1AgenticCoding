---
name: test-naming-convention
description: Verifie que chaque fichier de test unitaire respecte l'emplacement et le nommage attendus (miroir de src/ sous tests/unit/, suffixe .test.js). A utiliser avant une PR qui ajoute ou deplace des tests.
---

# Test Naming Convention

## Convention imposée

- **Emplacement** : miroir exact de l'arborescence `src/` sous `tests/unit/`.
  `src/core/rng.js` → `tests/unit/core/rng.test.js`
  `src/games/blackjack/engine.js` → `tests/unit/games/blackjack/engine.test.js`
- **Suffixe** : `.test.js` (pas `.spec.js`, pas `.tests.js`).
- **Tests d'intégration** : sous `tests/integration/`, pas mélangés avec `tests/unit/`.
- **Un fichier de test par fichier source** en règle générale — éviter un `tests/unit/games.test.js` fourre-tout qui teste plusieurs modules sans rapport.

## Quand l'utiliser

- Avant d'ouvrir une PR qui ajoute des tests.
- Après un renommage/déplacement d'un fichier source, pour vérifier que son test a suivi.
- En revue G5, pour un audit périodique de la cohérence de `tests/`.

## Ce que fait cette skill

1. **Lister tous les fichiers sous `tests/unit/` et `tests/integration/`.**
2. **Pour chaque fichier source dans `src/`**, vérifier s'il existe un test au chemin miroir attendu.
3. **Pour chaque fichier de test existant**, vérifier :
   - Qu'il est bien sous `tests/unit/` ou `tests/integration/` (pas ailleurs, pas à côté du fichier source dans `src/`).
   - Qu'il suit le suffixe `.test.js`.
   - Que son chemin correspond bien au fichier source qu'il prétend tester (pas de dérive après un renommage de l'un des deux côtés).
4. **Signaler** :
   - Fichiers source sans test associé (pas forcément bloquant — dépend du seuil de couverture attendu, voir `.agents/skills/test-coverage-report/SKILL.md`).
   - Fichiers de test orphelins (le fichier source qu'ils testaient a été supprimé/renommé sans que le test suive).
   - Fichiers de test mal nommés ou mal placés.

## Sortie attendue

```
| Fichier source | Test attendu | Statut |
|---|---|---|
| src/core/rng.js | tests/unit/core/rng.test.js | ✅ existe |
| src/games/blackjack/engine.js | tests/unit/games/blackjack/engine.test.js | ❌ absent |
| tests/unit/old-roulette.test.js | — | ⚠️ orphelin : src/games/old-roulette/ n'existe plus |
```

## Ce que cette skill ne fait PAS

- Ne déplace ni ne renomme aucun fichier automatiquement — elle signale, la personne (ou l'agent auteur du renommage) corrige.
- Ne juge pas le contenu ou la qualité des tests — uniquement leur emplacement et leur nommage (voir `unit-test-scaffolder` pour le contenu).
- Ne supprime jamais un test orphelin sans confirmation — il peut couvrir un comportement encore valide malgré un renommage de fichier source.

## En cas de doute

Si un fichier source récemment ajouté n'a manifestement aucun test prévu à court terme (ex. fichier de configuration statique), ne pas forcer un test vide juste pour respecter la convention — signaler comme exemption légitime plutôt que de créer un test qui ne teste rien.
