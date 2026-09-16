---
name: architecte-integration
description: Vérifie qu'une tâche respecte les contrats d'intégration entre groupes (API publique du Core, frontières G1-G5) avant ouverture de PR. À utiliser quand une tâche touche une frontière entre groupes ou consomme l'API publique de G1.
---

# Architecte d'intégration

## Quand l'utiliser

- Une tâche G2, G3 ou G4 consomme (ou va bientôt consommer) l'**API publique du Core (G1)**.
- Une tâche remplace un **mock** par l'API réelle.
- Une tâche touche un fichier proche d'une frontière entre groupes (ex. G2/G3 sur le rendu d'un résultat de jeu, G3/G4 sur un écran en jeu vs hors jeu).
- Avant d'ouvrir une PR qui modifie ou consomme un contrat dans `docs/contracts/`.

Ne pas l'utiliser pour une tâche purement interne à un groupe, sans surface d'échange avec un autre groupe.

## Ce que fait cette skill

1. **Localiser le(s) contrat(s) concerné(s)** dans `docs/contracts/` pour la fonctionnalité touchée. S'il n'existe aucun contrat pour une interaction inter-groupes utilisée par la tâche, s'arrêter et ouvrir une issue à G5 — ne pas en inventer un.
2. **Vérifier le sens du flux** selon les frontières définies dans `AGENTS.md` :
   - G2/G3/G4 → Core : uniquement via l'API publique de G1, jamais via des fichiers internes du Core.
   - G2 décide *ce qui se passe* dans un jeu ; G3 décide *comment ça s'affiche*. Un composant G3 ne doit jamais calculer un résultat de jeu.
   - G3 = écrans en jeu ; G4 = tout ce qui est hors jeu (le lobby est entièrement G4).
3. **Vérifier les invariants métier** pertinents à la tâche (solde/XP indépendants, XP et niveau ne redescendent jamais, meilleur solde ne redescend jamais, pas de blocage à 0 jeton).
4. **Vérifier les règles absolues applicables** : pas de `Math.random()` hors RNG du Core, aucune valeur de réglage en dur (doit venir de la config), permissions vérifiées côté serveur/Core (pas seulement une UI masquée).
5. **Si mock encore utilisé** : confirmer que le mock respecte la même forme (shape) que le contrat réel, pour éviter une régression silencieuse au moment du switch vers l'API réelle.
6. **Détecter un breaking change** : si la tâche touche l'API publique du Core, vérifier si le changement est rétrocompatible (ajout de champ optionnel, nouvelle fonction) ou cassant (renommage, suppression, changement de type/signature). Un breaking change doit être signalé explicitement — jamais glissé silencieusement dans une PR de fonctionnalité.
7. **Vérifier le sens de dépendance** : aucun fichier de G1 (Core) ne doit importer ou référencer du code de G2/G3/G4 — la dépendance va toujours des groupes consommateurs vers le Core, jamais l'inverse.
8. **Repérer les accès directs interdits** : recherche ciblée d'imports qui contournent l'API publique (ex. un composant G3 qui importe un fichier interne du dossier Core au lieu de passer par l'API exposée).
9. **Rapporter** dans le compte rendu de la tâche :
   - Contrat(s) vérifié(s) et conformité (oui/non + détail des écarts).
   - Frontières de groupe respectées ou non.
   - Breaking change détecté ou non, avec impact estimé sur les groupes consommateurs.
   - Points bloquants à remonter à G5 (contrat manquant, contrat à faire évoluer, tâche qui déborde du périmètre du groupe).

## Checklist rapide bascule mock → API réelle

Pour toute tâche qui remplace un mock par l'appel réel au Core :

- [ ] La forme des données retournées par le mock correspond exactement au contrat (mêmes champs, mêmes types).
- [ ] Les cas d'erreur (Core indisponible, réponse invalide) sont gérés, pas seulement le cas nominal du mock.
- [ ] Aucun import du mock ne subsiste après la bascule.
- [ ] Les tests écrits contre le mock sont soit adaptés, soit remplacés par des tests contre l'API réelle (ou un double de test explicite).

## Exemples de violations à détecter

- Un composant G3 calcule lui-même le résultat d'un tirage au lieu de l'afficher tel que renvoyé par G2/Core → viole « l'UI ne décide jamais d'un résultat ».
- Un fichier G4 importe directement `src/core/rng/generator.js` au lieu de passer par l'API publique exposée → accès interne interdit.
- Un contrat définit `getBalance(): number` mais l'implémentation Core renvoie désormais `{ balance, bestBalance }` sans mise à jour du contrat → dérive contrat/implémentation.

## Ce que cette skill ne fait PAS

- Ne modifie jamais un fichier dans `docs/contracts/` — un contrat à changer est une issue pour G5 et G1, jamais une édition directe.
- Ne code pas la tâche d'un autre groupe pour combler un manque : on ouvre une issue avec le label `groupe: GX` et on continue sur mock, ou on s'arrête si impossible.
- Ne merge rien : elle prépare le terrain pour une PR relue par un humain, comme toute tâche du projet.

## En cas de doute

Conformément à la règle absolue n°10 d'`AGENTS.md` : s'arrêter et demander à G5 plutôt que d'inventer une règle ou une frontière.
