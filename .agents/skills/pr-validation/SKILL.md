# Skill : Validation des Pull Requests (PR) — Groupe 5

## Description
Ce skill définit les critères d'approbation et de qualité pour le relecteur (G5). Il s'assure que la contribution respecte les invariants d'architecture et de sécurité avant le merge. L'auteur doit avoir préalablement utilisé `pr-checklist`.

---

## 📋 Checklist de conformité PR

Avant de demander une relecture ou d'approuver une PR, assure-toi que tous les points suivants sont validés.

### 1. ⚙️ Intégration Continue (CI)
- [ ] La pipeline GitHub Actions (`ci.yml`) est au vert.
- [ ] `npm run lint` passe sans erreur ni avertissement bloquant.
- [ ] `npm test` s'exécute avec 100 % de réussite sur les tests unitaires/intégration.
- [ ] `npm run build` se termine sans erreur de compilation.

### 2. 👥 Relecture et Approbation
- [ ] La PR a reçu **au moins 2 validations (approvals)** de membres disposant des droits d'écriture.
- [ ] Les commentaires des relecteurs ont été résolus.

### 3. 🏗️ Respect de l'Architecture
- [ ] **Accès au Core :** Aucun import direct depuis `src/core/` (hors `coreService.js`). L'accès se fait exclusivement via `coreService.js`.
- [ ] **Gestion du hasard :** Aucun appel à `Math.random()`. Les tirages utilisent uniquement `src/core/rng.js`.
- [ ] **Découpage UI / Métier :** Les composants visuels (G3 / G4) ne contiennent aucune logique métier (pas de calculs de gains, d'évaluation de règles ou de probabilités).

### 4. 🌿 Stratégie Git
- [ ] La branche cible est `main` (et est à jour avec `main`).
- [ ] Le nom de la branche respecte la convention définie dans `git-governance`.
- [ ] Le titre et la description de la PR expliquent clairement le besoin et lient l'issue correspondante (`Fixes #<issue>`).

---

## 🛠️ Instructions pour le relecteur (Groupe 5)

1. Vérifier que la CI est verte. Si la CI échoue, bloquer la PR immédiatement.
2. Parcourir l'onglet **Files changed** et rechercher :
   - Des imports prohibés : `import ... from 'src/core/...'` (sauf `coreService.js`).
   - L'utilisation directe de `Math.random()`.
   - Du code de calcul métier dans des composants React / UI.
3. Tester localement si nécessaire (`git checkout <branche>`, `npm test`).
4. Valider ou demander des modifications avec des commentaires constructifs.