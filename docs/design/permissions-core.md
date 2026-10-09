# Permissions du Core — G1, Amina, #210

## Objectif

Fournir au Core une vérification unique des permissions associées aux rôles
cumulatifs `player`, `moderator` et `admin`.

## Non-objectifs

- Modifier les modules de configuration existants ou leur API.
- Exposer les fonctions dans `core.js` ou `coreService.js`.
- Gérer les profils, la persistance des rôles ou l'interface d'administration.
- Ajouter des permissions de modération qui ne sont pas demandées par #210.

## Conception

Le nouveau module `src/core/permissions.js` contient la hiérarchie des rôles et
deux fonctions pures :

- `hasMinimumRole(role, requiredRole)` valide les deux identifiants et renvoie un
  booléen ;
- `assertCanModifyConfig(role)` ne renvoie rien pour un administrateur et lève
  une erreur explicite pour les autres rôles.

La hiérarchie est cumulative : `player < moderator < admin`. La modification de
configuration exige le niveau `admin`.

Le setter public `setGameConfig` lit le rôle depuis `state.js` dans le Core, puis
appelle `assertCanModifyConfig` avant toute écriture. Le rôle ne vient jamais de
l'UI ni des paramètres de l'appel. Le contrôle reste donc côté Core.

## Décisions

- Les rôles sont des chaînes fermées et figées pour éviter les fautes
  silencieuses.
- Une entrée inconnue lève une `TypeError` au lieu d'être traitée comme un simple
  refus : il s'agit d'une erreur de programmation.
- Un refus d'accès valide lève une `Error` distincte de la validation des entrées.
- Le module de permissions reste pur. La façade interne `core.js` lit l'état
  fiable avant d'appeler le setter de configuration existant.

## Risques

- L'application est entièrement front-end, sans serveur d'autorisation. Le rôle
  est stocké côté client et une personne qui modifie le code, le stockage ou une
  sauvegarde peut donc contourner cette protection. La tâche 24 garantit la
  frontière logique demandée (contrôle dans le Core plutôt que dans l'UI), pas
  une sécurité réelle contre le propriétaire du navigateur.
- `state.js` n'accepte actuellement que `player` et `admin`; l'ajout de
  `moderator` dans l'état appartient à la tâche profils/modération.
- `setUnlockLevel` n'est pas encore exposé par l'API publique. Son branchement
  sera coordonné avec sa responsable sans l'exposer dans cette PR.
- Toute nouvelle permission devra être ajoutée explicitement et relue comme une
  évolution de la politique d'autorisation.

## Plan de tests

Commande ciblée : `node tests/unit/permissions.test.js`.

- `accorde les permissions cumulatives aux trois rôles` : vérifie toute la
  hiérarchie.
- `rejette les rôles inconnus` : vérifie les erreurs de contrat.
- `autorise un administrateur à modifier la configuration` : vérifie le garde.
- `refuse la modification de configuration aux autres rôles` : vérifie les
  refus de `player` et `moderator`.
- `refuse un joueur sans modifier la configuration` : vérifie le setter public.
- `autorise un administrateur et lit le rôle depuis l'état du Core` : vérifie la
  frontière de confiance et l'écriture autorisée.

Vérification finale : `npm run lint`, `npm test`, puis `npm run build`.
