# Bonus quotidien

## Objectif

Permettre a un joueur sans jeton de relancer une partie en reclamant un bonus configurable, au maximum une fois toutes les 24 heures.

## Non-objectifs

- Aucun pret, interet ou argent reel.
- Aucune modification du schema strict de `state.js` ni du format des sauvegardes.
- Aucune interface utilisateur.
- Aucun changement des contrats dans `docs/contracts/`.

## Conception

`src/core/config/economy.config.js` porte les valeurs par defaut du bonus : montant de 100 jetons et delai de 86 400 000 ms. La logique ne contient donc aucune valeur de reglage en dur.

`createDailyBonus({ store, config, now })` dans `economy.js` contient la regle metier. Le stockage injecte fournit une lecture et une mise a jour synchrones et atomiques de `{ balance, bestBalance, lastClaimAt }`. L'horloge `now` est injectee et lue une seule fois par reclamation.

L'adaptateur interne du Core relie le solde et le meilleur solde a `getState()` / `updateState()`. Il conserve provisoirement `lastClaimAt` hors du schema partage, comme autorise par le cadrage G5, jusqu'au branchement global de l'etat. `claimDailyBonus()` garde sa signature publique sans argument et delegue a ce service.

Une reclamation reussie renvoie `{ claimed: true, amount, newBalance, nextClaimAt }`. Une reclamation refusee renvoie `{ claimed: false, reason, remainingMs }` et n'appelle pas l'ecriture. Les raisons sont `balance_not_zero` et `cooldown`.

## Decisions

- Le bonus est reserve au solde nul, conformement a l'objectif de relance a zero jeton.
- Le refus est un retour structure plutot qu'une exception, forme explicitement acceptee par le cadrage G5.
- Le solde, le meilleur solde et l'horodatage passent par une seule operation du stockage injecte.
- `requestLoan()` reste present pour compatibilite et est marque comme obsolete ; sa suppression ou son changement de contrat reste hors de cette tache.

## Risques

- L'horodatage de l'adaptateur par defaut n'est pas encore persiste apres rechargement. Sa persistance appartient au branchement global et necessitera une migration explicite du schema de sauvegarde.
- Une horloge qui recule maintient le refus jusqu'a la date normale de prochaine reclamation.
- Un depassement de la plage numerique supportee doit etre refuse avant toute ecriture.

## Plan de tests

Commande cible : `node --test tests/unit/economy.dailyBonus.test.js`.

- `accorde le bonus par defaut a un solde nul` : absent avant implementation, puis succes avec 100 jetons et horodatage.
- `refuse un joueur dont le solde est positif sans ecriture` : absent avant implementation, puis retour `balance_not_zero`.
- `refuse avant 24 heures et laisse le stockage intact` : absent avant implementation, puis retour `cooldown` et delai restant.
- `accorde de nouveau le bonus apres exactement 24 heures` : absent avant implementation, puis second credit.
- `utilise un montant et un delai configures` : absent avant implementation, puis valeurs injectees appliquees.
- `met a jour le meilleur solde dans la meme operation` : absent avant implementation, puis maximum conserve.
- `refuse les dependances, configurations, horodatages et etats invalides` : absent avant implementation, puis erreur sans ecriture.
- `propage un echec de stockage sans publier de nouvel etat` : absent avant implementation, puis erreur et etat inchange.

Verification finale : `npm run lint`, `npm test`, puis `npm run build`.
