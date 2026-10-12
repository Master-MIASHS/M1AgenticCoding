# Capital initial effectif — #253

## Objectif

Créer un véritable nouveau joueur avec `balance = bestBalance = capital effectif`, y compris sous 1000, sans réinitialiser les joueurs existants. Accords G5 Nina et Arthur dans #253 ; configuration partagée de #262.

## Conception

- `state.js` construit l’état initial avec `getCapitalDeDepartActuel()` ; aucune duplication du défaut numérique de la configuration.
- Un indicateur privé de première création est accordé uniquement quand `casino_state` est absent au démarrage (mode sans stockage : session en mémoire neuve). Une sauvegarde présente, même identique au défaut ou sans pseudo, et un stockage illisible/inaccessible ne donnent pas ce droit.
- Toute persistance réussie (`updateState`, `restoreState` ou création) consomme ce droit. Un échec ne le consomme pas. Pas de marqueur ajouté aux sauvegardes.
- `initializePlayerState` est interne à G1, non exposé par la façade. Sous verrou d’écriture, il exige une première création, valide un joueur initial, puis enregistre une seule fois avant publication en mémoire. Il ne passe pas par `restoreState` et ne change pas la monotonie de `updateState`.
- `creerProfil` utilise cette opération pour le stockage réel, avec le capital relu lors de l’appel. Les adaptateurs internes injectés conservent leurs gardes existantes ; aucune dépendance configurable n’est transmise depuis l’UI. La construction pure `creerJoueur` garde sa configuration injectable et son défaut explicite.
- Une modification du capital avant création change les deux soldes du nouveau profil ; après toute écriture de partie, elle ne les modifie jamais. L’état affiché avant création reste un état provisoire, pas un record de joueur.

## Périmètre et limites

Aucune modification des permissions, du stockage de configuration, de `storage.js`, des contrats ni des écrans. API `creerProfil(infos)` inchangée. Les anciennes sauvegardes sans pseudo ne sont pas transformées en nouveaux profils ; le bouton G4 « Continuer sans profil » permet de conserver l’accès à la partie. Multi-profils et synchronisation entre onglets restent hors périmètre ; l’atomicité est limitée à l’instance synchrone du Core.

## Plan de tests

Runner `node:test` ; chaque scénario de démarrage utilise un processus neuf et un stockage indexé par clé.

1. État initial avec capital 500 et 2500, sans écriture ; sauvegarde existante conservée avec config différente.
2. Initialisation interne : une écriture, copie indépendante, refus de seconde création ou après update/restore, refus imbriqué, validation et échec de stockage sans mutation, nouvelle tentative possible.
3. Façade : capital effectif à la création, changement entre démarrage/création, configuration après création sans effet rétroactif, rechargement/import, sauvegarde ancienne identique au défaut, stockage illisible/inaccessible, options UI ignorées.
4. Réexécuter #281, tests de profil, démarrage, progression, permissions ; suite complète, lint et build après chaque unité.

## Risques suivis

Les tests qui utilisent `restoreState` pour simuler une première session doivent être isolés : restaurer un joueur ne recrée pas une première session. La configuration conserve son propre cache de module, d’où les processus neufs plutôt qu’un query-string sur `state.js` seul. Le contrat public doit être mis à jour par G5 après livraison.
