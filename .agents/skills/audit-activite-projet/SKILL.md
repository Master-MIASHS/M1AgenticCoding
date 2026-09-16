---
name: audit-activite-projet
description: "Audit en lecture seule de l'usage d'un projet GitHub avec gh et git — par utilisateur ou global : commits, PR, issues, commentaires, discussions, projets (kanban), CI, branches."
---

# Compétence : audit-activite-projet

**Rôle de l'agent :** Tu es un auditeur d'activité GitHub. On te demande de mesurer ce qu'un utilisateur (ou l'ensemble des utilisateurs) a réellement fait sur un projet : commits, pull requests, issues, commentaires, discussions, cartes de projet, runs CI. Tu réponds uniquement avec des faits vérifiables par commande, jamais avec des suppositions. Tout ce que tu fais est **strictement en lecture seule** : tu ne pousses rien, tu ne crées rien, tu ne modifies rien.

## 1. Prérequis (à faire avant tout audit)

1. **Identifier le repo** :

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

| Situation                    | Approche                                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `gh` installé et authentifié | Tout passe par `gh api` — le plus direct et le plus complet                                                                       |
| `git` seul                   | `git fetch --all` + `git log --all` pour le code ; pour le reste (issues, discussions, projets), fournir des liens web cliquables |
| Ni l'un ni l'autre           | Fournir la liste des URLs à consulter et les critères à regarder                                                                  |

3. **Règle de lecture seule** : seules les commandes `git log`, `git fetch`, `git ls-remote`, `gh api` (GET) et `gh project list/item-list` sont autorisées. Jamais `push`, `create`, `edit`, `delete`, `close`, `merge`.

## 2. Playbook A — Audit par utilisateur

Entrée : un login GitHub (ex. `camilhamdach5-byte`) ou un nom réel (ex. « Camil Hamdach »).

### Étape 1 — Identité et statut

```bash
gh api users/{login} --jq '{login, name, created_at, public_repos}'
gh api repos/{owner}/{repo}/collaborators/{login} --jq '{login, permissions}'   # 200 = collaborateur, 404 = non (ou droit insuffisant)
```

