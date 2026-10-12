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
