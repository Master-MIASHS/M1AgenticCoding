# Écriture atomique de l’état — G1, Ahmed, #61

## Objectif

Permettre aux modules du Core d’appliquer ensemble les changements d’une opération,
sans exposer un état partiellement modifié si le calcul, la validation ou le stockage échoue.

## Périmètre

Cette étape ajoute l’écriture interne dans `state.js` sur la base d’Ania (#130).
Elle ne branche pas encore `play()` ni la progression, ne calcule aucun gain,
ne définit aucun identifiant de partie et ne change pas les règles de restauration.
Les profils multiples, le nouveau joueur (#133), le démarrage sur stockage corrompu
et l’adaptateur de progression sont des étapes distinctes.

## Conception

`updateState(updater)` est synchrone. Le callback reçoit une copie profonde de
l’état courant et doit retourner le nouvel état complet. Il ne doit pas avoir
d’effets externes. Les modules calculent les conséquences métier ; l’état les
applique ensemble. Aucun setter n’est exporté via `core.js` ou `coreService.js`.

1. Refuser les écritures imbriquées, y compris une restauration dans le callback.
2. Appeler le callback sur une copie, sans lui donner accès à l’état vivant.
3. Copier et valider son résultat selon le schéma actuel.
   Refuser également les données qui ne peuvent pas être conservées en JSON
   (cycles, valeurs non finies, `undefined`, dates ou collections spécialisées).
4. Refuser une baisse d’XP, de niveau ou de meilleur solde. Le niveau doit être
   un entier sûr ; le meilleur solde doit couvrir le solde courant.
5. Sérialiser puis écrire dans `casino_state`, avant de remplacer la mémoire.
6. Retourner une copie indépendante de l’état enregistré.

Les lectures dans le callback voient encore l’ancien état. Un callback qui lève,
un résultat invalide ou non sérialisable, ou un échec de `localStorage.setItem`
ne doit pas modifier la mémoire. Le stockage du navigateur garantit l’absence
d’écriture lors d’un échec de `setItem`. Sans localStorage (tests Node), l’écriture
reste possible en mémoire, comme la restauration existante.

## Décisions et risques

- Conserver le schéma plat déjà intégré, compatible avec les consommateurs.
- Réutiliser le chemin de persistance de la restauration sans appliquer à cette
  dernière les règles de monotonie : les décisions sur les anciennes sauvegardes
  restent séparées.
- Les XP décimales restent acceptées, conformément à `progression.integration.md`.
  Le calcul du niveau appartient à la progression, pas au stockage.
- L’atomicité est celle d’une opération synchrone dans une instance du Core,
  pas un verrou multi-onglets. Les effets externes d’un callback ne sont pas annulables.
- Le mécanisme anti-double règlement et le calcul d’historique restent aux modules
  concernés ; ils devront proposer leurs modifications dans une seule opération.
- Le démarrage sur données corrompues reste un problème existant, non corrigé ici.

## Plan de tests

`node --test tests/unit/state-update.test.js` : nouveaux tests en échec avant
implémentation, au vert après. Vérifier l’écriture groupée visible et persistée,
le rechargement, l’isolation profonde des entrées/sorties, les callbacks en erreur,
les données invalides/non sérialisables, les régressions des compteurs permanents,
l’échec du stockage, les écritures imbriquées, le mode mémoire et l’absence d’export UI.

Interaction cible : après une opération du Core, `getState()` et `exportSave()`
reflètent ensemble les champs modifiés. Aucun écran n’appelle encore cette fonction.

Base `a99e274` vérifiée avant modification : 181 tests réussis, build réussi,
lint sans erreur (un avertissement existant dans `rng.js`).
