---
name: changelog-generator
description: Compile les PR mergees depuis la derniere release en changelog groupe par G1-G5, en distinguant fonctionnalites, correctifs et breaking changes. A utiliser par G5 avant de publier une release.
---

# Changelog Generator

## Quand l'utiliser

- Avant de publier une release (tag de version).
- Pour produire un compte rendu périodique de l'activité des groupes (ex. bilan hebdomadaire pour G5).

## Ce que fait cette skill

1. **Lister les commits/PR mergés** depuis le dernier tag ou la dernière release connue (`git log <dernier-tag>..HEAD --merges`, ou historique des PR fermées si accessible).
2. **Rattacher chaque entrée à un groupe** via le label `groupe: GX` de la PR (ou, à défaut, via les fichiers modifiés et les périmètres définis dans `AGENTS.md`).
3. **Classer chaque entrée par type** :
   - **Fonctionnalité** (nouveau jeu, nouvelle salle, nouvel écran).
   - **Correctif** (bug fix).
   - **Breaking change** (changement d'API publique du Core non rétrocompatible, changement de contrat) — **toujours mis en évidence en premier**, avec l'impact sur les groupes consommateurs.
   - **Interne** (CI, tests, outillage — pertinent pour G5 mais pas forcément pour un changelog joueur).
4. **Rédiger une entrée lisible par ligne** : description courte orientée impact (pas juste le titre technique du commit), ticket lié, groupe auteur.
5. **Séparer deux niveaux de changelog** si utile :
   - **Changelog technique** (complet, pour l'équipe) : toutes les entrées, tous les groupes.
   - **Changelog joueur** (optionnel, pour une note de version publique) : uniquement les fonctionnalités et correctifs visibles en jeu (G2/G3/G4), sans le détail technique G1/G5.
6. **Vérifier la cohérence avec les décisions ouvertes** : si une entrée touche un point encore listé dans « Décisions ouvertes » d'`AGENTS.md`, le signaler — ça peut indiquer qu'une décision a été tranchée sans mise à jour du fichier, à faire remonter à G5.

## Format de sortie

```markdown
## Version 0.4.0 — 2026-09-16

### ⚠️ Breaking changes
- [G1] `getBalance()` remplacé par `getBalanceInfo()` (retourne aussi `bestBalance`) — impacte G2, G4. Ticket #142.

### ✨ Fonctionnalités
- [G2] Ajout du Blackjack (niveau 3). Ticket #98.
- [G4] Écran de classement avec badges. Ticket #101.

### 🐛 Correctifs
- [G3] Corrige l'animation de la roue de la fortune qui se figeait sur mobile. Ticket #110.

### 🔧 Interne
- [G5] Ajout de la détection de tests flaky en CI. Ticket #115.
```

## Ce que cette skill ne fait PAS

- Ne décide pas du numéro de version (semver) — elle propose le contenu, la décision de version reste humaine (G5), en particulier pour distinguer un bump majeur (breaking change) d'un mineur/patch.
- Ne publie ni ne tag rien elle-même — elle prépare le texte, un humain déclenche la release.
- N'invente pas de description si le titre de la PR est trop vague — elle signale l'entrée comme « à clarifier avec l'auteur » plutôt que de deviner l'impact.

## En cas de doute

Si le groupe auteur d'une PR est ambigu (label manquant, fichiers à cheval sur deux périmètres), classer en « non attribué » et remonter à G5 plutôt que de deviner.
