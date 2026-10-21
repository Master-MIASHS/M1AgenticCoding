# Contributions par étudiant — Casino Fantôme

## G1 — Core Engine

### MJEKU Olti (`Itloow`)

Il a produit le plus gros volume du dépôt : 24 PR fusionnées, 165 commits et environ 3 000 lignes de tests. Il a livré le RNG et le contrat des cartes (#28, #167, #76) ainsi que l'IA des bots de poker (#264). Il a aussi réalisé la boutique côté Core (#206), utilisée par la page Boutique, et les événements bonus appliqués dans `play()` (#225). Il a lancé la discussion #9 et rédigé une liste de 40 tâches. Beaucoup de ses modules (profil, badges, historique, bonus quotidien, capital réglable, réglages admin) n'ont aucun appelant dans l'interface. Sa PR de modération a été fermée sans fusion. Il est intervenu hors de son rôle, dans `core.js`, la progression et le classement. Il a modifié le contrat `core-api.md` (#268) malgré la règle 6. Il a écrit de longs commentaires de coordination, qui n'ont pas abouti aux décisions attendues. Environ 41 % de son code touche d'autres domaines, et la courbe d'XP n'a pas été traitée.

### Bekakria Ahmed (`ahmed-abc73`)

Il a livré l'état partagé atomique et sa restauration (#139, #144). Il a aussi réalisé les sauvegardes sans profil, la sécurisation du profil et le seuil d'XP public. Ses tests d'isolation de l'état représentent 1 220 lignes, et le travail technique est correct et testé. L'état a toutefois été livré le 06/10, alors qu'il bloquait l'économie et l'XP. Il était annoncé coordinateur de `core.js` et `coreService.js`, mais Itloow y a ajouté lui-même ses exports. Il a posté 43 commentaires, longs et nombreux, dont certains semblent produits sans relecture attentive. Il a reconnu avoir une réponse non publiée dans #131 et #61. Environ 57 % de ses lignes touchent d'autres domaines (docs et skills). Sa coordination n'a pas produit de décisions, et les tickets #122 et #218 restent ouverts.

### Boudaouine Amina (`Amina1203`)

Elle a conçu et livré le morceau le plus difficile du Core : le règlement économique `play()`. Il est atomique, gère les mises multiples et est idempotent par `roundId` (#111, #135, #287). Elle a écrit 354 lignes de tests dans `economy.test.js`. Elle a négocié le format de l'historique avec Reda (#131). Elle a relancé plusieurs fois les autres pour obtenir l'état persistant. Elle a fait 15 interventions de discussion utiles, 39 commentaires d'issues. Son travail est resté dans son périmètre, bien testé et réellement utilisé. Sa fonction n'est branchée que pour deux jeux, à cause d'une limite d'intégration externe. Ses notes sont élevées sur presque tous les axes (4-5).

### NAFIA Mohamed Reda (`nafiamedreda`)

Il a développé l'XP et les niveaux (#79, #144) ainsi que l'historique. Il a aussi écrit la validation de la configuration des jeux (#265). Son travail est rigoureux, mais peu a été livré. La courbe d'XP est restée `TEMPORAIRE` avec 5 niveaux, si bien que 7 jeux ne se débloquent jamais. Plusieurs modules de progression se recoupent. Une partie de son périmètre (classement, progression) a été reprise par Itloow sans arbitrage. Il a négocié les formats avec Amina (#131) et posté 42 commentaires. Il a reconnu un retard dans la répartition du travail.

### Aït Cherif Ania (`ania-aitcherif`)

Elle a livré la sauvegarde et la restauration avec hash FNV-1a (#130, #132). Elle a aussi réalisé les seuils de déblocage réglables (#137) et un test de conformité des cartes. Sa première PR (#80), visant `develop`, a été remplacée par #130. Elle a tenu son périmètre avec un haut niveau de test. L'export/import n'a toutefois aucune interface et n'est pas branché. Elle a laissé peu de traces de coordination, avec seulement 5 commentaires d'issues et 6 interventions de discussion. Elle a 10 PR fusionnées et 13 commits sur `main`.

## G2 — Jeux

### Feliho Cassius (`fcassius`)

Il a construit l'orchestrateur : `start/action` (#136), tirage injectable (#141), `view()` (#168), vérification du solde (#199), `roundId` (#311) et catalogue (#414). Il a rédigé le contrat #68 et les tests de montage (#84). C'est le plus actif de G2 en coordination, avec 97 commentaires d'issues et 18 en discussion. Son travail d'intégration est le plus utile du groupe, avec des décisions de contrat claires. Le catalogue n'est pas consommé, car il a été fusionné une heure avant la fin. Le ticket #68 reste ouvert et une partie de l'orchestrateur de Zelyx21 a été remplacée. Il a aussi une part notable de skills et de docs hors périmètre (5 PR de skills).

### Beaulieu Clémentine (`Zelyx21`)

Elle a livré quatre jeux complets avec critères d'acceptation et tests : vidéo poker (#204), Memory (#300), Quiz (#302) et Bingo (#310). Elle avait aussi écrit l'orchestrateur initial (#91), largement réécrit ensuite par fcassius. Ses jeux sont bien cadrés, mais livrés tard et non branchés dans l'application. L'issue #11 (mock du coreService) reste ouverte. Son rôle de coordination indiqué au README est peu visible dans les traces. Elle a fait 16 commentaires d'issues et 15 interventions de discussion. Sa PR #81 n'a pas été fusionnée.

### Seveyrat Camille (`camseveyrat`)

Elle a livré la roue et le plinko (#128, #320) et la roulette (#233, #321), qui est branchée. Elle a aussi réalisé le paytable (#337, #366). Elle a posé la question de contrat #122 et détecté le bug de l'As du baccarat (#420). Sa coordination avec G1 est utile, avec 31 commentaires d'issues. C'est, avec slots, la seule contribution G2 de jeu réellement branchée. Elle a découpé un même sujet en micro-tickets (#367 à #370). Son travail est régulier et validé, avec 8 PR fusionnées et 16 commits.

### Alfonsi Donia (`Donia-alfonsi`)

Elle a bâti le moteur de cartes (#67, 800 lignes) et le paquet (#169). Elle a aussi réalisé le blackjack (#203, 941 lignes dont 440 de tests) et son montage (#301). Cette fondation est utilisée par les jeux de cartes. Elle est bien testée et reste dans le périmètre. Le blackjack n'est toutefois pas branché dans l'application. Elle a fait 20 commentaires d'issues, 11 interventions de discussion. Elle a 6 PR fusionnées et 16 commits. Ses notes sont de 4 sur presque tous les axes, avec une confiance élevée.

### Capristo Raphaël (`raphoulefoufou`)

Il a réalisé les dés et le craps (#140, #342), l'évaluation des mains (#319) et le moteur de poker (#334, 1 601 lignes). C'est le travail le plus difficile du groupe. Le poker reste partiel (#413, test `todo`) et l'issue #24 est ouverte. Ses grosses PR ont été fusionnées vite. Il n'a créé qu'une seule issue. Il a fait 24 commentaires d'issues et 10 interventions de discussion. Il a 4 PR fusionnées et 5 commits.

### Hamdach Camil (`camilhamdach5-byte`)

Il a livré les slots (#216, branché), les cartes à gratter et le baccarat (#391). Le baccarat a été fusionné le dernier matin, hors catalogue, avec un bug sur l'As. Son correctif (#430) a été fermé. Il a laissé peu de traces de coordination, avec 9 commentaires d'issues et 5 interventions de discussion. Il a 2 PR fusionnées et 10 commits. Il livre deux jeux fonctionnels, dont un branché.

## G3 — Rendu visuel

### Ali Bahar Ali (`bahar487`)

Il a livré 12 UI de jeux : slots (#92), roulette (#98), roue (#193), plinko (#279), dés (#286), scratch (#358), blackjack (#360), vidéo poker (#362), memory (#380), quiz (#383), bingo (#385) et baccarat (#417). Il a aussi réalisé le BetPanel et 2 skills, et aligné ses UI sur le contrat G2 à plusieurs reprises. Il porte quasiment seul le groupe, avec des UI cohérentes et accessibles. Le poker est absent, le baccarat n'est pas monté et 10 UI restent en démonstration. Il n'y a aucun test de rendu et `maxBet` est en dur. Il a fait 31 interventions de discussion et coordonné avec G2, G4 et G5. Il a 23 PR fusionnées, 45 commits.

### Nguyen Enzo (`Zozote`)

Ses traces visibles sur GitHub sont très limitées : 2 commits README et aucune PR. Il a fait des propositions de fond dans la discussion #10 (périmètre, séparation état/visuel). Elles ont été reprises dans la skill `game-ui`. Il a environ 11 interventions de discussion. Il n'a créé aucune issue. Les traces sont insuffisantes pour conclure et le niveau de confiance est faible. Un travail hors GitHub n'est pas visible.

## G4 — Application

### Marchal Florient (`FlorientMarchal`)

Il porte l'essentiel de la livraison de G4. Il a réalisé le profil (#101), le classement (#100, #148) et les composants communs. Il a aussi livré la page de jeu (#175, #397), le lobby (#165) et le verrou de page (#416). Il a fait 24 PR fusionnées, 22 issues et 37 interventions de discussion. Il coordonne G4 avec un bon suivi de process. Le classement n'affiche qu'un seul joueur et les composants communs ne sont jamais montés. Il a écrit des skills hors périmètre (#152) et créé des micro-tickets. Son lobby est en doublon avec celui de Lona.

### Rayid Ahamada Rachid (`rayidahamada`)

Il a réalisé l'écran Statistiques connecté au Core (#63, #330, #408). Sa contribution est modeste mais réelle et intégrée. Il a 3 PR fusionnées, 3 issues et 5 commits. Il a fait 5 commentaires d'issues et 9 interventions de discussion. Aucun point incomplet n'est signalé. Ses notes sont autour de 3, avec une difficulté de 2.

### Sy Mamadou Dahirou (`Mamadoudahirousy`)

Il a réalisé la boutique complète : états, erreurs, catalogue vide et achat via le Core (#103, #406). Il a aussi documenté le contrat Core. L'écran est validé, réellement utilisé, difficile (4/5) et bien testé. Il n'a que 2 PR fusionnées et une issue. Il a fait 3 commentaires d'issues et 4 interventions de discussion. Ses notes sont de 4 sur presque tous les axes et sa confiance est élevée. Sa participation à la coordination reste limitée, mais son livrable est solide.

### BA Kardiatou (`Kardiatou102`)

Elle a posé le squelette d'architecture et livré l'écran Progression (#46, #154). Elle a aussi fusionné un Admin partiel (#194). Son admin complet (#269), avec évènements bonus, capital et modération, a été fermé sans fusion. L'admin n'est pas routé et n'est donc pas accessible dans l'application. Son travail est difficile mais son résultat n'est pas visible. Elle a fait 18 commentaires d'issues et 15 interventions de discussion. Elle a 3 PR fusionnées, 6 issues et 9 commits.

### ADELL Lona (`LonaAdell`)

Elle n'a qu'un commit README et aucune PR ni issue. Le ticket Lobby G4-04 lui était associé. Le lobby a été livré par Florient, ce qui crée un doublon. Elle a une seule intervention de discussion. Les traces sont insuffisantes et la confiance est faible. Son évaluation est jugée non concluante. Plusieurs axes sont notés « indéterminé ».

### Trocellier Stacy (`stacytrocellier48-ux`)

Elle a réalisé la Navbar et le MainLayout (#74) et la XPBar (#77). Elle a aussi livré Modal, Notification et Loader (#104), avec documentation et tests. Ses composants sont propres et testés. Ils ne sont toutefois jamais montés dans l'application, et la Navbar n'est pas testée. Elle a fait 12 commentaires d'issues et 12 interventions de discussion. Elle a 3 PR fusionnées, 4 issues et 5 commits. Sa qualité technique est notée 4/5 mais l'usage visible est nul.

## G5 — Qualité et intégration

### Miranda Anthony (`Anthony253400`)

Il a créé la skill `branch-creator` (#39) et la liste des skills dans AGENTS.md (#246). Il a aussi automatisé les références (#411). Il a fusionné 56 PR et assure une part essentielle du gatekeeping du projet. Il a environ 110 revues, dont 109 approbations sans texte, ce qui empêche de vérifier la profondeur de lecture. Il travaille sous une charge très lourde, avec un outillage plus léger que celui de G1. Quatre de ses PR ont été fermées et les branches `Group5-issue-watcher` et `Group5-test` n'ont pas été fusionnées. Il a fait 41 commentaires d'issues et 9 interventions de discussion.

### Valentin Nina (`Nina253`)

Elle a mis en place la CI initiale (#37, #53, #86) et les skills Commit/Push et validation de PR (#71, #202). Elle a aussi lancé la discussion #14 et fait des arbitrages (#122). Elle a fusionné 73 PR, soit le plus grand volume de gatekeeping. Elle a 139 approbations sans texte, donc sans trace de lecture, mais sous une charge écrasante. Sa contribution technique visible est faible. L'ESLint que le README lui attribue est en fait d'ArthY07 (#51). Elle a fait 24 commentaires d'issues et 11 interventions de discussion.

### Chayrigues Noah (`noahchrgs`)

C'est la contribution la plus complète de G5. Il a écrit AGENTS.md (#45) et mis en place la CI et le déploiement (#121, #200, #289). Il a organisé la recette du site (#290 à #293) et l'intégration slots/roulette (#296). Il a ouvert 19 issues, dont les issues d'amélioration #421 à #429. Il a donné 56 revues commentées avec des refus motivés, la relecture la plus substantielle du dépôt. Il a fait 68 commentaires d'issues et des retours détaillés aux quatre autres groupes. Sa PR #296 a été auto-fusionnée avec une CI rouge, et la page de jeu est restée cassée environ une heure (#407). Les tickets #424 à #429 ont été ouverts le dernier jour.

### Feschet Arthur (`ArthY07`)

Il a mis en place ESLint, Prettier et les règles `Math.random`/Core (#51, #54). Il a aussi migré les skills vers `.agents/skills` (#47) et créé des skills DevOps (#40). Il a rédigé le README d'avancement (#390). Il a fusionné 36 PR et donné 44 revues avec corps. Il a revu les contrats de G2 et fait 27 interventions de discussion. Ses décisions structurantes sont de qualité. Le Quality Gate reste non bloquant (#64). Il a modifié le contrat `core-api.md` (#333), contre la règle 6. Son README déclare les jeux « validés » alors que 2 sur 13 seulement sont jouables.

### Estevez Gabriel (`GEstevezMeyer`)

Il a livré le lot initial de skills (#55), la skill `git-governance` et un test E2E (#343). Il a aussi produit un diagnostic pertinent des contradictions entre skills (#213). Les tests unitaires et les workflows prévus par son rôle au README n'ont pas été livrés. Le test E2E est à refaire (#429). Neuf de ses 11 PR ont été fermées, à cause de branches contaminées. Il n'a que 2 PR fusionnées. Il a fait 25 commentaires et aucune revue. Il y a peu de livrables intégrés.
