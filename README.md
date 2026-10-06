# Casino Fantôme

> Simulateur de casino **100 % fictif**, 100 % front-end (React + Vite + JavaScript),
> développé par des agents IA supervisés par environ 25 étudiants répartis en 5 groupes.

## Le projet

Le joueur reprend un vieux casino fermé depuis des années. Il démarre avec un
capital de jetons fictifs et cherche à le faire grossir en jouant. **Aucun vrai
argent, nulle part** : pas de paiement, pas d'achat réel, pas de conversion
entre jetons et argent.

### Principes du jeu

- **Solde et progression sont indépendants.** Le solde de jetons monte et descend
  selon les gains et les pertes. L'XP se gagne à chaque partie jouée (gagnée ou
  perdue) et **ne redescend jamais** ; elle sert uniquement à débloquer des jeux
  et des salles.
- Un joueur ruiné garde son niveau et ses jeux débloqués, et n'est **jamais
  bloqué** à 0 jeton (un mécanisme de relance est prévu).
- Le **meilleur solde atteint** est le score du classement ; il ne redescend jamais.
- Pas de multijoueur en temps réel : le poker et le bingo se jouent contre des bots.
- Le capital de départ (1000 par défaut), les seuils de déblocage, les
  probabilités de gain et les gains d'XP sont **configurables**, jamais codés en dur.

### Jeux prévus

| Jeu | Type | Débloqué (par défaut) |
| --- | --- | --- |
| Machine à sous | Hasard | Départ |
| Dés / Craps | Hasard | Départ |
| Cartes à gratter | Hasard | Niveau 2 |
| Blackjack | Cartes | Niveau 3 |
| Roue de la fortune | Hasard | Niveau 4 |
| Roulette | Hasard | Niveau 5 |
| Baccarat | Hasard | Niveau 6 |
| Plinko | Hasard | Niveau 7 |
| Vidéo poker | Cartes | Niveau 8 |
| Memory casino | Adresse | Niveau 8 |
| Quiz « risque ton argent » | Adresse | Niveau 9 |
| Bingo (contre bots) | Hasard | Niveau 10 |
| Poker contre l'IA (bots) | Cartes | Niveau 12 |

### Rôles (cumulatifs)

- **Joueur** : jouer aux jeux débloqués, voir ses stats, consulter le classement,
  dépenser ses jetons en boutique.
- **Modérateur** : joueur + gérer les signalements, voir les comptes suspects,
  désactiver un compte pour triche.
- **Admin** : modérateur + configurer les jeux, ajuster le capital de départ,
  lancer des évènements bonus, consulter le dashboard de stats globales.

Le **classement** affiche pour chaque joueur : pseudo, meilleur solde atteint,
niveau et badges.

### Organisation

| Groupe | Responsabilité |
| --- | --- |
| G1 — Core Engine | Moteur sans UI : état, RNG, économie, XP, sauvegarde, IA des bots, API publique |
| G2 — Jeux | Règles de chaque jeu et orchestration des parties |
| G3 — Rendu visuel | Affichage, animations et interface **en jeu** |
| G4 — Application | Navigation, lobby, profil, progression, classement, boutique, stats, admin |
| G5 — Qualité et intégration | Git, CI/CD, tests, contrats, revue des PR, releases |

