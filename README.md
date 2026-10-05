# Casino Fantôme

> **Squelette de l'architecture technique** — 100 % front-end (React + Vite + JavaScript).

Ce dépôt contient le **socle** du projet « Casino Fantôme » : l'arborescence,
le **Core en mocks** qui valide les contrats d'architecture, la façade
`coreService`, la configuration de base et la CI.

> ⚠️ **Aucune fonctionnalité métier n'est implémentée** à ce stade
> (pas de jeux, pas d'économie réelle, pas de XP, pas d'IA, pas de backend).
> L'objectif est de préparer le terrain pour les différents groupes.

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
| `core/rng.js` | `roll(gameId, params)` — **seule source de hasard** |
| `core/economy.js` | `play()`, `getBalance()`, `claimDailyBonus()`, `requestLoan()` |
| `core/progression.js` | `addXP()`, `getLevel()`, `getUnlockedGames()`, `getLeaderboard()`, `getHistory()` |
| `core/config/games.config.js` | 10 jeux + niveaux de déblocage, `setGameConfig()`, `getGlobalStats()` |
| `core/storage.js` | `exportSave()`, `importSave()` (hash placeholder documenté) |
| `core/core.js` | **API publique** du Core (ré-exports) |

**Règle absolue du RNG :** `rng.js` est la seule source de hasard. Aucun fichier
de jeu n'utilise `Math.random()` directement. `roll()` ne produit que des
résultats **bruts** : elle ne détermine jamais si le joueur gagne ou perd.

### Persistance locale

Clé principale : `casino_state`. Le schéma complet est documenté dans
`src/core/state.js`.

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
  - algorithme définitif (actuellement un placeholder FNV-1a documenté)
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

## CI

`.github/workflows/ci.yml` : à chaque push / Pull Request, installe les
dépendances, lance le build et les tests. Échoue si le build ou les tests échouent.

## Hors périmètre (à ce stade)

Pas de jeux, pas de règles de blackjack / roulette / slots / poker, pas
d'économie réelle, pas de système XP complet, pas d'IA, pas d'API externe,
pas de backend, pas de base de données, pas d'authentification, pas
d'interface graphique avancée, pas de bibliothèques inutiles.

## Membres par groupe

### Groupe Enseignant — Encadrement et Suivi Pédagogique
| Pseudo Github | Liste Pseudos utilisés  | Nom, prénom | Rôle(s) |
| :--- | :--- | :--- | :--- |
| maximiliense | maximiliense | Servajean, Maximilien | teacher |

### Groupe 1 — Core Engine / Logiques / IA
| Pseudo Github | Liste Pseudos utilisés  | Nom, prénom | Rôle(s) |
| :--- | :--- | :--- | :--- |
| Itloow | Itloow, MJEKU OLTI | MJEKU, Olti | RNG et mélange (`rng.js` : tirages simples et pondérés, mélange, reproductibilité), contrat des cartes G1 ↔ G2 (#70) |
| ahmed-abc73 | ahmed-abc73, Ahmed Bekakria | Bekakria, Ahmed | État partagé et API du Core (`state.js`, `core.js`, coordination de `coreService.js`), tests d’isolation de l’état et coordination des interfaces G1 |
| Amina1203 | Amina1203, Amina Boudaouine | Boudaouine, Amina | Économie du Core (`economy.js` : validation des mises et calcul des règlements) |

### Groupe 2 — Jeu et règles du jeu
| Pseudo Github | Liste Pseudos utilisés  | Nom, prénom | Rôle(s) |
| :--- | :--- | :--- | :--- |
| Donia-alfonsi | Alfonsi Donia | Alfonsi Donia | moteur de cartes partagé, constructeur de paquet |
| Zelyx21 | Clem, Zelyx21 | Beaulieu, Clémentine | créer le socle commun, se coordiner avec les autres groupes |
| raphoulefoufou | raphoulefoufou | Capristo,Raphaël | création jeu de dés,test sur ces derniers |
| camilhamdach5-byte | camilhamdach5-byte, Camil-Hamdach | Hamdach,Camil | Création de la logique des jeux Blackjack, Slots et Scratch.|
| camseveyrat | camseveyrat - Camille | Seveyrat, Camille | règles et jeux : wheel + plinko |


### Groupe 3 — Rendu visuel
| Pseudo Github | Liste Pseudos utilisés  | Nom, prénom | Rôle(s) |
| :--- | :--- | :--- | :--- |
| Zozote | Enzo Nguyen | Nguyen Enzo | UI, composants communs, review |
| | | | |

### Groupe 4 — Architecture de l'application et composants annexes / Navigation
| Pseudo Github | Liste Pseudos utilisés  | Nom, prénom | Rôle(s) |
| :--- | :--- | :--- | :--- |
| FlorientMarchal | FlorientMarchal, Florient Marchal | Marchal, Florient | Prompt d'initialisation de l'architecture (avec le groupe 4), écran Profil joueur (#18), écran Classement (#35) |
| Mamadoudahirousy | Mamadoudahirousy | Sy, Mamadou Dahirou | G4-08 — Boutique, issue #20, PR #103. Écran responsive, catalogue temporaire, solde via `coreService` et gestion des états UI. Proposition de contrat Core documentée ; achats en attente du raccordement Core. |

### Groupe 5 — Gestion de projet, tests unitaires et intégration
| Pseudo Github | Liste Pseudos utilisés  | Nom, prénom | Rôle(s) |
| :--- | :--- | :--- | :--- |
| Anthony253400 | Anthony Miranda | Miranda Anthony | Git manager|
| Nina253 | Nina | Valentin Nina | mise en place de la CI, configuration du linter (ESLint/Prettier) et validation des règles d'architecture et des PR |
| noahchrgs | noahchrgs | Chayrigues Noah | Skills agent developers|
| ArthY07 | Arthur Feschet | Feschet Arthur | Lead G5, CI/CD, Qualité & Automatisation |
| GEstevezMeyer | GEstevezMeyer | Estevez Gabriel | Test unitaire et worflows |
