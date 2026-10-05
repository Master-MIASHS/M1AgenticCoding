---
name: jsdoc-et-documentation
description: Standardise la documentation du code via JSDoc pour garantir la lisibilité entre les 25 développeurs.
---

## Compétence : jsdoc-et-documentation

- **Documentation obligatoire :** Toute fonction ou logique métier dans `src/core/` et `src/services/` doit posséder un bloc JSDoc.
- **Format requis :** Explication brève en français de l'utilité, balises `@param` avec les types, et balise `@returns`.
- **Pertinence :** Les commentaires expliquent le "pourquoi" et non le "comment". Ne pas documenter les hooks React standards ou le code évident.

## Quand l'utiliser

- Création ou modification d'une fonction dans `src/core/` ou `src/services/`.
- Relecture d'une fonction métier dont le comportement n'est pas évident.
- Quand une règle métier (casino, tirage, score) n'est pas auto-documentée par le code.

## Exemple

```js
/**
 * Tire une carte aléatoire du paquet en utilisant le générateur centralisé.
 * Le tirage passe par rng.js pour garantir la reproductibilité des tests.
 *
 * @param {string[]} paquet - Listes des cartes restantes dans le jeu.
 * @returns {string} La carte tirée.
 */
function tirerCarte(paquet) {
  const indice = rngInt(0, paquet.length - 1);
  return paquet[indice];
}
```

## Drapeaux rouges

- Fonction de `src/core/` ou `src/services/` sans bloc JSDoc.
- `@param` sans type, ou `@returns` manquant.
- Commentaire qui reformule le code (« incrémente i ») au lieu d'expliquer le pourquoi.
- Documentation de hooks React standards ou de code évident.
- Explication en anglais là où la règle impose le français.

## Liens avec les autres skills

- `ingenierie-ui-frontend` : les fonctions métier extraites dans `coreService.js` sont documentées.
- `relecture-et-qualite` : l'axe lisibilité vérifie la présence et la qualité du JSDoc.
- `dev-par-les-tests` : le comportement documenté est celui que les tests couvrent.
