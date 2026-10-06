# Casino Fantôme — Contexte commun des agents

> Fichier lu au début de chaque session. Maintenu par le Groupe 5 : toute modification passe par une PR relue par un humain du G5.

## Rôles des agents

Casino Fantôme est un projet étudiant où le code est écrit par des agents IA supervisés par environ 25 étudiants. **Chaque membre crée son propre agent** pour la tâche qui lui est assignée.

Ce fichier est lu par **tous les agents** du projet. Toutes les sections s'appliquent à tous, sauf les deux ci-dessous, qui dépendent de ton rôle.

### Si tu es l'agent général (le guide)

Ton rôle est de **guider les agents personnels** pour qu'ils aient le contexte du projet, pas de coder à leur place :

1. **Identifier** la personne, son groupe et le ticket de sa tâche. S'il n'y a pas de ticket, demander à G5 d'en créer un.
2. **Transmettre le contexte utile** : invariants métier, règles absolues, périmètre du groupe, contrats concernés, skills utiles et décisions ouvertes qui touchent la tâche. Seulement ce qui la concerne.
3. **Aider à créer son agent** en suivant « Contenu obligatoire d'un agent personnel ». Tu peux proposer un brouillon ; la personne le relit, l'adapte et en reste propriétaire.
4. **Vérifier la cohérence** : l'agent reste dans le périmètre de son groupe et ne contredit aucune règle absolue.
5. **Remonter à G5** : tâches qui se chevauchent (plusieurs personnes sur les mêmes fichiers), contrat à faire évoluer, décision ouverte bloquante.

Tu ne codes pas la tâche d'un membre et tu ne modifies jamais l'agent d'une autre personne.

### Si tu es l'agent personnel d'un membre

Tu travailles pour **une personne** et **une tâche** (un ticket). Tu restes dans le périmètre de son groupe, tu respectes les règles absolues et tu suis le « Workflow d'une tâche ». Si ta tâche dépend d'un autre groupe ou d'une décision ouverte, tu t'arrêtes et tu le signales.

## Le jeu en bref

Simulateur de casino **100 % fictif**. Le joueur reprend un vieux casino fermé depuis des années, démarre avec un capital de jetons fictifs et cherche à le faire grossir. Aucun vrai argent, nulle part.

### Invariants métier (ne jamais casser)

- **Solde et progression sont indépendants.**
  - Le solde de jetons monte et descend selon les gains et les pertes.
  - L'XP et le niveau **ne redescendent jamais**. L'XP se gagne à chaque partie jouée, gagnée ou perdue. Elle sert uniquement à débloquer des jeux et des salles.
- Un joueur ruiné garde son niveau et ses jeux débloqués.
- Le **meilleur solde atteint** est le score du classement. Il ne redescend jamais, même si le solde actuel baisse.
- Un joueur n'est **jamais bloqué** à 0 jeton : un mécanisme de relance existe (voir « Décisions ouvertes »).
- Pas de multijoueur en temps réel : le poker et le bingo se jouent contre des bots.

### Glossaire

| Terme | Sens |
|---|---|
| Jetons | Monnaie fictive du jeu |
| Solde | Jetons possédés actuellement |
| Capital de départ | Solde d'un nouveau joueur (défaut : 1000, configurable par l'admin) |
| Meilleur solde | Solde le plus haut jamais atteint ; c'est le score du classement |
| XP / niveau | Progression permanente, débloque jeux et salles |
| Salle | Zone du casino débloquable par niveau |
| Faillite | Solde tombé à 0 |
| Badge | Trophée affiché au classement (ex. « 1000 parties jouées », « A survécu à la faillite 5 fois ») |

### Jeux (niveaux par défaut, configurables par l'admin)

| Jeu | Type | Débloqué |
|---|---|---|
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

- **Joueur** : jouer aux jeux débloqués, voir ses stats, consulter le classement, dépenser ses jetons en boutique.
- **Modérateur** : joueur + gérer les signalements, voir les comptes suspects, désactiver un compte pour triche.
- **Admin** : modérateur + configurer les jeux (probabilités de gain, seuils de déblocage), ajuster le capital de départ, lancer des évènements bonus, consulter le dashboard de stats globales.

### Classement

Affiche pour chaque joueur : pseudo, meilleur solde atteint, niveau, badges.

## Stack et commandes

JavaScript : React + Vite (front), Node (back). CI : `ci.yml` dans `.github/workflows/`.

<!-- G5 : vérifier ces commandes dans package.json -->
- Installer : `npm install`
- Lancer : `npm run dev`
- Tests : `npm test`
- Lint : `npm run lint`

## Groupes et périmètres

Chaque tâche appartient à **un seul** groupe. Un agent ne modifie que les fichiers du périmètre de son groupe.

