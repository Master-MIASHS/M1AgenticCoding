---
name: utiliser-core
description: Utiliser la lecture d’état et le RNG du Core de Casino Fantôme depuis G2/G3/G4 via coreService, ou préparer le branchement interne G1 de l’état atomique et de la progression. Vérifier la disponibilité des exports avant intégration.
---

# Utiliser le Core

## Vérifier la version avant de coder

Lire `AGENTS.md`, `src/services/coreService.js` et le contrat concerné dans
`docs/contracts/`. Une PR ouverte ne rend pas sa fonction disponible sur main.
Ne pas copier un module interne pour contourner un export manquant.

Repères à la rédaction (à revérifier, pas des garanties permanentes) :
- `getState()` est public.
- Les algorithmes RNG sont intégrés par #28 ; leur exposition publique est dans #115.
- L’écriture interne `updateState` est intégrée par #139.
- L’adaptateur `createProgressionStore` est proposé dans #144 (ticket #143).
- Le branchement par défaut de la progression reste une étape séparée.

## G2/G3/G4 : accéder par la façade

Importer depuis `src/services/coreService.js` avec le chemin relatif adapté au
fichier appelant. Ne jamais importer `src/core/state.js`, `rng.js` ou `core.js`
depuis les consommateurs. G2 calcule les règles des jeux ; G3/G4 affichent les
résultats, sans calculer eux-mêmes le gagnant.

### Lire l’état : getState()

Utiliser pour afficher le solde, la progression ou les jeux débloqués.

```js
import { getState } from '<chemin-relatif>/services/coreService.js';
const snapshot = getState();
const { balance, bestBalance, xp, level, unlockedGames, history, role } = snapshot;
```

Le résultat est une copie indépendante, pas une référence réactive. Le modifier
ne met pas à jour le joueur. Relire après une opération réussie du Core. Ne pas
inventer des champs comme `pseudo` ou `xpForNextLevel` avant leur disponibilité.
La lecture peut échouer si l’initialisation du stockage échoue dans la version
utilisée : vérifier le comportement courant et le traitement d’erreur prévu.

### Tirer du hasard brut (après disponibilité des exports)

| Fonction | Quand l’utiliser | Retour / précaution |
|---|---|---|
| `roll(gameId, params?)` | Obtenir du hasard brut pour les règles G2 | `{ gameId, value, nonce }`, value dans `[0,1)` ; ne décide pas du résultat ; nonce n’est pas un identifiant garanti unique |
| `tirageEntier(min, max)` | Choisir un entier dans un intervalle | Bornes incluses, min ≤ max ; erreur pour bornes invalides |
| `tirageAvecPoids(elements, poids)` | Choisir un élément selon des poids relatifs | Tableaux non vides de même longueur ; poids ≥ 0 et somme > 0 ; pas besoin d’une somme égale à 1 |
| `melanger(liste)` | Mélanger un paquet ou une liste | Nouveau tableau ; mêmes occurrences et références ; entrée non modifiée ; erreur si l’entrée n’est pas un tableau |

```js
import { melanger } from '<chemin-relatif>/services/coreService.js';
const paquetMelange = melanger(paquetConstruitParG2);
```

G2 construit les cartes `{ rank, suit }`, garde la pioche et applique les règles.
Le Core ne connaît pas la valeur des cartes. Un sabot de deux jeux contient
normalement deux occurrences de chaque rang/couleur : vérifier la conservation
multiplicité par multiplicité, pas l’unicité des 104 valeurs.

Le mélange est superficiel : modifier un objet carte affecterait ses autres
références. Ne pas muter les cartes partagées. Un mélange peut rendre le même
ordre ; un test ne doit pas exiger un ordre différent.

Dans la version #28, la validation des poids et des bornes extrêmes est incomplète :
chaînes numériques acceptées, somme infinie possible, intervalle pouvant déborder.
Ne pas présenter ces cas comme gérés : utiliser des nombres finis, des poids dont
la somme est finie, des bornes entières sûres et une largeur sûre ; signaler à G1
les entrées hors domaine. Les défauts sont décrits dans #115.

`semer` n’est pas une API UI. Dans les tests internes G1 de reproductibilité seulement : importer
`semer` depuis `src/core/rng.js`, poser une graine et appeler `semer(null)` dans un
`finally`. Tout hasard passe par le Core, jamais par `Math.random()`.

## G1 uniquement : écriture et progression internes

Ces exemples supposent #139 et #144 intégrées dans la base de travail ; #144
reste à fusionner à la rédaction. Ils ne
constituent pas une autorisation d’import interne pour G2/G3/G4.

### updateState(updater)

Utiliser pour appliquer ensemble un ensemble de conséquences déjà calculées.
Le callback synchrone reçoit une copie et retourne l’état complet. Aucun effet
externe dans le callback ; aucune écriture ou restauration imbriquée.

```js
import { updateState } from './state.js';
updateState((current) => ({ ...current, ...consequencesValidees }));
```

`consequencesValidees` est produit par les modules G1, pas par une entrée UI brute.
L’état conserve son format, XP/niveau/meilleur solde ne diminuent pas ; le niveau
est un entier sûr et le meilleur solde couvre le solde courant. Données JSON
seulement : pas de cycles, fonctions, dates, collections, valeurs non finies,
undefined ou propriétés supplémentaires sur des tableaux.

Le stockage est écrit avant publication en mémoire. Toute erreur de validation,
calcul ou persistance est propagée ; ne pas afficher de succès si elle survient.
L’atomicité couvre une opération synchrone dans une instance, pas plusieurs onglets.
La restauration est distincte ; ne pas utiliser ce setter pour contourner ses règles.

### createProgressionStore({ getState, updateState })

Utiliser pour brancher le calcul de progression de Reda sur un stockage synchrone
respectant le contrat atomique. Pas de stockage supplémentaire, ni de cache du joueur.

```js
import { getState, updateState } from './state.js';
import { createProgressionStore } from './progression.store.js';
import { createProgression } from './progression.js';
const progression = createProgression(createProgressionStore({ getState, updateState }));
```

`read()` renvoie une nouvelle paire `{ xp, level }`. `write({ xp, level })` exige
les deux champs, ignore les autres, refuse les diminutions et propage les erreurs.
XP finie ≥ 0 (décimales acceptées), niveau entier sûr ≥ 1. Le calcul du niveau
reste à `createProgression`. Les dépendances injectées doivent être synchrones.

Ne pas remplacer seul l’instance par défaut de Reda ni prétendre que cet exemple
est déjà le branchement de production. Pour régler une partie, ne pas enchaîner
une écriture de solde puis une écriture XP : #131 prévoit une transaction globale
comprenant solde, XP/niveau, meilleur solde et historique.

## Vérifier l’intégration

- Contrôler les exports sur la branche réellement utilisée.
- Tester via coreService pour les consommateurs, et avec des dépendances injectées
  pour les modules internes.
- Vérifier erreurs, copies indépendantes et absence d’écriture partielle.
- Ne pas appeler addXP après play si le contrat de play applique déjà l’XP : éviter
  le double gain. Vérifier le comportement effectif, encore en évolution.
- Exécuter les tests concernés, puis tests/lint/build avant la PR.

Coordination : #61 (état), #70 (cartes), #115 (exports), #131 (règlement),
#139 (écriture atomique), #143/#144 (adaptateur). Une évolution de contrat passe
par G1/G5 ; cette skill ne remplace pas les contrats validés.
