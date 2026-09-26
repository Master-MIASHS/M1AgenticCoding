---
name: game-ui
description: Règles à suivre pour développer l'interface des jeux du casino dans /src/game-ui/. À utiliser pour toute tâche d'affichage, d'animation ou d'interaction liée à un jeu (slots, dés, blackjack, roulette, poker, etc.).
---

# Skill game-ui (Groupe 3)

## Périmètre

Notre périmètre exclusif est `/src/game-ui/`. On ne développe que l'interface — jamais la logique de jeu.

Rôle de G3 :
- Affichage des jeux
- Interactions avec le joueur
- Animations et effets visuels
- Différents états visuels d'une partie
- Affichage des résultats
- Composants visuels communs aux différents jeux
- Utilisation des renderPayload fournis par le Groupe 2

## Ce que l'agent ne doit JAMAIS faire

- Modifier /src/core/
- Modifier la logique des jeux dans /src/games/
- Calculer lui-même des probabilités ou des gains
- Déterminer un résultat de jeu
- Modifier directement le solde ou l'XP du joueur
- Utiliser Math.random() pour déterminer le résultat d'un jeu
- Déplacer de la logique métier du Groupe 2 vers l'interface
- Inventer ou recalculer une donnée manquante dans un renderPayload — si une info nécessaire à l'affichage manque, signaler qu'il faut compléter le contrat avec G2, ne jamais la deviner

## Contrat avec le Groupe 2 (résumé)

- G2 garde l'état complet de la partie en mémoire (cartes distribuées, mises en cours, etc.). G3 ne stocke et ne renvoie qu'un sessionId léger.
- Les actions joueur (playerAction) sont une liste fixe et validée par G2 pour chaque jeu (ex. blackjack : "hit" | "stand" | "double"), jamais une string libre.
- Chaque renderPayload inclut un champ availableActions : la liste des actions possibles à l'instant T. G3 ne décide jamais lui-même quels boutons activer.
- Si une nouvelle carte ou un tirage aléatoire est nécessaire (needsDraw), c'est G2 qui appelle le Core — jamais G3.
- G2 renvoie un renderPayload à chaque étape de la partie (pas seulement à la fin), pour permettre l'affichage en temps réel.
- Les cartes suivent toujours la structure { rank, suit }. G3 gère seule la traduction visuelle (icônes, couleurs) — G2 n'envoie jamais de texte de display.

## États métier vs états visuels

- État métier (cartes, mises, résultats, probabilités) : appartient à G1/G2, jamais dupliqué ni recalculé côté UI.
- État visuel (animation en cours, élément survolé, transition) : appartient uniquement à G3.

## États UI à gérer

Chaque interface de jeu doit prévoir : loading, playing, terminal, error.

## Convention de mocks

Tant que G2 n'a pas livré un jeu, créer un mock respectant exactement le format du renderPayload défini dans le contrat. Remplacer le mock par les vraies données dès que G2 livre, sans changer la structure des composants.

## Charte graphique commune (G3/G4)

Utiliser les variables CSS communes définies avec G4 plutôt que des valeurs en dur :
--color-background, --color-surface, --color-primary, --color-secondary, --color-success, --color-danger, --color-text, --color-text-muted, --radius-small/medium/large, --spacing-small/medium/large.

Composants génériques à mutualiser avec G4 si pertinent : boutons, cartes/panneaux, modales.

## Étapes à suivre avant de développer une tâche

1. Identifier le jeu concerné.
2. Lire le contrat défini avec le Groupe 2.
3. Vérifier le format du renderPayload.
4. Vérifier si un composant commun existe déjà.
5. Utiliser un mock si le jeu du Groupe 2 n'est pas encore disponible.
6. Développer uniquement la partie interface.
7. Tester les différents états possibles (loading, playing, terminal, error).
8. Vérifier qu'aucune logique métier n'a été ajoutée dans l'UI.
9. Vérifier qu'aucun fichier appartenant à un autre groupe n'a été modifié inutilement.
10. Faire les tests avant d'ouvrir la PR.

## Definition of Done

Une interface de jeu est terminée si :
- elle respecte le contrat du Groupe 2
- elle fonctionne avec les différents payloads prévus
- les actions utilisateur fonctionnent
- les différents états du jeu sont affichés correctement
- les composants communs sont réutilisés quand c'est possible
- aucune logique métier du Groupe 2 ou du Core n'est présente dans l'interface
- l'interface respecte la charte graphique commune
- l'affichage est responsive
- les tests prévus passent
- la PR ne modifie pas inutilement les fichiers des autres groupes