| Groupe | Périmètre | Préfixe des agents |
|---|---|---|
| G1 — Core Engine | Moteur, règles communes, gestion de l'état, RNG, calculs, IA des bots, XP, solde, sauvegarde, **API publique stable**. Aucune UI. | `g1-` |
| G2 — Jeux | Implémentation de chaque jeu et de ses règles propres, orchestration des parties, appels au Core. Travaille sur le **mock du Core** tant que l'API n'est pas intégrée. | `g2-` |
| G3 — Rendu visuel | Affichage en jeu, animations, effets visuels, composants graphiques, UI de jeu. Adapte le rendu aux résultats fournis par le Core. Travaille sur des **données mock**. | `g3-` |
| G4 — Application | Architecture globale, navigation et routing, composants communs, lobby, profil, progression, classement, boutique, statistiques, administration (si confirmée), intégration de l'API publique du Core. | `g4-` |
| G5 — Qualité et intégration | Organisation, Git et branches, intégration, CI/CD, tests unitaires et d'intégration, vérification des contrats, tickets, releases, conflits, qualité du code. | `g5-` |

Frontières :
- G2 décide **ce qui se passe** dans un jeu ; G3 décide **comment ça s'affiche**.
- G3 gère les écrans **en jeu** ; G4 gère tout ce qui est **hors jeu** (le lobby est entièrement G4).
- G2, G3 et G4 n'utilisent le Core que via son **API publique**, jamais via ses fichiers internes.

<!-- G5 : ajouter ici le dossier de chaque groupe quand l'arborescence est fixée -->

### Référents humains

La composition détaillée de chaque groupe, les responsabilités exactes de chacun et les pseudos GitHub associés se trouvent **dans le fichier `README.md` (section "Membres par groupe")**. 
Tout agent doit s'y référer pour savoir avec qui il collabore et connaître les limites strictes de son périmètre.

## Règles absolues

1. **Aucun vrai argent** : pas de paiement, pas d'achat réel, pas de conversion entre jetons et argent.
2. **Pas de `Math.random()`** : tout tirage aléatoire passe par le RNG du Core (G1).
3. **L'UI ne décide jamais d'un résultat.** Le résultat d'une partie est calculé par la logique (G1/G2) ; G3 et G4 l'affichent.
4. **Aucune valeur de réglage en dur** : capital de départ, seuils de déblocage, probabilités de gain et gains d'XP se lisent dans la configuration.
5. **Les permissions se vérifient côté serveur/Core**, pas seulement en masquant un bouton.
6. **Contrats** (`docs/contracts/`) : jamais modifiés par un agent. Si un changement est nécessaire, ouvrir une issue pour G5 et G1.
7. **Branches** : toute création de branche passe par `branch-creator`. Jamais de push direct sur `main`.
8. **Aucun agent ne merge** : tu ouvres des PR, un humain relit et merge.
9. **Portée minimale** : une tâche = une modification ciblée. Pas de refonte ni de « nettoyage » non demandé.
10. **En cas de doute, tu t'arrêtes et tu demandes.** Tu n'inventes jamais une règle de jeu ni une décision ouverte.

## Agents personnels

### Contenu obligatoire d'un agent personnel

<!-- G5 : préciser le dossier où sont rangés les agents -->
- **Nom** : `<préfixe du groupe><prénom>-<tâche>` (ex. `g2-camille-blackjack`).
- **Description** : la tâche en une phrase et le numéro de ticket.
- **Première instruction** : lire `AGENTS.md` avant toute action.
- **Périmètre** : dossiers autorisés et dossiers interdits.
- **Skills** utilisées.
- **Compte rendu attendu** à la fin de chaque tâche : fichiers modifiés, tests lancés et résultat, points bloquants.

Chaque agent personnel appartient à la personne qui l'a créé.

### Workflow d'une tâche

1. **Brancher** : créer la branche via `branch-creator`.
2. **Travailler** uniquement dans le périmètre du groupe.
3. **Vérifier** : tests et lint au vert, contrats respectés, invariants métier intacts.
4. **Livrer** : PR liée au ticket, avec le compte rendu. Relecture humaine obligatoire.

### Dépendances entre groupes

Les agents ne se coordonnent pas directement entre eux. Si une tâche a besoin de quelque chose d'un autre groupe (fonction de l'API du Core, composant, donnée) :

1. Ne pas le coder à la place de l'autre groupe.
2. Ouvrir une issue avec le label du groupe concerné (`groupe: G1` à `groupe: G5`), le besoin précis et le ticket lié.
3. Continuer avec un mock si c'est possible ; sinon, s'arrêter et le signaler à G5.

## Définition de « terminé »

- Tests écrits ou mis à jour, et au vert.
- Lint et CI au vert.
- Contrats respectés.
- PR ouverte, liée au ticket, en attente de relecture humaine.

## Skills

Les skills sont dans le dossier `.agents/skills/` . N'ouvre une skill **que** si la tâche en a besoin.

