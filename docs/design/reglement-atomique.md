# Règlement atomique d'une partie (#131)

## Objectif

`play(gameId, bet, gameResult, options)` applique le règlement économique,
le meilleur solde, l'XP, le niveau et l'historique dans une seule transaction.
`options.roundId`, produit par G2, empêche le double règlement.

## Règles validées

- La signature reste compatible avec les anciens appels sans options.
- Sans `roundId`, le règlement est exécuté et un avertissement est émis.
- Avec un `roundId` déjà présent dans `settledRoundIds`, `play()` renvoie
  `{ success: false, reason: 'already_settled' }` sans conséquence métier.
- L'identifiant n'est ajouté qu'avec les autres conséquences du règlement.
  Un échec de calcul ou de persistance laisse donc la nouvelle tentative possible.
- Un ancien appel utilise `roundId: null`, conserve une entrée d'historique et
  ne prétend pas fournir de garantie d'idempotence.
- Le gain d'XP vient du calcul pur configuré et du multiplicateur actif lu lors
  de la tentative ; aucun appel séparé à `addXP()` n'est effectué.
- Le bonus `gains` multiplie uniquement le gain net brut strictement positif.
  La mise restituée n'est pas multipliée, les pertes et égalités restent
  inchangées, et le montant reversé est arrondi au centime après le bonus.
- L'historique reçoit les montants déjà calculés et ajoute une entrée en fin de
  tableau, sans troncature dans ce premier lot.
- Le meilleur solde ne diminue pas.

## Dépendances d'intégration

Le calcul XP vient de #248, la préparation d'historique de #266 et le
multiplicateur partagé de #262. Ces PR doivent être fusionnées avant la PR #131
afin que celle-ci ne republie pas leurs fichiers. L'historique visible ne sert
jamais de registre anti-doublon.
