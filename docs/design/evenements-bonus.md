# Conception — Événements bonus (G1, tâche n°35, #223)

## Objectif

Permettre à l'admin de **lancer un événement bonus** : pendant une période donnée, les gains ou l'XP sont multipliés. Le Core indique à tout instant le multiplicateur en cours pour chaque cible.

## Non-objectifs

- **Aucun événement inventé** : le contenu des événements est une décision ouverte d'`AGENTS.md`. @Nina253 (G5, 05/10) a laissé le choix au G1 en demandant un mécanisme simple ; c'est l'admin qui crée les événements.
- **Pas d'application du multiplicateur** : aux gains dans `play()` (n°10, @Amina1203), à l'XP dans la progression (n°13, @nafiamedreda).
- Pas de vérification du rôle admin (n°24, PR #211), pas d'enregistrement dans `casino_state` (n°8), pas d'exposition dans `coreService` (@ahmed-abc73), pas d'écran (G4).

## Conception

### Fichier

`src/core/config/events.config.js`, même modèle que les niveaux de déblocage réglables (n°21, `unlock.config.js`) et le capital réglable (n°39, `player.config.js`) : stockage injecté `{ read, write }`.

### Événement

```js
{
  id: 'double-gains-week-end', // chaîne non vide, unique
  cible: 'gains',              // 'gains' ou 'xp'
  multiplicateur: 2,           // nombre fini strictement supérieur à 1
  debut: 1760000000000,        // date de début (ms, entier sûr ≥ 0), incluse
  fin: 1760172800000,          // date de fin (ms, entier sûr), exclue, > debut
}
```

### Fonctions

| Fonction | Rôle |
|---|---|
| `createEvenementsMemoryStore(initial)` | Stockage en mémoire, en attendant le branchement (n°8) |
| `validerEvenement(evenement)` | Vérifie la forme d'un événement |
| `createEvenementsBonus(store, { now })` | Gestion des événements sur un stockage injecté, avec horloge injectable |
| `getEvenements()` | Copie de tous les événements (passés, en cours, à venir) |
| `lancerEvenement(evenement)` | Ajoute un événement ; refuse un identifiant déjà utilisé ou un chevauchement sur la même cible |
| `arreterEvenement(id)` | Retire un événement (annulation ou arrêt anticipé) |
| `getMultiplicateurActif(cible)` | Multiplicateur de l'événement en cours pour la cible, sinon 1 |

## Décisions

| Décision | Pourquoi |
|---|---|
| Cibles `gains` et `xp`, choisies par l'admin | Les deux usages naturels d'un bonus ; le mécanisme reste le même. |
| Multiplicateur **> 1** | C'est un bonus : 1 ne change rien, et une valeur < 1 serait un malus. |
| **Un seul événement à la fois par cible** (chevauchement refusé) | Jamais d'arbitrage entre deux multiplicateurs (cumul ou maximum) : règle simple, sans valeur cachée. |
| Période `[debut, fin)` | Pas de double comptage à la jointure de deux événements qui se suivent. |
| Aucun événement par défaut | Contenu = décision de l'admin (règle 4 : rien en dur). |
| Horloge injectable (`now`) | Tests déterministes, comme le bonus quotidien (n°12). |
| Contenu du stockage validé à chaque lecture | Un stockage corrompu est signalé plutôt que d'appliquer un faux multiplicateur. |
| Toute erreur → aucune écriture | L'admin ne peut pas laisser une configuration cassée. |
| Erreurs `Error` avec message en français | Cohérent avec le reste du Core. |

## Points ouverts

- **Multiplicateur maximum** : non défini dans le projet ; aucun plafond imposé.
- **Sens exact du multiplicateur de gains** (sur le gain net ou sur le montant reversé) : à fixer par @Amina1203 au moment de l'appliquer dans `play()`.

## Risques

- Sans application dans `play()` et la progression, un événement n'a aucun effet en jeu.
- Sans branchement (n°8), les événements sont perdus au rechargement de la page.

## Plan de tests

Commande : `npm test` (fichier `tests/unit/events.config.test.js`).

| `describe` / `it` | Avant implémentation | Après |
|---|---|---|
| `createEvenementsMemoryStore` — vide par défaut, lit une copie, remplace à l'écriture | échec | succès |
| `validerEvenement` — accepte un événement valide | échec | succès |
| `validerEvenement` — rejette id, cible, multiplicateur ou dates invalides | échec | succès |
| `createEvenementsBonus` — rejette un stockage, une horloge ou un contenu invalide | échec | succès |
| `lancerEvenement` — ajoute l'événement et le renvoie | échec | succès |
| `lancerEvenement` — refuse un id déjà utilisé, un chevauchement sur la même cible, sans écriture | échec | succès |
| `lancerEvenement` — accepte deux événements de cibles différentes en même temps, ou qui se suivent | échec | succès |
| `getEvenements` — renvoie une copie indépendante | échec | succès |
| `getMultiplicateurActif` — 1 sans événement en cours, sinon le multiplicateur, début inclus et fin exclue | échec | succès |
| `getMultiplicateurActif` — rejette une cible inconnue | échec | succès |
| `arreterEvenement` — retire l'événement ; erreur pour un id inconnu, sans écriture | échec | succès |
