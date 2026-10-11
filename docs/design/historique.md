# Préparation pure de l'historique — #229

## Objectif
Préparer une entrée indépendante pour l'historique d'une partie identifiée ou d'un ancien appel,
à intégrer par Amina dans le règlement atomique (#131/#218).

## Périmètre et conception
`src/core/history.js` expose uniquement `createHistoryEntry` en interne G1.
Entrée et sortie : `{ roundId, gameId, bet, outcome, payout, netGain, playedAt }`.
`gameId` est une chaîne non vide ; `roundId` est une chaîne non vide ou explicitement
`null` pour un ancien appel, sans format UUID imposé. La mise
est finie et strictement positive, le montant reversé fini et non négatif,
le gain net fini et signé. `outcome` vaut `win`, `loss` ou `push`.
`playedAt` est fourni en ISO UTC canonique (`Date.toISOString()`), sans lecture
d'horloge dans le calcul. Les montants sont conservés sans arrondi ni recalcul.
L'issue #131 décrit ce format ; #229 confirme sa compatibilité économique.

### Cohérence des montants (review G5 de #266)
Le helper refuse par `RangeError` un écart supérieur à un centime entre `netGain`
et `payout - bet`, y compris un dépassement numérique du calcul de l'écart.
La tolérance de `0.01` demandée par Noah couvre l'arrondi économique au centime ;
elle ne modifie ni ne recalcule les valeurs retournées. `outcome` reste fourni par
le jeu et n'est pas déduit du signe de `netGain`.
Amina doit transmettre les montants du règlement final, après tout bonus gains,
en conservant cette relation avant l'écriture atomique. Aucun changement de
`play()` ou de l'économie n'est inclus dans cette correction.

## Décisions et risques
Retourner seulement les champs convenus dans un objet neuf composé de primitives,
donc indépendant et sérialisable en JSON. Ne pas déduire outcome de netGain :
l'arrondi économique peut produire zéro même pour une victoire ou une perte.
Ne pas importer état, économie, RNG, configuration de jeux ou façade.
Ne pas ajouter d'entrée, choisir une rétention, inscrire un règlement ou écrire
dans le stockage. Amina garde l'ajout en fin de tableau proposé sans troncature.
La fonction ne valide pas l'unicité d'un roundId : cela appartient au règlement.

### Convention de transition validée
Nina/G5 a validé dans #229 la proposition d'Amina : une entrée des anciens appels
porte explicitement `roundId: null`, sans inscription dans `settledRoundIds` ni
garantie d'idempotence. Les nouveaux appels exigent une chaîne non vide. Amina
normalise les anciens appels dans `play()` ; le helper refuse toujours un champ
omis ou `undefined`, ne génère aucun identifiant et ne transforme rien en null.
L'anti-double règlement reste dans le périmètre état/API/règlement, pas dans ce helper.
G4 affiche actuellement gameId et un ancien champ result optionnel : l'affichage
d'outcome/payout reste à coordonner, sans modification de l'UI dans ce lot.

## Plan de tests
Runner `node:test`, `describe`/`it`, commande `node --test tests/unit/history.test.js`.
Avant implémentation : import manquant (rouge). Après : tous les cas verts.
- Victoire, perte, égalité et fractions : valeurs conservées exactement.
- Résultat indépendant, entrée gelée, champs supplémentaires non propagés.
- RoundId opaque ou null explicite sérialisable ; refus des identifiants absents ou vides.
- Mise invalide, payout négatif/non fini, netGain non fini, outcome invalide.
- Cohérence des montants, borne inclusive d'un centime, dépassement et refus sans mutation.
- ISO UTC canonique valide ; refus des dates impossibles/non UTC/non chaînes.
- Sérialisation JSON fidèle ; appel pur sans accès au stockage ni à l'horloge.

## Vérifications
Les scripts npm ne sont pas accessibles dans l'environnement local ; commandes
équivalentes avec Node : `node --test`, `node node_modules/eslint/bin/eslint.js . --ext .js,.jsx`,
`node node_modules/vite/bin/vite.js build`. Pas de parcours navigateur : aucune
UI ni API publique modifiée. Résultats exécutés consignés dans le compte rendu.

### Résultats locaux (8 octobre 2026, base main 7bd792f)
- Cycle rouge initial : import du module absent. Transition : test null échoue avant adaptation.
- Cycle vert final : 19 tests ciblés réussis, dont null explicite et refus de champ omis.
- Suite complète : 594 tests, 591 réussis, 0 échec, 3 TODO existants.
- ESLint : 0 erreur, 2 avertissements préexistants dans rng.js et dice/rules.js.
- Build Vite : réussi, 1135 modules transformés.
- Relecture indépendante : aucun point bloquant ; test de précision complété.
- Aucun branchement dans play(), state.js ou l'API publique dans ce lot.

### Correction de review (9 octobre 2026)
- Trois tests de régression échouent avant le contrôle des montants, puis passent.
- Historique : 22 tests réussis. Suite complète : 597 tests, 594 réussis,
  0 échec et 3 TODO préexistants (#159).
- ESLint : 0 erreur, 2 avertissements préexistants ; build Vite réussi (1135 modules).
- Seuls le helper, ses tests et ce document changent ; aucun changement économique.
