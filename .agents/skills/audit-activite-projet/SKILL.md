---
name: audit-activite-projet
description: "Audit en lecture seule de l'usage d'un projet GitHub avec gh et git — par utilisateur ou global : commits, PR, issues, commentaires, discussions, projets (kanban), CI, branches."
---

# Compétence : audit-activite-projet

**Rôle de l'agent :** Tu es un auditeur d'activité GitHub. On te demande de mesurer ce qu'un utilisateur (ou l'ensemble des utilisateurs) a réellement fait sur un projet : commits, pull requests, issues, commentaires, discussions, cartes de projet, runs CI. Tu réponds uniquement avec des faits vérifiables par commande, jamais avec des suppositions. Tout ce que tu fais est **strictement en lecture seule** : tu ne pousses rien, tu ne crées rien, tu ne modifies rien.

## 1. Scripts fournis — règle absolue

Le skill fournit un dossier `scripts/` (à la racine du skill) contenant **un script bash par type de commande** `gh` ou `git`. Chaque script encapsule l'URL d'API, l'expression `jq` et la requête GraphQL exactes — précisément les endroits où une faute de frappe (crochets, guillemets, échappements) fait échouer la commande — et accepte des arguments avec des valeurs par défaut :

- le **repo est détecté automatiquement** depuis `git remote -v` ; on peut le forcer avec l'argument positionnel `owner/repo` (ou `owner` `repo`) ;
- l'**utilisateur audité** se passe avec `--login LOGIN` ; dans la plupart des scripts il est optionnel = pas de filtre ;
- `--number N` pour les ressources individuelles (PR, issue, projet) ;
- `--limit N` pour la pagination (défaut `100`) ;
- `--help` sur chaque script rappelle l'usage exact.

**Règle absolue : l'agent DOIT appeler ces scripts au lieu de réécrire lui-même la commande `gh`/`git` complète.** Une seule commande mal retranscrite (un crochet `jq` de travers, un guillemet manquant dans une requête GraphQL, une URL d'API erronée) fait échouer l'audit ; les scripts sont stables et testés. On n'écrit une commande `gh`/`git` à la main **que si aucun script ne couvre le besoin**, en se calquant alors sur le script le plus proche du dossier `scripts/`.

```bash
# SKILL_DIR = dossier de base du skill (fourni au chargement)
"$SKILL_DIR/scripts/commits.sh" --login camilhamdach5-byte
"$SKILL_DIR/scripts/issues.sh" maximiliense/M1AgenticCoding
"$SKILL_DIR/scripts/issue-timeline.sh" --number 42 --login camilhamdach5-byte
"$SKILL_DIR/scripts/local-commits.sh" --pattern "camilhamdach5-byte|camil|hamdach"
```

### Tableau des scripts

