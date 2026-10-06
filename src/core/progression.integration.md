# Progression XP — intégration Core en attente

La configuration `config/progression.config.js` est **TEMPORAIRE** : niveaux
1 à 5 aux seuils cumulés 0, 100, 250, 500 et 1000 XP. Ces valeurs ne sont pas
un barème validé. Modifier ce fichier avant une nouvelle session pour les remplacer.
Le calcul sature au dernier niveau configuré mais l'XP continue de s'accumuler.
Un niveau déjà acquis est conservé, même si une nouvelle courbe le placerait plus bas.
Les gains sont des nombres finis positifs ou nuls ; les décimales sont acceptées.
Aucun gain automatique par partie n'est défini ou branché dans cette mission.

## Ce qui fonctionne aujourd'hui

`addXP(amount)` et `getLevel()` gardent leurs signatures publiques. Ils utilisent
un mock privé en mémoire, initialisé avec `getState()` au premier appel.
`createProgression(store, thresholds)` permet d'injecter un adaptateur et une
configuration pour les tests ou la future intégration. `calculateLevel(xp,
thresholds)` est un calcul pur. Ces helpers internes ne sont pas réexportés
par `core.js` ou `coreService.js`.

## Limite importante

**Le mock n'écrit jamais dans `state.js`.** `coreService.getState()` garde donc
ses anciennes valeurs XP/niveau. Les pages qui le lisent et `exportSave()` ne
voient pas les gains du mock. Recharger la page perd les gains. Les changements
ultérieurs du state Core, imports de sauvegarde et changements de joueur ne sont
pas synchronisés avec le mock. Ce mock sert au développement, pas à une intégration
persistante. Aucun second mécanisme localStorage n'est ajouté.

## Interface demandée au groupe Core

Fournir un adaptateur interne synchrone avec les deux opérations suivantes :

```js
const store = {
  read() { /* retourne { xp, level } du joueur courant */ },
  write({ xp, level }) { /* met à jour uniquement ces deux champs ensemble */ },
};
```

- `read()` doit refléter l'état courant, y compris après chargement d'une sauvegarde.
- `write()` doit appliquer les deux champs atomiquement, sans modifier le solde,
  les mises, les jeux débloqués ou tout autre champ. En cas d'échec, lever une erreur
  sans écriture partielle. La progression attend le succès avant de retourner.
- Le Core garde la responsabilité de la sauvegarde, restauration, validation de
  ses écritures, changement de joueur et éventuelles notifications du state.
- Le niveau est calculé par la progression. Les lectures attendent une XP finie
  positive ou nulle et un niveau entier sûr supérieur ou égal à 1.

Après accord du G1, remplacer uniquement l'initialisation de `getProgression()`
dans `progression.js` par `createProgression(adaptateurCore)`. Ne pas exposer un
setter général à l'UI. Si le futur Core est asynchrone, ce contrat synchrone devra
être revu ensemble avant branchement.

Tests d'intégration à ajouter lorsque cet adaptateur existe : cohérence entre
`addXP`, `getLevel` et `getState`, export/restauration de l'XP, changement de joueur
et absence de modification du solde. Aucun fichier du Core hors progression et
configuration n'a été modifié pour fournir cette interface.