| Skill | Quand l'utiliser |
|---|---|
| `branch-creator` | Créer n'importe quelle branche (obligatoire avant de développer une feature) |
| `flux-git-et-versionnement` | Avant une branche, un commit ou une PR : format strict des commits, hygiène pré-commit |
| `expert-git-commit-push` | Préparer le staging, le message de commit et le push d'une branche |
| `ci-cd-et-automatisation` | Quality Gate (`npm ci`, lint, test, build), échec CI, modification d'un workflow |
| `composants-communs-g4` | Création et maintenance des composants UI partagés (G4) |
| `dev-par-les-tests` | Méthodologie TDD pour la logique métier et les correctifs |
| `expert-tests-node` | Écrire ou revoir des tests unitaires avec le runner natif `node --test` |
| `flaky-test-detector` | Test instable ou CI intermittente (G5) |
| `bugfix` | Corriger un bug à partir d'une issue GitHub (reproduire d'abord) |
| `feat-dev` | Workflow complet pour implémenter une feature non triviale |
| `expert-javascript` | Logique métier JavaScript pure, asynchrone, refactorisation de modules |
| `expert-react` | Création ou refactorisation de composants React (UI sans logique métier) |
| `expert-vite` | Modifier `vite.config.js` ou les variables d'environnement |
| `expert-securite-frontend` | Revue de sécurité front : XSS, stockage local, validation des entrées |
| `frontend-design` | Direction visuelle, typographie et refonte d'interface |
| `composants-communs-g4` | Afficher niveau, solde, XP, carte de jeu, modale, notification, loader, en-tête joueur ou sidebar (G3,G4) |
| `game-ui` | Développer l'interface des jeux du casino dans /src/game-ui/ |
| `architecte-integration` | Tâche touchant une frontière entre groupes, l'API publique du Core ou un contrat (avant PR) |
| `changelog-generator` | Compiler les PR mergées en changelog avant une release (G5) |
| `audit-activite-projet` | Audit en lecture seule de l'activité GitHub d'un utilisateur ou du projet (G5) |
| `ingenierie-ui-frontend` | Créer ou modifier un composant React : séparation UI/métier via `coreService.js`, hooks, cleanup |
| `utiliser-core` | Utiliser une fonction du Core (état, RNG, sauvegarde) depuis G2/G3/G4 via coreService |
| `jeux-g2` | Implémentation des règles et de la logique des jeux (G2) |
| `pages-et-routage-g4` | Gestion des pages et de la navigation de l'application (G4) |
| `jsdoc-et-documentation` | Documenter en JSDoc les fonctions de `src/core/` et `src/services/` |
| `systematic-debugging` | Bug, test en échec ou comportement inattendu : cause racine avant tout correctif |
| `verification-before-completion` | Avant d'affirmer qu'une tâche est finie ou que les tests passent : exécuter et lire les preuves |
| `prepare-pr` | Préparer le titre et le corps d'une Pull Request GitHub |
| `pr-checklist` | Vérifier la « Définition de terminé » juste avant d'ouvrir une PR |
| `requesting-code-review` | Demander une relecture (fin de tâche, avant merge) via un sous-agent relecteur |
| `receiving-code-review` | Traiter les retours d'une relecture : vérifier avant d'implémenter, contester si besoin |
| `relecture-et-qualite` | Relire une PR : 4 axes d'analyse, code mort, classement [CRITIQUE]/[REQUIS]/[SUGGESTION] |
| `resolving-merge-conflicts` | Résoudre un conflit de merge ou de rebase en cours |
| `test-coverage-report` | Bilan de couverture de tests par groupe avant une release (G5) |
| `skills-structure-validator` | Valider l'arborescence et le frontmatter des skills lors d'une PR de skill (G5) |
| `pr-validation` | Valider une PR selon les critères du projet |

Si une skill nécessaire n'existe pas, ne l'invente pas en cours de tâche : signale le manque dans la PR.

### Proposer une nouvelle skill

- Critère : la même instruction a dû être répétée sur 2 ou 3 tâches.
- La skill est ajoutée dans `.agents/skills/` via une PR vers la branche `skills`, jamais dans une branche de fonctionnalité.
- Aucun agent ne merge une skill : G5 relit, merge et met à jour le tableau ci-dessus.

## Décisions ouvertes (ne pas trancher seul)

- Relance à 0 jeton : bonus quotidien **ou** prêt avec intérêt fictif ?
- Le solde peut-il passer sous 0 ?
- XP gagnée par partie (identique pour tous les jeux ?) et courbe de niveaux.
- Contenu de la boutique.
- Liste des salles et niveaux de déblocage.
- Contenu des évènements bonus.
- G4-10 Administration : confirmée ou non.

Si une tâche dépend d'un de ces points : stop, question à G5. Une fois le point tranché, G5 le déplace dans la section concernée.
