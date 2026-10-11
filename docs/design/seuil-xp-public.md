# Seuil XP dans l’état public — #252

## Objectif

Permettre à G4 d’afficher le seuil total du prochain niveau depuis `coreService.getState().xpForNextLevel`, sans calcul métier dans l’UI.

## Périmètre

Exposition du calcul de #250 après intégration de la progression persistante #238. Les seuils temporaires, le stockage, les retours de `importSave`/`creerProfil` et les écrans ne changent pas. Le contrat prévoit le champ au §10 de `docs/contracts/core-api.md` ; G5 actualise ce contrat, jamais cet agent.

## Conception et décisions

- `core.js` enveloppe le getter interne de `state.js` et enrichit sa copie avec `calculateXPForNextLevel(getLevel())`.
- `getLevel()` réutilise la progression existante : maximum du niveau enregistré et du niveau calculé depuis l’XP. Le champ `level` enregistré n’est pas modifié par une lecture ; une ancienne sauvegarde peut contenir un niveau inférieur au niveau effectif. Utiliser `getLevel()` pour l’affichage du niveau effectif.
- La façade `coreService.js` reste un réexport. Aucun import de progression depuis `state.js` : pas de nouvelle dépendance circulaire.
- Le champ est dérivé à chaque lecture, sans écriture, et écrase seulement dans la copie publique une éventuelle ancienne valeur du même nom. Il n’est pas ajouté aux données persistées ou exportées. Une valeur déjà présente dans une ancienne sauvegarde reste un champ supplémentaire du stockage, sans devenir une source de vérité.
- Les contrôles de permissions de `core.js` continuent de lire l’état interne : ils n’ont pas besoin du calcul d’XP.
- Pour une ancienne sauvegarde dont le niveau dépasse les entiers sûrs (encore accepté par la restauration), borner uniquement l’entrée du helper à `Number.MAX_SAFE_INTEGER` : ce niveau dépasse déjà toute longueur possible de tableau JS, donc le résultat est `null`. Le niveau enregistré reste intact ; aucune politique d’import n’est modifiée.
- `null` signifie aucun niveau suivant, y compris pour un niveau acquis supérieur à la courbe temporaire. Un nombre est un seuil total, jamais une quantité restante.

## Risques

Les tests qui assimilaient le snapshot public à la sauvegarde brute doivent distinguer les deux. Les fixtures de sauvegarde doivent partir du getter interne ou d’un export, sans enregistrer accidentellement le nouveau champ public. Les anciennes sauvegardes restent acceptées ; la politique générale de restauration relève de #258.

## Plan de tests

`node --test tests/unit/next-level-api.test.js` :

- seuil total initial ; passage de niveau après `addXP` ; niveau acquis supérieur au calcul ; niveau maximal et au-delà → nombre attendu ou `null` ; échec avant exposition, succès après ;
- anciennes sauvegardes sans champ, recalcul après import et après rechargement dans un processus neuf → seuil calculé depuis le niveau effectif ;
- ancien niveau supérieur aux entiers sûrs → lecture conservée, seuil `null`, aucun changement du niveau enregistré ;
- valeur dérivée ancienne ignorée → valeur courante ;
- lecture sans écriture, état interne/export sans nouveau champ et snapshot indépendant → aucun effet de bord.

Adapter les assertions état public/stockage dans les tests G1 existants, puis lancer `npm run lint`, `npm test`, `npm run build`. Aucun écran ne change ; les appels publics exercés correspondent à ceux de la page Progression.

## Référence avant changement

Main `9268d25` : 851 tests, 850 réussis, 0 échec, 1 TODO ; lint sans erreur (2 avertissements existants), build réussi.
