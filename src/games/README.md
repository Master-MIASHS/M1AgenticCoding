# Groupe 2 — Jeux et règles du jeu

Le G2 décide **ce qui se passe** dans une partie : règles de chaque jeu,
orchestration d'une partie et appels au Core. Le G3 décide **comment ça
s'affiche**, le G1 fournit le hasard et règle le solde et l'XP.

## Périmètre

| | Dossiers |
| --- | --- |
| **Autorisé (G2)** | `src/games/` (règles, orchestrateur, utilitaires cartes) · `tests/unit/` pour nos fichiers · `tests/integration/g2/` · `tests/fixtures/g2/` |
| **Interdit** | `src/core/` (G1) · `src/game-ui/` (G3) · `src/app/`, `src/pages/`, `src/components/`, `src/layouts/` (G4) · `docs/contracts/` (G5 + G1, via issue) |

Règles qui s'appliquent à tout le dossier :

- **Aucun hasard ici** : pas de `Math.random()`, aucun appel au Core dans un
  `rules.js`. Seul l'orchestrateur demande un tirage au Core, via
  `coreService`.
- **Règles pures** : un `rules.js` reçoit un tirage brut et renvoie un
  résultat, sans effet de bord.
- **Aucune valeur de réglage en dur** : gains et probabilités viennent de la
  `config`.
- **Le G2 ne dessine rien** : on renvoie des données (`gameResult`,
  `renderPayload`), jamais de texte d'affichage.

## Organisation

```
src/games/
  _template/createGame.js   orchestrateur générique, commun aux 10 jeux
  _template/mockRules.js    règles factices pour tester l'orchestrateur
  cardUtils.js              cartes { rank, suit }, totaux, mains de poker
  <jeu>/rules.js            règles pures d'un jeu (resolve, ou start / step)
```

Identifiants des jeux (ceux de `games.config.js`) : `slots`, `dice`,
`scratch`, `blackjack`, `wheel`, `roulette`, `baccarat`, `plinko`,
`video-poker`, `poker`.

## Ce que le G2 fournit aux autres groupes

| Pour | Quoi | Comment s'en servir |
| --- | --- | --- |
| G3 (rendu en jeu) | `start(bets)` / `action(sessionId, playerAction)` de chaque jeu | skill [`jeux-g2`](../../.agents/skills/jeux-g2/SKILL.md) |
| G4 (application) | les identifiants de jeux et la forme de la `config` par jeu | skill [`jeux-g2`](../../.agents/skills/jeux-g2/SKILL.md), issue #122 |

Référence complète : contrat G2 (issue #68, version consolidée), à proposer
dans `docs/contracts/g2-jeux.md` via G5.

## Membres

| Pseudo | Nom, prénom | Rôle |
| --- | --- | --- |
| @fcassius | FELIHO Cassius | Référent intégration / documentation du G2 : contrats G2 ↔ G1 / G3 / G4, cohérence des formats, mocks et fixtures, tests d'intégration, orchestrateur (#136) |
| @Zelyx21 | Clémentine B. | Orchestrateur générique (#91) · vidéo poker |
| @Donia-alfonsi | Donia A. | Utilitaires cartes (#67, #120), constructeur de paquet (#102) · blackjack |
| @camseveyrat | Camille S. | Roue et plinko (#26, #128) · roulette |
| @camilhamdach5-byte | Camil H. | Slots et cartes à gratter (#31) · baccarat |
| @raphoulefoufou | Raphaël C. | Dés (#24) · poker (contrat IA avec G1) |

Chacun peut corriger sa ligne (nom complet, rôle).