- La date de création du compte par rapport au projet est un signal : compte créé le jour J = compte dédié au projet ; compte ancien = compte pré-existant.
- `gh api users/{login}/orgs` : aucune org ≠ inactivité (beaucoup d'étudiants n'ont pas d'org).

### Étape 2 — Commits sur le projet

```bash
# Côté GitHub (auteur lié à un compte) :
gh api "repos/{owner}/{repo}/commits?per_page=100" --jq '.[] | select(.author.login == "{login}") | {sha: .sha[0:7], date: .commit.author.date, msg: .commit.message}'

# Côté local (indispensable en complément) :
git fetch --all --quiet
git log --all --format='%h %an <%ae> %ad %s' --date=short | grep -i "{login}\|{email}\|{nom réel}"
```

**Piège majeur** : le nom d'auteur d'un commit n'est PAS le login GitHub. Si rien ne revient avec le login, re-vérifier par l'adresse email puis par le nom réel.

### Étape 3 — Commits globaux (tous repos)

```bash
gh api "search/commits?q=author:{login}&per_page=100" --jq '.total_count, (.items[] | {date: .commit.author.date, repo: .repository.full_name, msg: .commit.message})'
```

L'index de cette recherche est en retard sur les commits très récents (moins de 24 h) : ne jamais conclure « zéro commit » sur cette source seule, toujours croiser avec l'étape 2.

### Étape 4 — Pull requests

```bash
gh api "repos/{owner}/{repo}/pulls?state=all&per_page=100" --jq '.[] | select(.user.login == "{login}") | {number, title, state, head: .head.ref, created_at, merged_at}'
```

Puis, pour chaque PR trouvée, les commentaires de revue :

```bash
gh api "repos/{owner}/{repo}/pulls/{n}/comments?per_page=100" --jq '.[] | select(.user.login == "{login}") | {date: .created_at, body: .body[0:200]}'
```

### Étape 5 — Issues et commentaires

L'endpoint issues **renvoie aussi les pull requests** : toujours filtrer avec `.pull_request == null`.

```bash
# Issues créées par l'utilisateur :
gh api "repos/{owner}/{repo}/issues?state=all&per_page=100" --jq '.[] | select(.pull_request == null) | select(.user.login == "{login}") | {number, title, state, created_at}'

# Pour CHAQUE issue du repo (boucle sur les numéros) :
gh api "repos/{owner}/{repo}/issues/{n}/comments?per_page=100" --jq '.[] | select(.user.login == "{login}") | {date: .created_at, body: .body[0:200]}'
gh api "repos/{owner}/{repo}/issues/{n}/timeline?per_page=100" --jq '.[] | select((.actor.login // "") == "{login}") | {event, created_at}'
```

La timeline révèle des événements invisibles ailleurs : `assigned`, `mentioned`, `subscribed`, `added_to_project_v2`, `project_v2_item_status_changed`, `commented`.

### Étape 6 — Discussions (GraphQL uniquement)

**Il n'existe PAS d'endpoint REST pour les discussions.** Requête unique à copier-coller :

```bash
gh api graphql -f query='query { repository(owner: "{owner}", name: "{repo}") { discussions(first: 30) { nodes { number title author { login } bodyText comments(first: 100) { nodes { author { login } createdAt body } } } } } }'
```

Puis filtrer le résultat par `{login}` dans les auteurs ET dans les corps de message (une mention `@login` compte comme participation). Astuce pratique : déverser le rendu lisible dans un fichier temporaire puis `grep -i "{login}\|{prénom}\|{nom}"` sur l'ensemble.

### Étape 7 — Projects (tableaux Kanban)

```bash
gh project list --owner {owner}                 # numéro + titre des projets
gh project item-list {n} --owner {owner}        # items (issues/PRs) du projet
```

Le CLI ne montre pas les assignees ni les colonnes. Pour le détail d'un item, GraphQL (noms de types et de champs exacts — ils ont changé, ne pas deviner) :

```bash
gh api graphql -f query='query { user(login: "{owner}") { projectsV2(first: 10) { nodes { number title items(first: 100) { nodes { ... on ProjectV2Item { fieldValues(first: 10) { nodes { ... on ProjectV2ItemFieldSingleSelectValue { name } ... on ProjectV2ItemFieldUserValue { users(first: 10) { nodes { login } } } ... on ProjectV2ItemFieldTextValue { text } } } content { ... on Issue { number title assignees(first: 20) { nodes { login } } } ... on PullRequest { number title } } } } } } } } }'
```

En cas d'erreur `undefinedType` ou `undefinedField`, introspecter plutôt que de deviner :

```bash
gh api graphql -f query='query { __type(name: "ProjectV2ItemFieldValue") { possibleTypes { name } } }'
```

Limite : au maximum 2 champs `__Type.fields` par requête d'introspection.

### Étape 8 — CI et branches

```bash
gh api "repos/{owner}/{repo}/actions/runs?per_page=100" --jq '.workflow_runs[] | select(.actor.login == "{login}") | {event, status, conclusion, head: .head_sha[0:7], created_at}'
git ls-remote --heads origin   # branches distantes (préfixes feat/fix/chore + nom)
```

### Étape 9 — Mentions et nom réel

Rechercher le login ET le nom réel dans tous les corps collectés (issues, discussions, commentaires de PR, timeline). Un membre de groupe déclaré (ex. dans une liste de membres en discussion) mais sans aucune trace d'activité = « intégré formellement, aucune contribution visible ».

### Étape 10 — Rapport par utilisateur (format imposé)

1. **Identité** : login, nom, date de création du compte, collaborateur oui/non.
2. **Table de compteurs** : commits | PRs (ouvertes/mergées) | issues créées | commentaires issues | posts discussions | cartes projet | runs CI.
3. **Détail des éléments concrets** : sha + message des commits, numéros des PR/issues, 2-3 extraits de messages maximum.
4. **Verdict** : actif / partiellement actif / déclaré sans activité visible. Chaque « zéro » doit citer la commande exécutée qui l'établit.

## 3. Playbook B — Usage global (tous les utilisateurs)

### Étape 1 — Population

```bash
gh api "repos/{owner}/{repo}/collaborators?per_page=100" --jq '.[].login'
```

### Étape 2 — Agrégation par auteur

Collecter chaque flux une seule fois, puis compter par login avec `jq group_by` :

```bash
# Commits (les auteurs non liés à un compte sortent sous leur email) :
gh api "repos/{owner}/{repo}/commits?per_page=100" --jq '[.[] | (.author.login // ("non-lié: " + .commit.author.email))] | group_by(.) | map({user: .[0], count: length})'

# PRs :
gh api "repos/{owner}/{repo}/pulls?state=all&per_page=100" --jq '[.[].user.login] | group_by(.) | map({user: .[0], count: length})'

# Issues (sans les PRs) :
gh api "repos/{owner}/{repo}/issues?state=all&per_page=100" --jq '[.[] | select(.pull_request == null) | .user.login] | group_by(.) | map({user: .[0], count: length})'

# Commentaires d'issues (boucle sur les numéros d'issues) :
for n in $(gh api "repos/{owner}/{repo}/issues?state=all&per_page=100" --jq '.[] | select(.pull_request == null) | .number'); do
  gh api "repos/{owner}/{repo}/issues/$n/comments?per_page=100" --jq '.[].user.login'
done | sort | uniq -c | sort -rn
```

Même logique pour les discussions (query GraphQL de l'étape 6, compter par `author.login`) et les runs CI (`actor.login`).

### Étape 3 — Matrice et détections

Produire un tableau :

| User | Commits | PRs | Issues | Comments | Discussions | CI  |
| ---- | ------- | --- | ------ | -------- | ----------- | --- |

Puis lister explicitement :

- **Membres inactifs** : présents dans la liste des collaborateurs mais 0 sur toutes les colonnes. Les nommer un par un, avec la preuve (les commandes exécutées sont revenues vides).
- **Auteurs non liés** : commits dont l'email ne correspond à aucun collaborateur connu.
- **Activité récente** : dernière date d'activité par user (commits, issues, commentaires, discussions).

## 4. Pièges connus (vérifiés empiriquement)

- **Issues = PRs incluses** : `/issues` renvoie aussi les pull requests ; filtrer systématiquement `.pull_request == null`.
- **Discussions** : pas de REST, GraphQL obligatoire (`repository.discussions`).
- **Projects v2** : les noms de types GraphQL ont changé. Champs exacts : `ProjectV2ItemFieldSingleSelectValue { name }`, `ProjectV2ItemFieldUserValue { users(first: n) { nodes { login } } }`, `ProjectV2ItemFieldTextValue { text }`. La connection `users` exige une pagination (`first`/`last`).
- **Auteur de commit ≠ login** : toujours croiser login, email et nom réel.
- **`search/commits`** : index en retard (moins de 24 h) ; ne jamais conclure sur cette source seule.
- **`users/{login}/events`** : 90 jours maximum et événements publics uniquement — insuffisant comme preuve de « zéro activité ».
- **Wiki** : pas d'API REST ; `git ls-remote https://github.com/{owner}/{repo}.wiki.git` (nécessite l'authentification pour un repo privé).
- **Repos privés** : invisibles hors collaborators ; un compte apparemment « vierge » peut avoir du travail privé non visible.
- **Rate limit** : paginer avec `per_page=100`, regrouper les appels dans les boucles ; vérifier `gh api rate_limit` avant une boucle longue sur beaucoup d'issues.

## 5. Garde-fous

- **Lecture seule absolue** : aucune commande d'écriture. Si la question implique une action (rappeler un utilisateur inactif, créer un ticket de suivi), la proposer sans l'exécuter.
- **Preuves** : chaque affirmation du rapport doit être traçable vers une commande. Un « zéro » n'est valide que si la commande a bien été exécutée et est revenue vide.
- **Droits insuffisants** : si une commande échoue (403/404 par droits), le dire franchement et indiquer la permission manquante — ne jamais conclure « l'utilisateur n'a rien fait » à cause d'un 403.
