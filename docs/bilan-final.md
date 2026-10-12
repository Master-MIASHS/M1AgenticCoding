# Bilan final — Casino Fantôme (branche FINISH)

## État initial

- Branche `FINISH`, SHA de départ `eea911f`. Node v26.7.0 (tests lancés avec `NODE_OPTIONS=--no-experimental-webstorage`).
- `npm ci` OK ; `npm run lint` : 0 erreur, 4 warnings ; `npm test` : 1209 tests, 1208 pass, 0 fail, 1 todo (poker #413) ; `npm run build` OK (393 kB JS).
- Aucune PR ouverte à l'état initial : #342 (dés) déjà fusionnée, #394 (UI poker) fermée et conflictuelle, #355 (modération) fermée avec CI en échec.

### Jeux

| Jeu | Règles | Tirage | UI | Branché Core (gameRuntime) | Jouable |
|---|---|---|---|---|---|
| slots | oui | oui | oui | oui | oui |
| roulette | oui | oui | oui | oui | oui |
| dice, scratch, wheel, plinko | oui | oui | oui | non | non (démo) |
| blackjack, video-poker, memory, quiz, bingo | oui | oui | oui | non | non (démo) |
| baccarat | oui (As = 0, bug #420) | oui | UI présente, non montée | non (absent du catalogue) | non |
| poker | oui (bug #413) | oui | aucune | non | non |

Jouables : 2/13.

### Pages
Lobby, Jeu, Profil, Progression, Boutique, Statistiques, Classement (entry.balance, sans badges) : présents. Historique : « disponible prochainement ». Admin : non routée. Aucun écran de sauvegarde.

### Issues ouvertes (priorité)
1. #290, #293, #68, #292, #413, #420, #377 : jeux jouables / sécurité play().
2. #258, #256, #122, #352/#354 : sauvegarde, configs, modération.
3. #242, #421, #422, #427, #429 : fiabilité CI.


---

## Bilan final

SHA de départ `eea911f` (branche `FINISH`). SHA final : voir `git log -1` (dernier commit de la branche, rien n'a été poussé).

### Avant → après

| | Avant | Après |
|---|---|---|
| Tests (`npm test`, Node 26 avec `--no-experimental-webstorage`) | 1209 (1208 pass, 1 todo) | 1247 (1247 pass, 0 fail, 0 todo) |
| Lint | 0 erreur, 4 warnings | 0 erreur, 4 warnings (existants, non touchés) |
| Build | OK | OK |
| Jeux branchés sur le Core | 2/13 | 13/13 (voir réserve navigateur) |
| Pages | Historique et Admin absents, classement sur `balance` | Historique, Admin (admin seulement), Classement (meilleur solde + badges), sauvegarde dans Profil |

### Jeux

| Jeu | Règles | UI | Branché | Statut |
|---|---|---|---|---|
| slots, roulette | oui | oui | oui | jouable (config provisoire) |
| dice, scratch, wheel, plinko | oui | oui | oui | jouable (config provisoire) ; roue et plinko lisent la même config que les règles |
| blackjack, video-poker, memory, quiz, bingo | oui | oui | oui, une instance (start + action) | jouable |
| baccarat | oui, As = 1 (#420) | oui | oui | jouable |
| poker | oui, #413 corrigé | oui (reprise de #394, adaptée) | oui | jouable |

« Jouable » = prouvé par tests d'intégration avec le vrai Core (5 manches par jeu, un seul `play()` par manche, solde par différence, mise > solde refusée sans tirage). Non prouvé dans un navigateur : voir plus bas.

### Issues traitées (→ commits → tests)

- #420 → `de0fe3a` → `cardUtils.test.js` (As = 1) ; tests baccarat dont les mains utilisaient l'As comme 0 corrigés (As remplacé par 10, intention conservée).
- #413 → `de0fe3a` (le correctif a été commité dans le même commit que #420, par erreur de staging ; l'historique n'est pas réécrit) → `catalog.test.js` (60 mains, todo retiré) et 4 tests unitaires poker qui encodaient l'ancien comportement mis à jour (le bot ouvre la rue dans le même `action()`). `advanceStreet` est exportée de `rules.js` plutôt que déplacée dans `engine.js` (écart volontaire avec l'issue : `engine.js` ne peut pas importer les règles de showdown sans cycle).
- #292 → `4b153d4` → `tests/unit/play-locked-game.test.js` ; les montages G2/G5 montent le niveau via `tests/helpers/unlock-all-games.js` (updateState du niveau, aucune assertion supprimée).
- #290, #293, #68, #424, #425, #377 → `dae5890` → `game-runtime-all.test.js`, `GamePage.test.js` (plus de « Mode démonstration » ni « Bientôt » : un jeu sans moteur affiche « indisponible »). Verrou par URL conservé et testé.
- Écrans G4 (historique, classement, profil, sauvegarde, admin) → commit `feat(app)` → `History.test.js`.
- #421 (CI sur push main), #427 (`.nvmrc`, `engines`) → commit `chore(tooling)`.

PR intégrées : aucune (aucune PR ouverte ; #342 déjà fusionnée ; #394 fermée et en conflit, seul `src/game-ui/poker/` repris à la main puis adapté, `pokerDevMode` non repris ; #355 fermée avec CI en échec, non intégrée : moins prioritaire).

### Parcours vérifiés / non vérifiés

- Vérifiés : `npm run lint`, `npm test`, `npm run build` ; rendu serveur (Vite SSR) de Lobby, Profil, Progression, Statistiques, Boutique, Admin, Classement, Historique avec un profil créé (aucune erreur).
- **NON vérifiés dans un navigateur** (aucun navigateur disponible dans l'environnement) : création de profil / refus d'un mineur à l'écran, parties jouées à l'écran, montée de niveau, tomber à 0 et relance, achat boutique, export / import à l'écran (import invalide), affichage mobile 375 px, console, Admin en dev, rafraîchissement de la barre de navigation. Ces fonctionnalités sont codées et le Core est testé, mais ne doivent pas être annoncées comme vérifiées.

### Décisions provisoires

- `src/config/gamesProvisional.config.js` : valeurs de `tests/fixtures/g2/configs.js` pour 11 jeux ; roue : 8 segments et gains (rouge/noir x2, or x8) choisis pour correspondre à l'UI G3 (le fixture n'a que 2 segments). `getGameConfig` du Core ne stocke que des tables numériques : la config des règles ne peut pas encore y vivre (#122, #256).
- Config Core (setGameConfig) non branchée aux règles : pas fait faute de temps.

### Décisions non prises (hors autorité)

Relance à 0 (bonus quotidien / prêt), solde négatif, courbe d'XP, boutique, salles, évènements bonus, G4-10. Le bonus quotidien (`claimDailyBonus`) n'a pas été rendu accessible depuis l'UI : non fait.

### Points signalés

- Seuils de progression `[0, 100, 250, 500, 1000]` : niveau 5 maximum, alors que baccarat (6), plinko (7), video-poker/memory (8), quiz (9), bingo (10), poker (12) demandent plus : ces jeux sont inaccessibles en jeu normal. À trancher par G5 / G1.
- Les niveaux affichés viennent encore de `gameRegistry.js` (copie, pas les seuils réglés par l'admin) ; le verrou lui-même lit `getUnlockedGames()`.
- Proposition § 10 du contrat (validation G5 / G1, contrat non modifié) : `getEffectiveUnlockLevels()`, `getEffectiveUnlockLevel(gameId)`, `setEffectiveUnlockLevel(gameId, level)` (`src/core/config/unlock.config.js`).
- Admin : la page existante est routée uniquement pour le rôle admin (affichage ; le Core vérifie). Capital de départ, évènements bonus et `updatePlayerBalance` ne sont pas dans cet écran : non fait.
- Non fait : test E2E game-cycle en `node:test` sans XP en dur (#429), test du frontmatter des skills (#422), déploiement conditionné à la CI (#421, seulement le déclencheur CI sur push main), réglage GitHub Pages et protection de `main` (#242, #423 : réglages GitHub à faire par un humain). La base Vite est déjà `./`.
- Le résumé n'a pas été posté sur la discussion #419.

### Écarts de cadrage initial

- Les tests de montage G2 jouaient les jeux au niveau 1 : rien n'exigeait le déblocage côté Core avant #292.
- Les tests poker et baccarat figeaient les comportements contraires aux règles (As = 0, bot ouvrant la rue côté UI).
- Aucune issue pour : seuils de niveaux trop bas (jeux 6 à 12 inatteignables), Profil lisant `state.unlockedGames` et `entry.result`, absence d'écran de sauvegarde.
