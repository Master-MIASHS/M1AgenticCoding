---
name: branch-creator
description: Oblige chaque agent à créer une branche dédiée avant de développer une feature, nommée GroupeX-feature(nomgithub), où X est la variable SKOTCKER du .env de l'agent.
---

## Compétence : branch-creator

- **Règle obligatoire :** aucune feature ne se développe sans branche dédiée. Avant d'écrire la moindre ligne de code, l'agent crée sa branche à partir de `main` à jour (`main` ne reçoit jamais de push direct).

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

1. **Identifier le groupe** — lire la variable `SKOTCKER` dans `.env` :
   - Bash : `grep '^SKOTCKER=' .env | cut -d'=' -f2`
   - PowerShell : `(Select-String -Path .env -Pattern '^SKOTCKER=').Line -split '=',2 | Select-Object -Last 1`
   - Si `.env` n'existe pas ou que la variable manque : demander au user son groupe, puis créer le `.env` localement avec `SKOTCKER=GroupeX` (cf. `.env.example`). Le fichier `.env` est gitignored : **interdit de le committer**.
2. **Récupérer le nom GitHub** : `git config user.name`, puis sanitiser (espaces → `-`).
3. **Mettre `main` à jour** :
```bash
   git fetch origin
   git checkout main
   git pull origin main
```
4. **Créer la branche** depuis `main` :
```bash
   git checkout -b "Groupe5-noirjack(Anthony-Miranda)"
```
   Les guillemets sont obligatoires (la branche contient des parenthèses).
5. **Développer** uniquement sur cette branche, avec des commits atomiques au format strict défini dans le skill `flux-git-et-versionnement`.
6. **Pousser la branche** vers l'origine (jamais vers `main`) :
```bash
   git push -u origin "Groupe5-noirjack(Anthony-Miranda)"
```
   La Pull Request cible ensuite `main`.

### Interdictions

- Développer une feature sur `main` ou sur une branche d'un autre groupe.
- Committer `.env` (le fichier contient l'identité locale de l'agent).
- Pousser directement sur `main` : **interdit**. Tout se pousse sur la branche dédiée puis s'intègre vers `main` par Pull Request (voir le skill `flux-git-et-versionnement`).
