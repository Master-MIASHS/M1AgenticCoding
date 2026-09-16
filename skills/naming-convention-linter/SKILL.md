---
name: naming-convention-linter
description: Verifie et corrige automatiquement le nom d'une branche selon la convention "gX-feature-travaillee" du projet. BLOQUANT en cas de non-conformite, avec renommage automatique propose. A utiliser avant tout push et lors de la creation de branche via branch-creator.
---

# Naming Convention Linter

## Convention imposée

**Branches** : `group<numéro-de-groupe>-<feature-travaillée>`

- `<numéro-de-groupe>` : un chiffre de 1 à 5, correspondant au groupe propriétaire de la tâche (G1 à G5).
- `<feature-travaillée>` : slug en kebab-case, minuscules, sans accent, sans espace, décrivant la fonctionnalité (pas le nom de la personne, pas le numéro de ticket seul).

Exemples valides : `group2-blackjack`, `group4-classement-badges`, `group1-rng-core`, `group5-ci-lint`.

Exemples invalides et pourquoi :
- `feature/blackjack` → pas de préfixe de groupe.
- `G2-Blackjack` → majuscules non autorisées.
- `g2_blackjack` → underscore au lieu du tiret.
- `g2-camille-blackjack` → nom de personne dans la branche (c'est le format des **agents personnels**, pas des branches — voir « Distinction agent vs branche » ci-dessous).
- `g7-roulette` → numéro de groupe invalide (le projet n'a que G1 à G5).
- `g2-correctif-du-bug-affichage-du-solde-dans-le-header-du-lobby` → slug trop long, à raccourcir.

## Quand l'utiliser

- **Avant tout push** d'une nouvelle branche.
- **Au moment de la création de branche**, en complément de `branch-creator` (cette skill peut être appelée juste après pour valider le nom généré).
- En **revue G5**, pour vérifier en masse les branches ouvertes.

Ce contrôle est **bloquant** : une branche non conforme ne doit pas être poussée, ni faire l'objet d'une PR, tant qu'elle n'est pas corrigée.

## Ce que fait cette skill

1. **Lire le nom de la branche courante** (`git branch --show-current`).
2. **Valider contre le pattern** `^g[1-5]-[a-z0-9]+(-[a-z0-9]+)*$`.
3. **Si conforme** : ✅, rien à faire.
4. **Si non conforme** :
   - Générer un nom corrigé automatiquement :
     - Déduire le numéro de groupe depuis le ticket lié si disponible (label `groupe: GX`), sinon depuis le préfixe déjà présent dans le nom actuel (`G2-...`, `feature/g2-...`, etc.), sinon **demander** (ne jamais deviner un groupe à l'aveugle).
     - Construire le slug : minuscules, accents translittérés (`é`→`e`), espaces et underscores → tirets, caractères non alphanumériques supprimés, tirets multiples réduits à un seul, nom de personne retiré si présent.
   - **Proposer** le renommage : `git branch -m <ancien-nom> <nouveau-nom>`.
   - Si la branche a déjà des commits distants poussés, avertir que le renommage nécessite aussi de mettre à jour la branche distante (`git push origin -u <nouveau-nom>` puis suppression de l'ancienne côté remote) — **ne jamais forcer un push ou supprimer une branche distante sans confirmation explicite**.
5. **Bloquer** : tant que le nom n'est pas conforme (avant ou après correction), signaler la PR/branche comme non prête, indépendamment des autres checks (tests, lint, etc.).

## Distinction agent vs branche

Deux conventions différentes coexistent dans `AGENTS.md`, à ne pas confondre :

| Objet | Convention | Exemple |
|---|---|---|
| **Branche** (cette skill) | `g<groupe>-<feature>` | `g2-blackjack` |
| **Agent personnel** (`AGENTS.md`, section « Contenu obligatoire d'un agent personnel ») | `<préfixe-groupe><prénom>-<tâche>` | `g2-camille-blackjack` |

Cette skill ne vérifie **que les branches**. Si le nom d'un agent personnel doit être vérifié, le faire séparément selon le format d'`AGENTS.md` (avec prénom) — ne pas appliquer le pattern des branches à un nom d'agent, et inversement.

## Sortie attendue

```
Branche actuelle : "Feature/Blackjack_G2"
Statut : ❌ BLOQUANT — ne respecte pas gX-feature-travaillee

Correction proposée : g2-blackjack
Commande : git branch -m Feature/Blackjack_G2 g2-blackjack

Confirmer le renommage ? (la branche n'a pas encore été poussée — renommage sans risque)
```

## Ce que cette skill ne fait PAS

- Ne renomme jamais silencieusement — elle propose, la personne (ou l'agent) confirme, en particulier si la branche est déjà distante.
- Ne force jamais un push ni ne supprime une branche distante sans confirmation explicite (cohérent avec le protocole de sécurité Git général).
- Ne devine pas le numéro de groupe si aucune information fiable n'est disponible (ticket, préfixe existant) — elle demande.
- Ne remplace pas `branch-creator` : elle valide, `branch-creator` crée.

## En cas de doute

Si le slug de la feature est ambigu (branche déjà très générique, ex. `g2-fix`), signaler et demander une reformulation plus descriptive plutôt que d'inventer un nom précis à la place de la personne.