Le détail de chaque groupe est dans [Membres par groupe](#membres-par-groupe).
Les règles suivies par les agents IA sont dans [`AGENTS.md`](AGENTS.md).

## Stack

- **React** + **Vite** (JavaScript, sans TypeScript)
- **math.js** pour les calculs / probabilités (encapsulé dans `src/core/rng.js`)
- **localStorage** pour la persistance
- **Aucun backend, aucune base de données, aucune API externe, aucune clé API,
  aucune authentification serveur.**
- Hébergeable directement sur **GitHub Pages** (`base: './'` relatif).

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Tests

```bash
npm test
```

Un test minimal (`tests/unit/core.contract.test.js`) vérifie le **contrat public**
du Core (via `coreService`). Ce n'est pas une suite de tests métier.

## Architecture

### Règle d'or

> **Chaque groupe ne modifie QUE son propre dossier.**
> La communication entre groupes se fait uniquement via des contrats de
> fonctions / interfaces documentés.

### Point d'accès unique au Core

`/src/services/coreService.js` est le **SEUL point d'accès** au Core pour
`/src/app/`, `/src/pages/`, `/src/components/`, `/src/game-ui/`.

Ces dossiers ne doivent **JAMAIS** importer `/src/core/core.js` ou un module
interne du Core directement.

```
UI / Pages / App / Game UI
        |
        v
   coreService.js
        |
        v
       Core
```

Et **jamais** : `UI ──────────────► Core interne`.

### Le Core (mocks)

Le Core est fourni sous forme de **mocks fonctionnels minimaux** qui retournent
des valeurs cohérentes mais fictives :

| Module | Fonctions publiques |
| --- | --- |
| `core/state.js` | `getState()` |
| `core/rng.js` | **Seule source de hasard** : `roll(gameId, params)`, `tirageEntier(min, max)`, `tirageAvecPoids(elements, poids)`, `melanger(liste)`. `semer(graine)` est interne, réservé aux tests (séquences reproductibles). Mélange du paquet : `docs/contracts/cards-contract.md` |
| `core/economy.js` | `play()`, `getBalance()`, `claimDailyBonus()`, `requestLoan()` |
| `core/progression.js` | `addXP()`, `getLevel()`, `getUnlockedGames()`, `getLeaderboard()`, `getHistory()` |
| `core/config/games.config.js` | 10 jeux + niveaux de déblocage, `setGameConfig()`, `getGlobalStats()` |
| `core/storage.js` | `exportSave()`, `importSave()` (hash FNV-1a : standard retenu pour le contrôle d'intégrité non cryptographique) |
| `core/core.js` | **API publique** du Core (ré-exports) |

**Règle absolue du RNG :** `rng.js` est la seule source de hasard. Aucun fichier
de jeu n'utilise `Math.random()` directement. Ses fonctions ne produisent que
des résultats **bruts** : elles ne déterminent jamais si le joueur gagne ou perd.

### Persistance locale

Clé principale : `casino_state`. Le schéma complet est documenté dans
`src/core/state.js`.

`importSave()` valide la version, la forme des données et le hash avant de
restaurer l'état en mémoire et dans `casino_state`. Une sauvegarde invalide ou
une erreur d'écriture laisse l'état en mémoire inchangé. Le hash FNV-1a est le
standard retenu pour le contrôle d'intégrité non cryptographique : il détecte
une sauvegarde abîmée, pas la triche.

### Arborescence

```
public/            images, sounds, icons
src/
  app/             App.jsx
  core/            Core (mocks) + core.js (API publique)
    ai/            IA (à définir)
    config/        games.config.js
  games/           logique des jeux (10 jeux) - vide pour l'instant
  game-ui/         UI des jeux (10 jeux) - vide pour l'instant
  pages/           Lobby, Game, Profile, Progression, Leaderboard, Shop, Statistics, Admin, NotFound
  layouts/         MainLayout, AdminLayout
  components/      Navbar, Sidebar, GameCard, PlayerHeader, BalanceDisplay, XPBar, LevelBadge, Modal, Notification, Loader
  services/        coreService.js (façade)
  mocks/           player, games, leaderboard, shop, stats
  config/          navigation.config.js, gameRegistry.js
  styles/          global.css, variables.css
  assets/
tests/
  unit/            test minimal de contrat
  integration/
.github/workflows/ ci.yml
```

## Décisions techniques encore ouvertes

Ces points sont **volontairement laissés ouverts** et seront tranchés par l'équipe :

- **IA**
  - emplacement exact dans `/src/core/ai/`
  - contrat de communication
  - responsabilités de l'IA
  - éventuelle stratégie locale / offline
- **Hash de sauvegarde**
  - gestion de l'intégrité
  - format définitif du fichier de sauvegarde
- **Routing**
  - bibliothèque éventuelle (aucune n'est installée pour l'instant)
  - stratégie GitHub Pages pour les routes
- **Architecture React**
  - organisation définitive des composants
  - stratégie de state management si nécessaire
- **Tests**
  - framework de test définitif (actuellement le runner intégré Node `node --test`)
  - stratégie unit / integration / e2e

## Décisions de jeu encore ouvertes

Ces points ne doivent **pas** être tranchés seul : toute tâche qui en dépend
s'arrête et remonte la question au Groupe 5 (voir `AGENTS.md`).

- Relance à 0 jeton : bonus quotidien **ou** prêt avec intérêt fictif ?
- Le solde peut-il passer sous 0 ?
- XP gagnée par partie (identique pour tous les jeux ?) et courbe de niveaux.
- Contenu de la boutique.
- Liste des salles et niveaux de déblocage.
- Contenu des évènements bonus.
- Administration (G4-10) : confirmée ou non.

## CI

`.github/workflows/ci.yml` : à chaque push / Pull Request, installe les
dépendances, lance le build et les tests. Échoue si le build ou les tests échouent.

## Hors périmètre

- Tout vrai argent : paiement, achat réel, conversion jetons ↔ argent.
- Multijoueur en temps réel.
- Backend, base de données, API externe, authentification serveur.

## Membres par groupe

### Groupe Enseignant — Encadrement et Suivi Pédagogique
| Pseudo Github | Liste Pseudos utilisés  | Nom, prénom | Rôle(s) |
| :--- | :--- | :--- | :--- |
| maximiliense | maximiliense | Servajean, Maximilien | teacher |

### Groupe 1 — Core Engine / Logiques / IA

Le Groupe 1 développe le **Core Engine**, le moteur du casino, en JavaScript pur et sans aucune interface. Il gère l'état du joueur et sa persistance (`state.js`, clé `casino_state`), la seule source de hasard du projet (`rng.js`), l'économie et le solde (`economy.js` : mises, règlements, bonus, prêts), la progression (`progression.js` : XP qui ne redescend jamais, niveaux, jeux débloqués, historique, meilleur solde, classement), la configuration des jeux (`config/`), la sauvegarde avec contrôle d'intégrité (`storage.js`) et l'IA des bots (`ai/`). Il expose une **API publique stable** (`core.js`), accessible au reste de l'application uniquement via `coreService.js`. Le Core ne décide jamais du résultat d'un jeu : il fournit le hasard brut, puis applique les conséquences (solde, XP) du résultat calculé par le Groupe 2.

| Pseudo Github | Liste Pseudos utilisés  | Nom, prénom | Rôle(s) |
| :--- | :--- | :--- | :--- |
| Itloow | Itloow, MJEKU OLTI | MJEKU, Olti | RNG et mélange (`rng.js` : tirages simples et pondérés, mélange, reproductibilité), contrat des cartes G1 ↔ G2 (#70) |
| ahmed-abc73 | ahmed-abc73, Ahmed Bekakria | Bekakria, Ahmed | État partagé et API du Core (`state.js`, `core.js`, coordination de `coreService.js`), tests d’isolation de l’état et coordination des interfaces G1 |
| Amina1203 | Amina1203, Amina Boudaouine | Boudaouine, Amina | Économie du Core (`economy.js` : validation des mises et calcul des règlements) |
| nafiamedreda | nafiamedreda, Mohamed Reda NAFIA | NAFIA, Mohamed Reda | Progression et configuration du Core : XP, calcul des niveaux, seuils XP configurables et tests associés ; validation et gestion de la configuration des jeux dans `src/core/config/games.config.js`. |
| ania-aitcherif | ania-aitcherif, Ania Aït Cherif | Aït Cherif, Ania | Sauvegarde et restauration (`storage.js`, persistance dans `casino_state`, export/import, contrôle d'intégrité FNV-1a), test de conformité des cartes (#70), niveaux de déblocage réglables (`config/unlock.config.js`, #137) |

### Groupe 2 — Jeu et règles du jeu

Le Groupe 2 décide **ce qui se passe** dans une partie : les règles de chaque jeu (`src/games/<jeu>/rules.js`), l'orchestration d'une partie (`src/games/_template/createGame.js`) et les appels au Core. Les règles sont **pures** : elles reçoivent un tirage brut et renvoient un résultat `{ outcome, multiplier, details }`, sans `Math.random()`, sans appel au Core et sans valeur de réglage en dur (gains et probabilités viennent de la `config`). Seul l'orchestrateur demande le tirage au Core (`coreService`) et appelle `play()` **une seule fois** par partie. Le Groupe 2 expose à tous les jeux une interface unique, `start(bets)` / `action(sessionId, playerAction)` : il garde l'état de la partie et renvoie à chaque étape un `renderPayload` et les `availableActions`. Il fournit aussi les utilitaires de cartes partagés (`src/games/cardUtils.js`, cartes `{ rank, suit }`). Il ne dessine rien (rendu en jeu : Groupe 3), ne modifie ni le solde ni l'XP (Groupe 1) et ne touche pas aux écrans hors partie (Groupe 4). Périmètre : `src/games/`, plus ses tests (`tests/unit/`, `tests/integration/g2/`, `tests/fixtures/g2/`). Mode d'emploi pour les autres groupes : skill `.agents/skills/jeux-g2`. Contrat : issue #68.

| Pseudo Github | Liste Pseudos utilisés  | Nom, prénom | Rôle(s) |
| :--- | :--- | :--- | :--- |
| Donia-alfonsi | Alfonsi Donia | Alfonsi Donia | moteur de cartes partagé, constructeur de paquet, Blackjack et son tirage · tests associés |
| Zelyx21 | Clem, Zelyx21 | Beaulieu, Clémentine | créer le socle commun, se coordiner avec les autres groupes |
| raphoulefoufou | raphoulefoufou | Capristo,Raphaël | création jeu de dés,test sur ces derniers |
| camilhamdach5-byte | camilhamdach5-byte, Camil-Hamdach | Hamdach,Camil | Création de la logique des jeux Blackjack, Slots et Scratch.|
| camseveyrat | camseveyrat - Camille | Seveyrat, Camille | règles et jeux : wheel + plinko |
| fcassius | fcassius, Cassius FELIHO | FELIHO, Cassius | référent intégration / documentation du G2 : contrats G2 ↔ G1 / G3 / G4, cohérence des formats, mocks et fixtures, tests d'intégration |


### Groupe 3 — Rendu visuel

Le Groupe 3 est responsable de l'interface **à l'intérieur d'une partie** : l'affichage de chaque jeu, les interactions du joueur (mise, bouton jouer, actions comme tirer ou rester), les animations et effets visuels, les états visuels d'une partie (chargement, en cours, terminée, erreur), l'affichage du résultat et les composants visuels communs aux jeux, comme le panneau de mise `BetPanel`. Son périmètre exclusif est `src/game-ui/`. Il affiche les données fournies par le Groupe 2 (`renderPayload`, `availableActions`, `gameResult`) sans jamais les recalculer : il ne décide pas du résultat d'une partie, ne calcule ni probabilités ni gains, ne modifie pas le solde ni l'XP et n'utilise jamais `Math.random()`. Il ne touche ni au Core (Groupe 1), qu'il n'utilise que via `coreService.js`, ni aux règles des jeux dans `src/games/` (Groupe 2), ni aux écrans hors partie comme le Lobby (Groupe 4). Tant qu'un jeu n'est pas livré par le Groupe 2, il travaille sur des données fictives qui respectent exactement le format du contrat, puis les remplace par les vraies données sans changer ses composants. Les règles de travail des agents du groupe sont décrites dans la skill `.agents/skills/game-ui/`.

| Pseudo Github | Liste Pseudos utilisés  | Nom, prénom | Rôle(s) |
| :--- | :--- | :--- | :--- |
| Zozote | Enzo Nguyen | Nguyen Enzo | UI, composants communs, review |
| Bahar487 | Bahar487, Bahar, Ali Bahar Ali | ALI BAHAR, Ali | Responsable du groupe 3 (rendu visuel), composants communs et jeux (BetPanel, slots, roulette) |
| AnthonySureau | AnthonySureau | Sureau Anthony | composants communs, review |
### Groupe 4 — Architecture de l'application et composants annexes / Navigation

Le Groupe 4 est responsable de l'application autour des jeux : l'architecture front-end (React + Vite), la navigation et le routage, le layout commun et la barre de navigation, les composants réutilisables (barre d'XP, badge de niveau, affichage du solde, carte de jeu, fenêtre modale, notification, indicateur de chargement) et les écrans hors partie : Lobby, Profil, Progression, Classement, Boutique, Statistiques et Administration. Il consomme le Core uniquement par l'intermédiaire de `coreService.js`, sans jamais importer ses modules internes, et affiche les données que le contrat public expose, en s'appuyant sur des données fictives tant qu'une fonction n'existe pas. Il n'implémente ni la logique du Core (Groupe 1), ni les règles des jeux (Groupe 2), ni l'interface à l'intérieur d'une partie (Groupe 3). Chaque composant est une brique de présentation, documentée et testée, que les autres groupes peuvent réutiliser.

| Pseudo Github | Liste Pseudos utilisés  | Nom, prénom | Rôle(s) |
| :--- | :--- | :--- | :--- |
| FlorientMarchal | FlorientMarchal, Florient Marchal | Marchal, Florient | Prompt d'initialisation de l'architecture (avec le groupe 4), écran Profil joueur (#18), écran Classement (#35), composants communs LevelBadge (#108), BalanceDisplay (#109) et GameCard (#110) |
| rayidahamada | rayidahamada | Rayid, Ahamada Rachid | Écran Statistiques (#21), intégration avec le Core (#69) |
| Mamadoudahirousy | Mamadoudahirousy | Sy, Mamadou Dahirou | Écran Boutique G4-08 (#20, PR #103) : catalogue responsive temporaire, solde via `coreService`, états des articles et gestion du chargement, des erreurs et du catalogue vide. Proposition de contrat Core documentée ; achats en attente du raccordement Core. |
| Kardiatou102 | Kardiatou102 | BA,  Kardiatou | Intégration de l’architecture sur Git, développement de l’écran Progression, développement de l’écran Admin. |
| LonaAdell | LonaAdell | ADELL, Lona | Lobby (écran hors jeu) G4-04 |
| stacytrocellier48-ux | stacytrocellier48-ux, Stacy Trocellier | Trocellier, Stacy | Prompt d'initialisation de l'architecture (avec le groupe 4), développement de Navbar et MainLayout (#74), du composant XPBar (#77) et des composants Modal, Notification et Loader (#78), avec documentation et tests associés |





### Groupe 5 — Gestion de projet, tests unitaires et intégration

Le Groupe 5 est l'équipe transverse garante de la stabilité du dépôt, de l'alignement architectural et de la qualité du code produit par l'ensemble des groupes.

* **Organisation & Pilotage :** Animation transverse, priorisation du Kanban sur GitHub Projects, gestion des labels, Definition of Ready/Done et arbitrage des dépendances inter-groupes.
* **Gouvernance Git & Releases :** Protection stricte de `main` (pas de push direct, PR avec 2 approbations obligatoires), abandon de `develop`, gestion des conflits, conventions Conventional Commits et gestion des releases (SemVer, tags).
* **DevOps & CI/CD :** Maintenance du pipeline GitHub Actions (`ci.yml` : lint, tests, build), mise en place des *quality gates* bloquants, correction des workflows défaillants et gestion du déploiement continu.
* **Gouvernance des Agents & Architecture :** Rédaction et maintenance de `AGENTS.md` et `.agents/skills/`. Contrôle des règles absolues du projet :
  * Bannissement strict de `Math.random()` au profit exclusif de `src/core/rng.js`.
  * Accès au Core uniquement via la façade officielle `src/services/coreService.js`.
  * Immutabilité de l'état partagé et fonctions pures pour les règles de jeux.
* **Validation des Contrats & Code Review :** Relecture systématique des PRs (gatekeeping), contrôle strict du périmètre (*anti-scope creep*), et vérification de la conformité des interfaces (G1 Core ↔ G2 Moteur ↔ G3 UI ↔ G4 App).
* **Assurance Qualité (QA) & Tests :** Tests avec `node --test`, tests statiques d'architecture (détection des imports illicites et du faux aléatoire), vérification des contrats via fixtures déterministes, validation de la cohérence mathématique des jeux et recette avant release.


| Pseudo Github | Liste Pseudos utilisés  | Nom, prénom | Rôle(s) |
| :--- | :--- | :--- | :--- |
| Anthony253400 | Anthony Miranda | Miranda Anthony | Git manager|
| Nina253 | Nina | Valentin Nina | mise en place de la CI, configuration du linter (ESLint/Prettier) et validation des règles d'architecture et des PR |
| noahchrgs | noahchrgs | Chayrigues Noah | Skills agent developers|
| ArthY07 | Arthur Feschet | Feschet Arthur | Lead G5, CI/CD, Qualité & Automatisation |
| GEstevezMeyer | GEstevezMeyer | Estevez Gabriel | Test unitaire et worflows |
