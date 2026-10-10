# Conception — Réglages admin enregistrés et exposés (G1, #260)

Suite des événements bonus (n°35, #225) et du capital réglable (n°39, #208). Demandé par @ahmed-abc73 (#218, #253) et @Amina1203 (#218) ; couvre le point 1 de #255 (@Kardiatou102).

## Objectif

Rendre **utilisables** les réglages admin : le capital de départ et les événements bonus sont enregistrés (ils survivent au rechargement), `play()` peut lire le multiplicateur actif, et l'admin peut les régler via `coreService`.

## Non-objectifs

- Capital effectif pour l'état initial et `creerProfil`, et représentation de « aucun joueur » : #253 (@ahmed-abc73, `state.js`). Ce lot lui fournit `getCapitalDeDepartActuel()`.
- Application du multiplicateur dans `play()` : #131 (@Amina1203). Ce lot lui fournit `getMultiplicateurBonus(cible)`.
- Corriger un solde, changer un rôle, bannir (#255, points 2 à 4) : décision G5 / profils multiples (n°5).
- Aucune modification de `state.js`, de `storage.js` ni des sauvegardes.

## Conception

### `src/core/config/stockage-local.js` (nouveau)

`createStockageLocal(cle, valeurParDefaut, { valider, stockage })` → `{ read, write }` :

| Situation | Comportement |
|---|---|
| Clé absente | Valeur par défaut |
| Clé présente et valide | Valeur enregistrée |
| JSON illisible, contenu refusé par `valider`, ou `localStorage` inaccessible | Avertissement console, valeur par défaut ; la clé est **conservée** jusqu'au prochain enregistrement réussi (même règle que #240) |
| Pas de `localStorage` (Node, tests) | Mémoire seule |
| `write` | Enregistre d'abord, puis publie en mémoire ; une écriture qui échoue lève une erreur et ne change rien |

`read()` renvoie toujours une copie.

### Instances partagées

| Module | Clé | Fonctions partagées |
|---|---|---|
| `events.config.js` | `casino_config_evenements` (tableau) | `getMultiplicateurBonus(cible)`, `getEvenementsBonus()`, `lancerEvenementBonus(evenement)`, `arreterEvenementBonus(id)` |
| `player.config.js` | `casino_config_joueur` (`{ capitalDeDepart? }`) | `getCapitalDeDepartActuel()`, `reglerCapitalDeDepart(montant)` |

### Façade (`core.js` → `coreService`)

| Fonction publique | Accès |
|---|---|
| `getStartingCapital()` | lecture |
| `getEvenementsBonus()`, `getMultiplicateurBonus(cible)` | lecture |
| `setStartingCapital(montant)` | **admin** (`assertCanModifyConfig`, n°24) |
| `lancerEvenementBonus(evenement)`, `arreterEvenementBonus(id)` | **admin** |

Les noms `getStartingCapital` / `setStartingCapital` reprennent la demande du G4 (#255).

## Décisions

| Décision | Pourquoi |
|---|---|
| Une clé `localStorage` par réglage, hors de `casino_state` | Réglages admin globaux, indépendants des profils et des sauvegardes (#253, point 1) ; aucun changement de schéma de l'état. |
| Règle du démarrage robuste (#240) | Ne jamais planter au chargement ; ne pas effacer une donnée illisible avant une écriture réussie. |
| Validation par le module propriétaire (`valider`) | Le stockage reste générique ; chaque module garde ses règles. |
| Rôle vérifié dans le Core, lu dans l'état | Règle 5 ; même modèle que `setGameConfig` (#211). |
| Aucune option injectable exposée | Leçon de #227 : l'UI ne choisit ni stockage, ni horloge, ni configuration. |

## Risques

- Aujourd'hui, personne ne peut devenir admin (rôle `player` par défaut) : les réglages sont refusés dans l'application tant qu'un parcours admin n'existe pas.
- Une sauvegarde exportée ne contient pas ces réglages (voulu : ils ne dépendent pas du joueur).

## Plan de tests

Commande : `npm test`.

| Fichier — `it` | Avant | Après |
|---|---|---|
| `stockage-local` — valeur par défaut sans clé ; enregistre puis relit | échec | succès |
| `stockage-local` — mémoire seule sans `localStorage` | échec | succès |
| `stockage-local` — JSON illisible ou contenu invalide : avertissement, défaut, clé conservée | échec | succès |
| `stockage-local` — `localStorage` inaccessible en lecture : défaut ; écriture qui échoue : erreur, rien ne change | échec | succès |
| `reglages-admin` — événements : multiplicateur lu par l'instance partagée, conservé après rechargement | échec | succès |
| `reglages-admin` — capital : réglé, conservé après rechargement, défaut 1000 | échec | succès |
| `reglages-admin` — façade : lecture publique ; réglage refusé à un joueur sans écriture, accepté pour un admin | échec | succès |
| `reglages-admin` — façade : aucune option injectable | échec | succès |
