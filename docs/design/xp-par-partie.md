# XP gagnée par partie — #247 / tâche 14

## Objectif et décisions
Fournir à Amina le gain XP à appliquer dans le règlement atomique de play().
Validation G5 : https://github.com/maximiliense/M1AgenticCoding/discussions/9#discussioncomment-18794625
Répartition : https://github.com/maximiliense/M1AgenticCoding/discussions/9#discussioncomment-18790792
Base configurable de 10 XP par défaut, identique pour win/loss/push et indépendante
des montants économiques. Pas d'arrondi forcé ; abandon/annulation donnent zéro.
Les seuils de niveaux restent temporaires et inchangés.

## Interface interne G1
`src/core/xp.js` : `calculateXPGained({ completed, baseXP, xpMultiplier }) -> number`.
`completed` est obligatoire : l'intégrateur fournit true uniquement pour une
partie terminée et validée, false pour une partie non terminée, abandonnée ou annulée.
C'est un paramètre interne du helper, pas un nouveau champ du contrat G2.
`baseXP` vaut par défaut `XP_GAIN_CONFIG.baseXP` de progression.config.js.
`xpMultiplier` vaut 1 par défaut pour un calcul sans bonus ; pour l'intégration,
Amina injecte la valeur du gestionnaire partagé d'Olti à chaque tentative.
Base finie non négative et multiplicateur fini strictement positif ; absence de
coercition, de mutation et d'arrondi. Les événements existants fournissent 1 sans
bonus et une valeur supérieure à 1 avec bonus. Résultat non fini refusé.
Tous les paramètres sont validés même lorsque completed vaut false.
Le helper retourne uniquement le gain, sans lire ni cumuler l'XP du joueur.

## Frontières et risques
Ne pas modifier progression.js (branchement Ahmed), state.js, économie, jeux,
core.js, coreService.js, contrats ou instances d'événements bonus.
Ne pas attribuer d'XP depuis le helper : Amina calcule toutes les conséquences
puis les applique dans une seule transaction. Pas de second addXP après règlement.
Ahmed garde l'état/API et la coordination anti-doublon (#218).
La tentative échouée ne publie aucune conséquence. Un roundId déjà réglé ne
réattribue rien. Le multiplicateur peut changer entre deux tentatives ; aucun
snapshot du bonus n'est persisté ici. Ne pas confondre bonus XP et multiplicateur
économique du résultat G2. Aucun RNG, horloge, stockage ou API UI nécessaire.
L'attribution réelle reste dépendante de play() et du gestionnaire partagé.

## Plan de tests et vérifications
Tests avant code : import de xp.js manquant (rouge), puis tests verts.
Runner natif node:test : base configurable/default, win/loss/push indépendants,
fractions conservées, variation du bonus entre appels, zéro non terminé,
paramètres invalides, zéro de configuration, dépassement numérique et pureté.
Commandes équivalentes aux scripts npm (npm indisponible localement) :
`node --test`, `node node_modules/eslint/bin/eslint.js . --ext .js,.jsx`,
`node node_modules/vite/bin/vite.js build`.
Pas de vérification UI : aucun écran ni API publique ne change.

## Résultats locaux
Base origin/main 4611caf : 553 tests, 550 réussis, 0 échec, 3 TODO existants.
Après implémentation : 569 tests, 566 réussis, 0 échec, mêmes 3 TODO.
Suite ciblée XP : 16 tests réussis après échec initial pour module absent.
Lint : 0 erreur, 2 avertissements préexistants (rng.js et dice/rules.js).
Build Vite réussi : 1133 modules transformés.
Relecture indépendante : aucun point critique ou requis.
CI GitHub non exécutée : aucun push ni PR pour ce lot à ce stade.
