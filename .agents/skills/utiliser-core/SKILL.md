---
name: utiliser-core
description: Utiliser la lecture d’état, la progression XP/niveaux, la configuration des jeux, le RNG et la sauvegarde (export/import) du Core de Casino Fantôme depuis G2/G3/G4 via coreService, ou préparer le branchement interne G1 de l’état atomique et de la progression. Vérifier la disponibilité des exports avant intégration.
---

# Utiliser le Core

## Vérifier la version avant de coder

Lire `AGENTS.md`, `src/services/coreService.js` et le contrat concerné dans
`docs/contracts/`. Une PR ouverte ne rend pas sa fonction disponible sur main.
Ne pas copier un module interne pour contourner un export manquant.

Repères à la rédaction (à revérifier, pas des garanties permanentes) :
- `getState()` est public.
- `exportSave()` / `importSave()` sont publics (#130, contrôle d’intégrité FNV-1a retenu dans #132).
- `getShopCatalog()`, `getShopInventory()` et `purchaseShopItem()` sont publics (#205).
- Réglages admin publics (#260) : `getStartingCapital()`, `getEvenementsBonus()`,
  `getMultiplicateurBonus()` ; réservés à l’admin : `setStartingCapital()`,
  `lancerEvenementBonus()`, `arreterEvenementBonus()`.
- `roll()` est public ; `tirageEntier()`, `tirageAvecPoids()` et `melanger()` (#28) le sont depuis #115.
- `creerProfil()` est public (#226, construit avec `creerJoueur`, #134).
- `choisirAction()` (IA du poker) est public (#196).
- L’écriture interne `updateState` est intégrée par #139.
- L’adaptateur `createProgressionStore` est intégré par #144 (ticket #143).
- Le branchement par défaut de la progression utilise cet adaptateur (#237) ; vérifier que la PR correspondante est intégrée dans la branche utilisée.

## G2/G3/G4 : accéder par la façade

Importer depuis `src/services/coreService.js` avec le chemin relatif adapté au
fichier appelant. Ne jamais importer `src/core/state.js`, `rng.js` ou `core.js`
depuis les consommateurs. G2 calcule les règles des jeux ; G3/G4 affichent les
résultats, sans calculer eux-mêmes le gagnant.

### Lire l’état : getState()

Utiliser pour afficher le solde, la progression ou les jeux débloqués.

```js
import { getState } from '<chemin-relatif>/services/coreService.js';
const snapshot = getState();
const { balance, bestBalance, xp, level, unlockedGames, history, role } = snapshot;
```

Le résultat est une copie indépendante, pas une référence réactive. Le modifier
ne met pas à jour le joueur. Relire après une opération réussie du Core.
`pseudo` et `birthDate` n’existent qu’après `creerProfil()` (absents avant : prévoir
un affichage par défaut).

`xpForNextLevel` fournit le **seuil total d’XP du niveau suivant**, pas l’XP
restante. Utiliser pour les barres et écrans de progression G3/G4 :

```js
import { getState, getLevel } from '<chemin-relatif>/services/coreService.js';
const { xp, xpForNextLevel } = getState();
const niveauEffectif = getLevel();
// xpForNextLevel === null : aucun niveau suivant configuré.
// Sinon, transmettre xp et xpForNextLevel au composant XPBar.
```

Le seuil est recalculé à chaque lecture depuis le niveau effectif (sans perdre
un niveau acquis). Les seuils viennent de la configuration **temporaire** du Core :
l’UI ne définit aucun barème. Le champ `level` reste la valeur enregistrée ; sur
une ancienne sauvegarde, il peut être inférieur au niveau effectif de `getLevel()`.

La lecture n’écrit rien. Le champ dérivé n’est pas ajouté à `casino_state` ni à
`exportSave()` ; une ancienne valeur importée est ignorée dans le snapshot public.
Après `addXP()`, `importSave()` ou `creerProfil()`, relire `getState()` : les retours
de ces mutations ne sont pas des snapshots enrichis. Utiliser `exportSave()` pour
sauvegarder, sans sérialiser le snapshot public à sa place.

La lecture peut échouer si l’initialisation du stockage échoue dans la version
utilisée : vérifier le comportement courant et le traitement d’erreur prévu.

### Lire la configuration et le catalogue : getGameConfig() / GAMES

Utiliser pour lire les réglages actuels d’un jeu (écran Admin G4, #254) ou
énumérer le catalogue Core. Disponibles après intégration de #158 : vérifier
les exports dans la branche utilisée avant de remplacer un mock.

```js
import { GAMES, getGameConfig } from '<chemin-relatif>/services/coreService.js';
const catalogue = Object.values(GAMES);
try {
  const { probabilities, multipliers } = getGameConfig('roulette');
  // Présenter les valeurs actuelles ; les sections peuvent être vides.
} catch (erreur) {
  // Identifiant inconnu/invalide : afficher une erreur, ne pas inventer de réglage.
}
```

- `getGameConfig(gameId)` est une lecture publique synchrone. Elle retourne une
  copie indépendante `{ probabilities, multipliers }`, y compris les deux tables.
  Modifier cette copie ne modifie pas les réglages ; relire après une mise à jour.
- Un jeu connu non configuré renvoie deux tables vides. Chaque table contient
  actuellement des nombres finis positifs ou nuls ; `paytable`, `segments` et
  les objets imbriqués supplémentaires ne font pas partie de ce lot (#256).
- Un identifiant inconnu ou invalide lève une erreur explicite (y compris les
  propriétés héritées comme `toString`). Les lectures ne modifient pas la partie.
- `GAMES` est un objet indexé par identifiant, **gelé ainsi que chaque entrée**
  `{ id, name, unlockLevel }`. `unlockLevel` est le niveau **par défaut** : ne pas
  l’utiliser comme seuil administrable effectif ni comme autorisation de jouer.
  Il contient les 13 jeux d’AGENTS.md, dont `memory` (8), `quiz` (9) et `bingo` (10) (#318).
  Ne pas ajouter localement un jeu absent : demander au G1.
- Seul `setGameConfig(gameId, config)` permet une écriture, après contrôle du rôle
  admin dans le Core. Une section fournie remplace cette section ; une section
  omise reste inchangée. Une erreur de validation laisse la configuration intacte.
  La configuration est enregistrée hors de la partie du joueur (`casino_config_jeux`,
  #350) : elle survit au rechargement et n’est pas dans `exportSave()`.
- Ces réglages de jeux sont encore **en mémoire** : ils ne sont ni persistés au
  rechargement ni inclus dans `exportSave()`. Ne pas les confondre avec les
  réglages persistants du capital et des événements bonus.
- G2 utilise le Core injecté par son orchestrateur ; G3/G4 importent la façade.
  L’export ne branche pas automatiquement les règles des jeux sur ces valeurs.

### Créer le profil du joueur : creerProfil()

Utiliser sur l’écran de création de profil (G4), au premier lancement.

```js
import { creerProfil, getState } from '<chemin-relatif>/services/coreService.js';

try {
  const etat = creerProfil({ pseudo: saisie, dateNaissance: '2000-05-17' }); // date facultative
  // etat.pseudo, etat.balance (capital de départ de la config)…
} catch (erreur) {
  // refus : afficher erreur.message, rien n’a été enregistré
}
```

- La façade publique accepte seulement les informations du profil. Le capital, les jeux
  et le stockage sont choisis par le Core ; les options d’injection restent internes à G1.
- Le Core valide tout : pseudo non vide (espaces retirés), date `AAAA-MM-JJ` existante
  et pas dans le futur. L’UI ne recalcule ni le capital ni les jeux de départ.
- **18 ans révolus** (#339) : si `dateNaissance` est fournie et que la personne a moins
  de 18 ans, `creerProfil` lève une erreur (« il faut avoir au moins 18 ans… ») et
  n’enregistre rien. L’UI affiche `erreur.message` ; elle ne refait pas le calcul.
  La date reste facultative : sans date, pas de vérification.
- Une seule écriture : en cas d’erreur, l’état n’est pas modifié.
- **Un seul profil sur une première session vérifiée** : seule l’absence de
  `casino_state` au démarrage autorise la création. Sans stockage, une nouvelle
  session en mémoire est également possible. Toute écriture de partie réussie
  (y compris un import) ferme ce droit ; un échec permet de réessayer.
- Le capital effectif est relu au moment de `creerProfil()` : `balance` et
  `bestBalance` prennent ensemble cette valeur, même sous 1000. Un changement
  ultérieur du réglage admin ne modifie jamais un joueur existant.
- Une ancienne sauvegarde sans pseudo reste une partie existante, même avec
  XP nulle, historique vide et soldes identiques au défaut. Ne pas déduire une
  première session de la seule absence de pseudo. L’UI peut proposer de continuer
  sans profil (parcours G4), mais ne doit pas effacer la sauvegarde pour contourner
  le refus. Un stockage illisible/inaccessible n’autorise pas non plus la création.
- Le solde visible avant création est provisoire : le capital peut changer
  avant l’enregistrement du profil. Plusieurs profils restent hors de ce parcours.
- Après la création, relire `getState()` : `pseudo` et `birthDate` y figurent.

### XP et niveaux : addXP(amount), getLevel()

Pour G2/G3/G4, vérifier les exports de `coreService.js`, puis passer exclusivement
par cette façade. Ne pas recalculer un niveau dans l'UI ni importer la configuration
interne. `addXP(amount)` retourne `{ xp, level }` ; `getLevel()` retourne un nombre.

Depuis la PR #238, ces fonctions sont branchées sur l'état partagé via
`createProgressionStore`. Chaque opération relit la progression courante ;
`addXP()` persiste XP et niveau ensemble avant de retourner la paire. `getLevel()`
calcule depuis l'état courant sans écriture. Après un ajout réussi, relire
`getState()` pour l'affichage. Une restauration acceptée est visible par cette
instance dès la prochaine lecture, sans conserver un ancien snapshot du joueur.

Avec `localStorage`, les écritures sont sauvegardées ; sans ce stockage, l'état
reste en mémoire. Une erreur de stockage est propagée et l'opération ne doit pas
être présentée comme réussie.

`amount` doit être un nombre fini positif ou nul ; les décimales et zéro sont
acceptés. Une chaîne, `NaN`, `Infinity`, un gain négatif ou un cumul qui déborde
lèvent une `RangeError`. Le niveau ne diminue pas lors des opérations de
progression, même si le solde baisse ou si un niveau supérieur est déjà acquis.

Pour afficher une progression, utiliser une lecture cohérente du Core, puis
relire après l'opération réussie. Ne jamais écrire directement dans `localStorage`.
L'attribution automatique d'XP par partie relève du règlement atomique #131,
séparément du branchement persistant. Ne pas appeler `addXP()` après `play()` si
ce règlement applique déjà l'XP : cela créditerait deux fois la même partie.

### Badges du joueur : getBadges()

Utiliser pour afficher les badges au classement et sur le profil (G4).

```js
import { getBadges } from '<chemin-relatif>/services/coreService.js';

getBadges();
// → [{ id: 'parties-1000', nom: '1000 parties jouées', obtenu: false, actuel: 12, seuil: 1000 },
//    { id: 'faillites-5', nom: 'A survécu à la faillite 5 fois', obtenu: false, actuel: 0, seuil: 5 }]
```

- Le Core attribue les badges ; l’UI affiche `nom`, `obtenu` et la progression `actuel / seuil`
  sans recalculer. Aucun argument : l’appelant ne choisit pas les définitions.
- Seuls les deux badges d’`AGENTS.md` existent ; d’autres s’ajoutent dans
  `config/badges.config.js` (contenu décidé par le G5).
- `actuel` des parties = nombre de parties de l’historique ; celui des faillites reste à 0
  tant que `play()` ne tient pas le compteur `faillites` (#131).

### Jeux débloqués et historique : getUnlockedGames(), getHistory()

```js
import { getUnlockedGames, getHistory } from '<chemin-relatif>/services/coreService.js';

getUnlockedGames(); // ['slots', 'dice', 'scratch', 'blackjack'] au niveau 3
getHistory();       // [{ roundId, gameId, bet, outcome, payout, netGain, playedAt }, …]
```

- `getUnlockedGames()` (#344) : jeux acquis plus jeux dont le niveau requis est atteint.
  Ne jamais comparer soi-même `level` et `unlockLevel` dans l’UI : afficher cette liste.
  Un acquis n’est jamais retiré (joueur ruiné compris).
- `getHistory()` : entrées dans l’ordre d’enregistrement, copie indépendante. Les parties
  n’ont pas de `type` ; un ajustement de l’admin a `type: 'ADMIN_ADJUSTMENT'` (#322).
- Lectures seules : relire après un `play()` réussi pour afficher la mise à jour.

### Tirer du hasard brut : roll(), tirageEntier(), tirageAvecPoids(), melanger()

| Fonction | Quand l’utiliser | Retour / précaution |
|---|---|---|
| `roll(gameId, params?)` | Obtenir du hasard brut pour les règles G2 | `{ gameId, value, nonce }`, value dans `[0,1)` ; ne décide pas du résultat ; nonce n’est pas un identifiant garanti unique |
| `tirageEntier(min, max)` | Choisir un entier dans un intervalle | Bornes incluses ; erreur si une borne n’est pas un entier sûr, si min > max ou si la largeur de l’intervalle dépasse les entiers sûrs |
| `tirageAvecPoids(elements, poids)` | Choisir un élément selon des poids relatifs | Renvoie l’élément tiré, pas son index (pour un index : passer `[0, 1, …, n-1]` comme éléments) ; tableaux non vides de même longueur ; poids nombres finis ≥ 0, somme finie et > 0 ; pas besoin d’une somme égale à 1 ; un élément de poids 0 n’est jamais tiré (ex. probabilité réglée à 0 dans la config) |
| `melanger(liste)` | Mélanger un paquet ou une liste | Nouveau tableau ; mêmes occurrences et références ; entrée non modifiée ; erreur si l’entrée n’est pas un tableau |

```js
import { melanger } from '<chemin-relatif>/services/coreService.js';
const paquetMelange = melanger(paquetConstruitParG2);
```

G2 construit les cartes `{ rank, suit }`, garde la pioche et applique les règles.
Le Core ne connaît pas la valeur des cartes. Format des cartes, garanties de
`melanger` et rôles G1/G2 : voir `docs/contracts/cards-contract.md` (#76), qui fait
référence en cas d’écart avec cette skill. Un sabot de deux jeux contient
normalement deux occurrences de chaque rang/couleur : vérifier la conservation
multiplicité par multiplicité, pas l’unicité des 104 valeurs.

Le mélange est superficiel : modifier un objet carte affecterait ses autres
références. Ne pas muter les cartes partagées. Un mélange peut rendre le même
ordre ; un test ne doit pas exiger un ordre différent.

Depuis #167, les entrées hors domaine lèvent une `Error` au lieu de fausser le
tirage : poids qui ne sont pas des nombres finis (chaîne `'1'`, `NaN`, `Infinity`),
somme des poids qui déborde, bornes non entières ou hors des entiers sûrs. Ne pas
rattraper l’erreur avec un tirage par défaut : corriger l’entrée, ou signaler à G1
une entrée légitime refusée.

`semer` n’est pas une API UI. Dans les tests internes G1 de reproductibilité seulement : importer
`semer` depuis `src/core/rng.js`, poser une graine et appeler `semer(null)` dans un
`finally`. Tout hasard passe par le Core, jamais par `Math.random()`.

### IA du poker : choisirAction(payload)

Utiliser dans l’orchestrateur du poker (G2), à chaque tour de parole du bot (#196).

```js
// core = coreService injecté dans l’orchestrateur (jamais d’import de src/core/)
const decision = core.choisirAction({
  stage, communityCards, pot, currentBet, minRaise,
  playerState: { chips, currentContribution },          // jamais la main du joueur
  aiState: { hand, chips, currentContribution },
  availableActions: ['fold', 'call', 'raise'],          // calculées par le G2
  aiHandStrength: 0.62,                                 // force de la main du bot, 0 à 1, évaluée par le G2
});
// → { type: 'call' } ou { type: 'raise', amount: 80 }
```

- `type` est toujours dans `availableActions` ; `amount` (relance seulement) est entre
  `minRaise` et `aiState.chips`. Le G2 applique la décision avec ses propres règles.
- Le Core n’évalue jamais les cartes : c’est le G2 qui calcule `aiHandStrength`
  (`evaluatePokerHand` n’accepte que 5 cartes ; preflop et turn/river à couvrir côté G2).
- Hypothèses à confirmer par le G2 (#196) : `amount` et `minRaise` dans la même unité,
  pas de tapis (si `aiState.chips < minRaise`, le bot ne relance pas).
- Le hasard du bot (bluff, taille de relance) passe par `rng.js` : reproductible en
  test G1 avec `semer()`. Les jetons du bot restent dans la session du G2.
- Payload invalide ou `aiHandStrength` absente → erreur explicite, rien n’est décidé.

### Relance à 0 jeton : claimDailyBonus()

```js
import { claimDailyBonus } from '<chemin-relatif>/services/coreService.js';

const r = claimDailyBonus();
// → { claimed: true, amount, newBalance, nextClaimAt }
// → { claimed: false, reason: 'balance_not_zero' | 'cooldown', remainingMs }
```

- Seul mécanisme de relance retenu (décision G5) : bonus si le solde vaut 0, une fois par
  délai (montant et délai dans `config/economy.config.js`). `requestLoan` est abandonné.
- Le Core décide : l’UI affiche `reason` / `remainingMs`, sans recalculer l’éligibilité.
- La date de réclamation est enregistrée dans l’état (#348) : recharger la page ne
  remet pas le délai à zéro.

### Exporter et importer une sauvegarde : exportSave() / importSave()

Une sauvegarde dont `bestBalance < balance` est refusée, même avec un hash valide.
L’import refusé conserve l’état courant et le stockage. Un import accepté est un
**remplacement complet** de l’instantané, jamais une fusion : une ancienne sauvegarde
cohérente restaure aussi une XP, un niveau ou un meilleur solde inférieurs à ceux de
la session courante (décision G5,
[politique de restauration #258](https://github.com/maximiliense/M1AgenticCoding/issues/258)).
La règle « l’XP, le niveau et le meilleur solde ne diminuent jamais » s’applique
pendant le jeu (`updateState`, `play()`), pas à un import volontaire.

Utiliser pour permettre au joueur de télécharger sa partie ou d’en recharger une
(écran Profil ou paramètres, G4). Le Core ne gère ni le fichier ni le bouton :
l’UI propose le texte en téléchargement, ou lit le fichier choisi et passe son contenu.

```js
import { exportSave, importSave } from '<chemin-relatif>/services/coreService.js';

const contenu = exportSave(); // chaîne JSON { version, hash, data }

try {
  const etat = importSave(texteDuFichier); // copie indépendante de l’état restauré
} catch (erreur) {
  // sauvegarde refusée : la partie en cours n’a pas changé
}
```

| Fonction | Retour | Erreurs |
|---|---|---|
| `exportSave()` | Chaîne JSON `{ version, hash, data }`, où `data` est l’état courant | Aucune attendue |
| `importSave(texte)` | Copie indépendante de l’état restauré | `Error` si le texte n’est pas du JSON, si la version n’est pas supportée (seule la version 1 l’est), si la forme est invalide, si le hash ne correspond pas, si l’état n’est pas conforme, ou si l’écriture dans le stockage échoue |

- Une sauvegarde refusée ne modifie rien, ni en mémoire ni dans `casino_state`.
- Une sauvegarde acceptée remplace **toute** la partie (solde, XP, niveau, jeux
  débloqués, historique) : prévenir le joueur avant. Relire `getState()` ensuite.
- Ne pas modifier le texte exporté : toute modification change le hash et l’import est refusé.
- Le hash FNV-1a détecte une sauvegarde abîmée, pas la triche (le code est visible).
  Ne pas le présenter comme une protection.
- Ne jamais lire ou écrire `casino_state` directement dans `localStorage`.
- Ne jamais garder le maximum de chaque champ entre deux sauvegardes : mélanger deux
  états désynchroniserait solde, historique et inventaire (#258).
- Au démarrage, un `casino_state` illisible ou non conforme ne fait pas planter
  l’application : avertissement dans la console, état par défaut, et `casino_state`
  conservé jusqu’au prochain enregistrement réussi (#240). Ce cas est distinct d’un
  import refusé, qui conserve la partie déjà chargée.

### Statistiques globales : getGlobalStats()

Utiliser pour la page Statistiques et le tableau de bord Admin (G4).

```js
import { getGlobalStats } from '<chemin-relatif>/services/coreService.js';

const { totalPlays, totalWagered, totalWon, activePlayers, byGame, mostPlayed } = getGlobalStats();
// byGame : { roulette: { plays, wagered, won }, … } ; mostPlayed : ['roulette', 'slots', …]
```

- Calculées par le Core à partir de l’historique des parties : l’UI affiche, sans recalculer.
- `totalWon` = total reversé aux joueurs, mise incluse (comparable à `totalWagered`).
  Montants arrondis au centime ; `activePlayers` vaut 0 ou 1 (un seul profil aujourd’hui).
- Toutes les valeurs restent à 0 tant que `play()` n’enregistre pas l’historique (#131).
- Une erreur signale un historique enregistré corrompu.

### Classement : getLeaderboard()

Utiliser pour la page Classement (G4).

```js
import { getLeaderboard } from '<chemin-relatif>/services/coreService.js';

getLeaderboard();
// → [{ pseudo: 'Olti', bestBalance: 1250, balance: 800, level: 3, badges: [] }]
```

- Le Core classe : par `bestBalance` décroissant (le score d’AGENTS.md), puis niveau, puis
  pseudo. L’UI affiche dans l’ordre reçu, sans trier ; le rang est la position.
- Afficher **`bestBalance`** comme score (« Meilleur solde »), pas `balance`.
- Un seul profil aujourd’hui : la liste contient le joueur courant. `pseudo` vaut `null`
  pour une ancienne sauvegarde sans profil.
- `badges` : badges **obtenus** seulement, `[{ id, nom }]` (vide sinon) ; afficher `nom`.
  La progression vers un badge se lit avec `getBadges()`.

### Boutique : getShopCatalog(), getShopInventory(), purchaseShopItem()

Utiliser pour l’écran Boutique (G4), selon `src/pages/Shop/SHOP_CORE_CONTRACT.md`.

```js
import { getShopCatalog, getShopInventory, purchaseShopItem } from '<chemin-relatif>/services/coreService.js';

const articles = getShopCatalog();                // [{ id, name, description, category, price, visual?, available }]
const { ownedItemIds } = getShopInventory();       // articles déjà achetés
const resultat = purchaseShopItem(article.id);     // { status, itemId, balance, message? }
```

| `status` | Sens |
|---|---|
| `purchased` | Achat fait : solde débité et article ajouté, en une seule écriture |
| `already-owned` | Article déjà possédé |
| `unavailable` | Article présent mais `available: false` |
| `insufficient-funds` | Solde inférieur au prix (le solde ne passe jamais sous 0) |
| `rejected` | Identifiant inconnu ou invalide |

- Seul `purchased` modifie l’état. `balance` est toujours le solde après l’opération :
  l’afficher, puis relire l’inventaire. Le meilleur solde, l’XP et le niveau ne changent pas.
- L’UI ne décide jamais d’un achat : elle envoie l’identifiant et affiche le statut.
- Une erreur levée signifie un échec d’écriture : ne pas annoncer l’achat.
- Le catalogue contient les 4 articles de la maquette du G4 (#325) : `avatar_chapeau`,
  `theme_nuit`, `effect_confettis`, `badge_fidele`. Ne plus lire `src/mocks/shop.mock.js` :
  « possédé » vient de `getShopInventory()`, « indisponible » de `available: false`.
  Le contenu peut changer (décision G5) : prévoir quand même un catalogue vide. Jamais de vrai argent.
- L’effet d’un article (avatar, thème…) relève de l’affichage, pas du Core.

### Réglages admin : capital de départ et événements bonus

Utiliser pour l’écran Admin (G4) et pour afficher un bonus en cours.

```js
import {
  getStartingCapital, setStartingCapital,
  getEvenementsBonus, getMultiplicateurBonus, lancerEvenementBonus, arreterEvenementBonus,
} from '<chemin-relatif>/services/coreService.js';

getStartingCapital();                 // 1000 par défaut, sinon la valeur réglée
getMultiplicateurBonus('gains');      // 1 sans événement en cours ('gains' ou 'xp')
try {
  setStartingCapital(500);            // admin uniquement
  lancerEvenementBonus({ id: 'week-end', cible: 'gains', multiplicateur: 2, debut, fin }); // dates en ms
} catch (erreur) {
  // rôle non admin, valeur invalide ou chevauchement : rien n’a été modifié
}
```

- Lectures publiques ; `setStartingCapital`, `lancerEvenementBonus` et
  `arreterEvenementBonus` sont **réservés à l’admin** : le rôle est vérifié dans le Core
  (n°24). Masquer un bouton ne suffit pas, et un refus lève une erreur.
- Un événement : `cible` `'gains'` ou `'xp'`, `multiplicateur` > 1, période `[debut, fin)`.
  Un seul événement à la fois par cible. Aucun événement par défaut.
- Ces réglages sont enregistrés (ils survivent au rechargement), hors de la partie du
  joueur : une sauvegarde exportée ne les contient pas.
- Le nouveau capital ne change pas les soldes existants ; son usage pour l’état initial
  et `creerProfil` est le branchement #253.
- G1 (`play()`) : lire `getMultiplicateurBonus(cible)` depuis `config/events.config.js`
  au moment du règlement (arbitrage G5 du 07/10), dans la même transaction.

### Ajuster le solde (admin) et rôle admin en dev : updatePlayerBalance(amount), activerRoleAdminDev()

Utiliser pour l’écran Admin (G4). Décisions du G5 dans #255.

```js
import { updatePlayerBalance, activerRoleAdminDev } from '<chemin-relatif>/services/coreService.js';

activerRoleAdminDev();          // 'admin' : uniquement avec npm run dev, refusé dans le site compilé
try {
  updatePlayerBalance(-150);    // admin uniquement ; positif = ajout, négatif = retrait
  // → { type: 'ADMIN_ADJUSTMENT', amount: -150, balanceBefore, balanceAfter, adjustedAt }
} catch (erreur) {
  // rôle non admin, montant invalide ou solde qui deviendrait négatif : rien n’a été modifié
}
```

- Un seul argument : le montant (nombre fini non nul, au centime près). Il porte sur le
  **profil courant** ; l’identifiant du joueur viendra avec les profils multiples (n°5).
- Le solde ne passe jamais sous 0 (retrait trop grand refusé), `bestBalance` monte si
  besoin et ne baisse jamais ; XP, niveau et jeux ne changent pas.
- L’ajustement ajoute une entrée `type: 'ADMIN_ADJUSTMENT'` à `getState().history`. Les
  parties n’ont pas de `type` : un affichage d’historique doit distinguer les deux.
  `getGlobalStats()` et `getBadges()` ignorent ces entrées.
- Après la bascule, toutes les fonctions admin (`setGameConfig`, capital, événements,
  ajustement) sont acceptées. Le rôle est enregistré dans la partie du joueur.

## G1 uniquement : écriture et progression internes

Ces exemples supposent #139 et #144 intégrées dans la base de travail. Ils ne
constituent pas une autorisation d’import interne pour G2/G3/G4.

### initializePlayerState(player) — interne G1

Utiliser uniquement pour enregistrer le premier joueur construit par `creerProfil`.
Le Core contrôle le cycle de vie : absence de sauvegarde vérifiée au démarrage,
aucune écriture réussie depuis, validation du joueur initial et une seule écriture
avant publication en mémoire. Toute erreur conserve l’état et permet une nouvelle
tentative si la session était vierge. Ne pas exposer cette fonction via `coreService`.

Ne pas utiliser `restoreState` pour créer un profil, ni assouplir la monotonie de
`updateState`. Les opérations sur une partie existante continuent de passer par
`updateState` ; elles rendent ensuite impossible une première initialisation.

### updateState(updater)

Utiliser pour appliquer ensemble un ensemble de conséquences déjà calculées.
Le callback synchrone reçoit une copie et retourne l’état complet. Aucun effet
externe dans le callback ; aucune écriture ou restauration imbriquée.

```js
import { updateState } from './state.js';
updateState((current) => ({ ...current, ...consequencesValidees }));
```

`consequencesValidees` est produit par les modules G1, pas par une entrée UI brute.
L’état conserve son format, XP/niveau/meilleur solde ne diminuent pas ; le niveau
est un entier sûr et le meilleur solde couvre le solde courant. Données JSON
seulement : pas de cycles, fonctions, dates, collections, valeurs non finies,
undefined ou propriétés supplémentaires sur des tableaux.

Le stockage est écrit avant publication en mémoire. Toute erreur de validation,
calcul ou persistance est propagée ; ne pas afficher de succès si elle survient.
L’atomicité couvre une opération synchrone dans une instance, pas plusieurs onglets.
La restauration est distincte ; ne pas utiliser ce setter pour contourner ses règles.

### Calculer et tester la progression : calculateLevel(), createProgression()

Imports internes **G1 uniquement** : `src/core/progression.js`,
`src/core/progression.mock.js` et `src/core/config/progression.config.js`.

`calculateLevel(xp, thresholds?)` est un calcul pur. L'XP cumulée doit être un
nombre fini positif ou nul. La courbe doit être un tableau non vide, commencer à
zéro et contenir des nombres finis positifs ou nuls strictement croissants.
Une entrée invalide lève une `RangeError`. Le seuil est inclus : 100 XP atteint
le niveau 2 avec la courbe actuelle. Le calcul est borné au dernier niveau de
la courbe ; il ne connaît pas le niveau déjà acquis du joueur.

`TEMPORARY_LEVEL_THRESHOLDS` contient actuellement `[0, 100, 250, 500, 1000]`.
Ces valeurs restent **temporaires** ; elles ne constituent pas une courbe
collectivement validée. Lire la configuration plutôt que recopier ces nombres
dans une règle métier.

```js
// Exemple de test interne G1 ; pas un import autorisé pour l'UI.
import { calculateLevel, createProgression } from './progression.js';
import { createProgressionMock } from './progression.mock.js';

calculateLevel(100); // 2, avec la courbe temporaire actuelle
const progression = createProgression(createProgressionMock({ xp: 90, level: 1 }));
progression.addXP(10); // { xp: 100, level: 2 }
progression.getLevel(); // 2
```

`createProgression(store, thresholds?)` attend un adaptateur synchrone
`read()` / `write({ xp, level })`. Chaque opération relit la paire courante ; le
niveau stocké doit être un entier sûr supérieur ou égal à 1. Le niveau retourné
est le maximum entre le niveau acquis et celui calculé depuis l'XP. Par exemple,
un joueur ayant `{ xp: 0, level: 4 }` conserve le niveau 4 après un gain de 10 XP.

La courbe est validée et **copiée à la création** de l'instance. Modifier ensuite
le tableau d'origine ne reconfigure pas cette instance. Le branchement d'une
configuration administrable doit donc suivre le contrat validé, sans recréer
arbitrairement une instance ni perdre le niveau acquis.

`addXP()` écrit XP et niveau ensemble et retourne la paire après écriture.
Les erreurs de lecture ou d'écriture de l'adaptateur sont propagées : ne pas
annoncer un succès en cas d'échec de persistance. `getLevel()` ne persiste pas le
niveau calculé. Le mock permet des tests isolés ; il n'est pas un stockage réel.
Tester les seuils exacts, les décimales, les entrées invalides, la conservation
d'un niveau acquis et la propagation des erreurs d'écriture.

Les calculs d'XP par partie (#247/#248) et du seuil du prochain niveau
(#249/#250), ainsi que son exposition publique (#252), sont des sujets séparés.
Une PR ouverte ne rend pas leurs fonctions disponibles : vérifier les fichiers
et exports présents avant de les utiliser ou de les documenter comme intégrés.

### createProgressionStore({ getState, updateState })

Utiliser pour brancher le calcul de progression de Reda sur un stockage synchrone
respectant le contrat atomique. Pas de stockage supplémentaire, ni de cache du joueur.

```js
import { getState, updateState } from './state.js';
import { createProgressionStore } from './progression.store.js';
import { createProgression } from './progression.js';
const progression = createProgression(createProgressionStore({ getState, updateState }));
```

`read()` renvoie une nouvelle paire `{ xp, level }`. `write({ xp, level })` exige
les deux champs, ignore les autres, refuse les diminutions et propage les erreurs.
XP finie ≥ 0 (décimales acceptées), niveau entier sûr ≥ 1. Le calcul du niveau
reste à `createProgression`. Les dépendances injectées doivent être synchrones.

Pour régler une partie, ne pas enchaîner
une écriture de solde puis une écriture XP : #131 prévoit une transaction globale
comprenant solde, XP/niveau, meilleur solde et historique.

## Vérifier l’intégration

- Contrôler les exports sur la branche réellement utilisée.
- Tester via coreService pour les consommateurs, et avec des dépendances injectées
  pour les modules internes.
- Vérifier erreurs, copies indépendantes et absence d’écriture partielle.
- Exécuter les tests concernés, puis tests/lint/build avant la PR.

Coordination : #61 (état), #70 (cartes), #115 (exports), #131 (règlement),
#139 (écriture atomique), #143/#144 (adaptateur), #172 (sauvegarde). Une évolution de contrat passe
par G1/G5 ; cette skill ne remplace pas les contrats validés.
