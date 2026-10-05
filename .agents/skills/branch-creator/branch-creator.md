---
name: branch-creator
description: Oblige chaque agent à créer une branche dédiée avant de développer une feature, nommée GroupeX-feature(nomgithub), où X est la variable SKOTCKER du .env de l'agent. La branche est liée à une issue GitHub validée via les commits et la PR.
---

## Compétence : branch-creator

- **Règle obligatoire :** aucune feature ne se développe sans branche dédiée ni issue liée. Avant d'écrire la moindre ligne de code, l'agent crée sa branche à partir de `main` à jour (`main` ne reçoit jamais de push direct). Le lien entre l'issue et la branche sur GitHub est fait par les références à l'issue dans les commits et la PR (voir « Lien issue ↔ branche sur GitHub »).

### Format de la branche

```
<SKOTCKER>-<feature>(<nomgithub>)
```


| Élément | Source | Exemple |
| --- | --- | --- |
| `<SKOTCKER>` | Variable `SKOTCKER` du fichier `.env` de l'agent | `Groupe5` |
| `<feature>` | Feature développée, en minuscules, kebab-case | `noirjack`, `machine-a-sous` |
| `<nomgithub>` | Récupéré via `git config user.name` ; espaces et caractères spéciaux remplacés par `-` | `Anthony-Miranda` |

**Exemple complet :** `Groupe5-noirjack(Anthony-Miranda)`

### Étapes à suivre

1. **Identifier et valider l'issue** — identifier l'issue GitHub de la feature (URL ou numéro) et vérifier qu'elle a été validée par la skill `issue-watcher` (label `To code`, ticket lié, label de groupe, absence de doute). Pas d'issue, ou issue non validée → s'arrêter : lancer `issue-watcher` d'abord, ou demander à l'utilisateur.
2. **Identifier le groupe** — lire la variable `SKOTCKER` dans `.env` :
   - Bash : `grep '^SKOTCKER=' .env | cut -d'=' -f2`
   - PowerShell : `(Select-String -Path .env -Pattern '^SKOTCKER=').Line -split '=',2 | Select-Object -Last 1`
   - Si `.env` n'existe pas ou que la variable manque : demander au user son groupe, puis créer le `.env` localement avec `SKOTCKER=GroupeX` (cf. `.env.example`). Le fichier `.env` est gitignored : **interdit de le committer**.
3. **Récupérer le nom GitHub** : `git config user.name`, puis sanitiser (espaces → `-`).
4. **Mettre `main` à jour** :
```bash
   git fetch origin
   git checkout main
   git pull origin main
```
5. **Créer la branche** depuis `main` :
```bash
   git checkout -b "Groupe5-noirjack(Anthony-Miranda)"
```
   Les guillemets sont obligatoires (la branche contient des parenthèses).
6. **Développer** uniquement sur cette branche, avec des commits atomiques au format strict défini dans le skill `flux-git-et-versionnement` (chaque commit référence l'issue avec `(#<n>)`). **C'est cette référence qui lie la branche à l'issue sur GitHub** (voir ci-dessous).
7. **Pousser la branche** vers l'origine (jamais vers `main`) :
```bash
   git push -u origin "Groupe5-noirjack(Anthony-Miranda)"
```
   Après le premier push, la branche apparaît dans la section **Development** de l'issue sur GitHub. La Pull Request cible ensuite `main` (voir le skill `prepare-pr`).

### Lien issue ↔ branche sur GitHub

GitHub ne lie pas une issue à une branche à partir du nom de la branche : le lien se fait par les références `#<n>` :

1. **Premier commit** de la branche contenant `(#<n>)` (format strict de commit) → la branche apparaît dans la section **Development** de l'issue.
2. **Pull Request** qui référence `#<n>` dans le titre et `Fixes #<n>` dans le corps (skill `prepare-pr`) → l'issue est fermée automatiquement au merge.

Vérification : après le premier push, ouvrir la page de l'issue → la branche doit figurer dans **Development**. Si ce n'est pas le cas, vérifier que le message du commit contient bien `(#<n>)`.

### Interdictions

- Créer une branche sans issue GitHub liée, ou pour une issue non validée par `issue-watcher`.
- Développer une feature sur `main` ou sur une branche d'un autre groupe.
- Committer `.env` (le fichier contient l'identité locale de l'agent).
- Pousser directement sur `main` : **interdit**. Tout se pousse sur la branche dédiée puis s'intègre vers `main` par Pull Request (voir le skill `flux-git-et-versionnement`).