| Script | Usage | Ce qu'il fait |
| ------ | ----- | ------------- |
| `user.sh` | `user.sh --login LOGIN` | Identité du compte : nom, date de création, repo publics |
| `user-orgs.sh` | `user-orgs.sh --login LOGIN` | Organisations du compte |
| `collaborator.sh` | `collaborator.sh [owner/repo] --login LOGIN` | Est collaborateur ? (200/404/403) + permissions |
| `commits.sh` | `commits.sh [owner/repo] [--login LOGIN] [--limit N]` | Commits du repo côté GitHub (filtre auteur optionnel) |
| `local-commits.sh` | `local-commits.sh [--pattern TEXTE] [--no-fetch]` | `git fetch --all` + `git log --all` (filtre ERE optionnel) |
| `search-commits.sh` | `search-commits.sh [--login LOGIN]` | Commits globaux (tous repos, index GitHub en retard < 24 h) |
| `pulls.sh` | `pulls.sh [owner/repo] [--login LOGIN] [--limit N]` | PRs du repo (`state=all`) |
| `pr-comments.sh` | `pr-comments.sh [owner/repo] --number N [--login LOGIN]` | Commentaires de revue d'une PR |
| `issues.sh` | `issues.sh [owner/repo] [--login LOGIN] [--limit N]` | Issues du repo (PRs exclues) |
| `issue-comments.sh` | `issue-comments.sh [owner/repo] --number N [--login LOGIN]` | Commentaires d'une issue |
| `issue-timeline.sh` | `issue-timeline.sh [owner/repo] --number N [--login LOGIN]` | Timeline d'une issue (`assigned`, `mentioned`, `subscribed`, …) |
| `discussions.sh` | `discussions.sh [owner/repo] [--pattern TEXTE]` | Discussions via GraphQL (filtre grep optionnel) |
| `projects-list.sh` | `projects-list.sh [owner]` | Numéro + titre des projets de l'owner |
| `project-items.sh` | `project-items.sh [owner] --number N` | Items (issues/PRs) d'un projet |
| `project-detail.sh` | `project-detail.sh [owner]` | Détail des items en GraphQL (champs, assignees, colonnes) |
| `introspect.sh` | `introspect.sh [TYPE]` | Introspection du schéma GraphQL (défaut : `ProjectV2ItemFieldValue`) |
| `ci-runs.sh` | `ci-runs.sh [owner/repo] [--login LOGIN] [--limit N]` | Runs CI du repo (filtre actor optionnel) |
| `branches.sh` | `branches.sh [remote]` | Branches distantes (défaut : `origin`) |
| `collaborators.sh` | `collaborators.sh [owner/repo] [--limit N]` | Logins des collaborateurs (population pour l'audit global) |
| `aggregate-commits.sh` | `aggregate-commits.sh [owner/repo] [--limit N]` | Commits groupés par auteur |
| `aggregate-pulls.sh` | `aggregate-pulls.sh [owner/repo] [--limit N]` | PRs groupées par créateur |
| `aggregate-issues.sh` | `aggregate-issues.sh [owner/repo] [--limit N]` | Issues groupées par créateur (PRs exclues) |
| `aggregate-issue-comments.sh` | `aggregate-issue-comments.sh [owner/repo] [--limit N]` | Commentaires d'issues comptés par auteur (boucle) |
| `rate-limit.sh` | `rate-limit.sh` | Rate limit GitHub restant (core, search, graphql) |

## 2. Prérequis (à faire avant tout audit)

1. **Identifier le repo** (les scripts le détectent eux-mêmes, mais le vérifier) :

```bash
git remote -v
# ex. git@github.com:maximiliense/M1AgenticCoding.git → owner=maximiliense, repo=M1AgenticCoding
```

2. **Vérifier l'outillage** :

```bash
gh auth status 2>&1 | head -5
git --version
```

Trois cas de figure :

| Situation                    | Approche                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `gh` installé et authentifié | Tout passe par les scripts `scripts/*.sh` (ils utilisent `gh api`)                                                              |
| `git` seul                   | `scripts/local-commits.sh` + `scripts/branches.sh` pour le code ; pour le reste (issues, discussions, projets), fournir des liens web cliquables |
| Ni l'un ni l'autre           | Fournir la liste des URLs à consulter et les critères à regarder                                                                |

3. **Règle de lecture seule** : les scripts ne font que lire (`git log`, `git fetch`, `git ls-remote`, `gh api` GET, `gh project list/item-list`). Jamais `push`, `create`, `edit`, `delete`, `close`, `merge`. Avant une boucle longue (ex. `aggregate-issue-comments.sh` sur un repo avec beaucoup d'issues) : `scripts/rate-limit.sh`.

## 3. Playbook A — Audit par utilisateur

Entrée : un login GitHub (ex. `camilhamdach5-byte`) ou un nom réel (ex. « Camil Hamdach »).

### Étape 1 — Identité et statut

```bash
"$SKILL_DIR/scripts/user.sh" --login {login}
"$SKILL_DIR/scripts/collaborator.sh" --login {login}   # 200 = collaborateur (+ permissions), 404 = non, 403 = droit insuffisant
"$SKILL_DIR/scripts/user-orgs.sh" --login {login}
```

- La date de création du compte par rapport au projet est un signal : compte créé le jour J = compte dédié au projet ; compte ancien = compte pré-existant.
- Aucune org ≠ inactivité (beaucoup d'étudiants n'ont pas d'org).

### Étape 2 — Commits sur le projet

```bash
"$SKILL_DIR/scripts/commits.sh" --login {login}
"$SKILL_DIR/scripts/local-commits.sh" --pattern "{login}|{email}|{nom réel}"
```

**Piège majeur** : le nom d'auteur d'un commit n'est PAS le login GitHub. Si rien ne revient avec le login, re-vérifier par l'adresse email puis par le nom réel.

### Étape 3 — Commits globaux (tous repos)

```bash
"$SKILL_DIR/scripts/search-commits.sh" --login {login}
```

L'index de cette recherche est en retard sur les commits très récents (moins de 24 h) : ne jamais conclure « zéro commit » sur cette source seule, toujours croiser avec l'étape 2.

### Étape 4 — Pull requests

```bash
"$SKILL_DIR/scripts/pulls.sh" --login {login}
# Puis, pour chaque PR trouvée :
"$SKILL_DIR/scripts/pr-comments.sh" --number {n} --login {login}
```

### Étape 5 — Issues et commentaires

L'endpoint issues **renvoie aussi les pull requests** : les scripts filtrent déjà `.pull_request == null` (ne pas refaire à la main).

```bash
"$SKILL_DIR/scripts/issues.sh" --login {login}
# Pour CHAQUE issue du repo (prendre les numéros depuis issues.sh) :
"$SKILL_DIR/scripts/issue-comments.sh" --number {n} --login {login}
"$SKILL_DIR/scripts/issue-timeline.sh" --number {n} --login {login}
```

La timeline révèle des événements invisibles ailleurs : `assigned`, `mentioned`, `subscribed`, `added_to_project_v2`, `project_v2_item_status_changed`, `commented`.

### Étape 6 — Discussions (GraphQL uniquement)

**Il n'existe PAS d'endpoint REST pour les discussions** : la requête GraphQL est encapsulée dans le script.

```bash
"$SKILL_DIR/scripts/discussions.sh" --pattern "{login}|{prénom}|{nom}"
```

Puis vérifier le résultat par `{login}` dans les auteurs ET dans les corps de message (une mention `@login` compte comme participation). Sans `--pattern`, le script déverse la liste brute (JSON).

### Étape 7 — Projects (tableaux Kanban)

```bash
"$SKILL_DIR/scripts/projects-list.sh"           # numéro + titre des projets
"$SKILL_DIR/scripts/project-items.sh" --number {n}
"$SKILL_DIR/scripts/project-detail.sh"          # assignees, colonnes, valeurs de champs
```

Le CLI ne montre pas les assignees ni les colonnes : `project-detail.sh` (GraphQL, types et champs exacts — ils ont changé, ne pas deviner) les donne. En cas d'erreur `undefinedType` ou `undefinedField`, introspecter plutôt que de deviner :

```bash
"$SKILL_DIR/scripts/introspect.sh"   # défaut: ProjectV2ItemFieldValue
```

Limite : au maximum 2 champs `__Type.fields` par requête d'introspection.

### Étape 8 — CI et branches

```bash
"$SKILL_DIR/scripts/ci-runs.sh" --login {login}
"$SKILL_DIR/scripts/branches.sh"   # branches distantes (préfixes feat/fix/chore + nom)
```

### Étape 9 — Mentions et nom réel

Rechercher le login ET le nom réel dans tous les corps collectés (issues, discussions, commentaires de PR, timeline). Un membre de groupe déclaré (ex. dans une liste de membres en discussion) mais sans aucune trace d'activité = « intégré formellement, aucune contribution visible ».

### Étape 10 — Rapport par utilisateur (format imposé)

1. **Identité** : login, nom, date de création du compte, collaborateur oui/non.
2. **Table de compteurs** : commits | PRs (ouvertes/mergées) | issues créées | commentaires issues | posts discussions | cartes projet | runs CI.
3. **Détail des éléments concrets** : sha + message des commits, numéros des PR/issues, 2-3 extraits de messages maximum.
4. **Verdict** : actif / partiellement actif / déclaré sans activité visible. Chaque « zéro » doit citer le script exécuté (et ses arguments) qui l'établit.

## 4. Playbook B — Usage global (tous les utilisateurs)

### Étape 1 — Population

```bash
"$SKILL_DIR/scripts/collaborators.sh"
```

### Étape 2 — Agrégation par auteur

```bash
"$SKILL_DIR/scripts/aggregate-commits.sh"
"$SKILL_DIR/scripts/aggregate-pulls.sh"
"$SKILL_DIR/scripts/aggregate-issues.sh"
"$SKILL_DIR/scripts/aggregate-issue-comments.sh"
```

Même logique pour les discussions (`discussions.sh`, compter par `author.login`) et les runs CI (`ci-runs.sh`, `actor.login`).

### Étape 3 — Matrice et détections

Produire un tableau :

| User | Commits | PRs | Issues | Comments | Discussions | CI  |
| ---- | ------- | --- | ------ | -------- | ----------- | --- |

Puis lister explicitement :

- **Membres inactifs** : présents dans la liste des collaborateurs mais 0 sur toutes les colonnes. Les nommer un par un, avec la preuve (les scripts exécutés sont revenus vides).
- **Auteurs non liés** : commits dont l'email ne correspond à aucun collaborateur connu.
- **Activité récente** : dernière date d'activité par user (commits, issues, commentaires, discussions).

## 5. Pièges connus (vérifiés empiriquement)

- **Issues = PRs incluses** : `/issues` renvoie aussi les pull requests ; les scripts filtrent déjà `.pull_request == null`.
- **Discussions** : pas de REST, GraphQL obligatoire (`repository.discussions`) ; la requête est dans `discussions.sh`.
- **Projects v2** : les noms de types GraphQL ont changé. Champs exacts (dans `project-detail.sh`) : `ProjectV2ItemFieldSingleSelectValue { name }`, `ProjectV2ItemFieldUserValue { users(first: n) { nodes { login } } }`, `ProjectV2ItemFieldTextValue { text }`. La connection `users` exige une pagination (`first`/`last`).
- **Auteur de commit ≠ login** : toujours croiser login, email et nom réel.
- **`search/commits`** : index en retard (moins de 24 h) ; ne jamais conclure sur cette source seule.
- **`users/{login}/events`** : 90 jours maximum et événements publics uniquement — insuffisant comme preuve de « zéro activité ».
- **Wiki** : pas d'API REST ; `git ls-remote https://github.com/{owner}/{repo}.wiki.git` (nécessite l'authentification pour un repo privé).
- **Repos privés** : invisibles hors collaborators ; un compte apparemment « vierge » peut avoir du travail privé non visible.
- **Rate limit** : paginer avec `per_page=100` (défaut des scripts), regrouper les appels dans les boucles ; vérifier `rate-limit.sh` avant une boucle longue sur beaucoup d'issues.

## 6. Garde-fous

- **Lecture seule absolue** : aucune commande d'écriture. Si la question implique une action (rappeler un utilisateur inactif, créer un ticket de suivi), la proposer sans l'exécuter.
- **Preuves** : chaque affirmation du rapport doit être traçable vers un script exécuté. Un « zéro » n'est valide que si le script a bien été exécuté et est revenu vide.
- **Droits insuffisants** : si un script échoue (403/404 par droits), le dire franchement et indiquer la permission manquante — ne jamais conclure « l'utilisateur n'a rien fait » à cause d'un 403.
