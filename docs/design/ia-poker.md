# Conception — IA des bots du poker (G1, tâche n°32, #196)

## Objectif

Fournir au Core une fonction qui choisit **l'action du bot** à son tour de jeu au poker (`fold`, `check`, `call` ou `raise`, avec un montant pour une relance), à partir de la situation transmise par le G2.

## Non-objectifs

- **Aucune règle du poker** : tours de mise, ordre de parole, relance minimale, showdown et gains restent au G2. L'IA choisit seulement parmi les actions que le G2 déclare possibles.
- **Aucune évaluation des mains** : le Core n'importe pas `src/games/` (`evaluatePokerHand` est au G2). L'IA reçoit une **force de main déjà calculée** (voir « Points ouverts »).
- **Aucun état** : rien n'est écrit dans l'état ni dans `localStorage`. Les jetons du bot restent dans la session du G2 (contrat validé dans la discussion #9).
- **Pas d'exposition** dans `core.js` / `coreService.js` : elle passe par @ahmed-abc73 (n°6).
- Pas d'IA du bingo (n°36, en pause).

## Conception

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `src/core/config/ai.config.js` | Réglages du comportement du bot (seuils de force, poids des actions, tailles de relance) |
| `src/core/ai/poker.js` | Décision du bot |
| `tests/unit/ai-poker.test.js` | Tests unitaires (`node:test`) |

### Situation reçue (contrat G2, discussion #9)

```js
{
  stage: 'preflop' | 'flop' | 'turn' | 'river',
  communityCards: [{ rank, suit }, ...],   // contrat des cartes (#76)
  pot: 150,
  currentBet: 20,
  minRaise: 40,                            // ajouté à la demande du G1
  playerState: { chips: 400, currentContribution: 20 },
  aiState: { hand: [{ rank, suit }, ...], chips: 380, currentContribution: 10 },
  availableActions: ['fold', 'call', 'raise'],
}
```

L'IA ne lit que `availableActions`, `minRaise` et `aiState.chips`, plus la force de la main. Elle ne reçoit jamais la main du joueur humain.

### Fonctions de `src/core/ai/poker.js`

| Fonction | Rôle |
|---|---|
| `validerConfig(config)` | Vérifie qu'une config est complète et cohérente (appelée par les fonctions qui reçoivent une config) |
| `niveauDeForce(force, config)` | Classe une force dans `[0, 1]` en `'faible'`, `'moyenne'` ou `'forte'` selon les seuils de la config |
| `actionsCandidates(situation)` | Actions que le bot peut réellement jouer, parmi `availableActions` |
| `montantDeRelance(situation, niveau, config)` | Montant d'une relance, toujours entre `minRaise` et `aiState.chips` |
| `deciderAction(force, situation, options)` | Décision complète : `{ type }` ou `{ type: 'raise', amount }` |
| `choisirAction(payload, options)` | Point d'entrée du contrat : lit la force dans le payload, puis appelle `deciderAction` (**après la réponse du G2**, voir « Points ouverts ») |

### Déroulement d'une décision

1. Valider la situation et la config (erreur claire sinon).
2. Classer la force : faible, moyenne ou forte.
3. Garder les actions candidates :
   - jamais `fold` quand `check` est possible (se coucher alors qu'on peut parler gratuitement n'est jamais meilleur) ;
   - jamais `raise` si `aiState.chips < minRaise` (le montant ne pourrait pas respecter les bornes).
4. Tirer une action avec `tirageAvecPoids`, selon les poids du niveau dans la config. Si tous les poids des candidates sont nuls, prendre la première candidate de `ordreDeRepli`.
5. Pour une relance : tirer un multiplicateur de `minRaise` (poids du niveau), puis plafonner à `aiState.chips`.

Le **bluff** n'est pas un cas à part : c'est le poids de `raise` au niveau faible.

## Décisions

| Décision | Pourquoi |
|---|---|
| Hasard uniquement via `tirageAvecPoids` (`rng.js`) | Règle 2 d'`AGENTS.md` ; reproductible en test avec `semer()`. |
| Tous les réglages dans `config/ai.config.js` | Règle 4 : aucune valeur de réglage en dur. Les valeurs par défaut sont un premier réglage du G1, à ajuster en jouant. |
| Config injectable (`options.config`) | Tester des comportements précis sans dépendre des valeurs par défaut. |
| Config injectée **validée** (`validerConfig`) | Une config incomplète donnerait sinon une erreur JavaScript peu claire, ou un bot qui enfreint ses garanties : multiplicateur < 1 (relance sous `minRaise`), poids de relance tous nuls (aucun montant tirable), ordre de repli incomplet (aucune action de repli). |
| Force de main en entrée, et non calculée par l'IA | Le Core n'importe pas `src/games/`, et l'évaluation des mains est une règle du G2. |
| Type toujours dans `availableActions`, montant toujours dans `[minRaise, aiState.chips]` | Garanties promises au G2 (discussion #9) : le G2 n'a jamais à corriger une décision du bot. |
| Action inconnue dans `availableActions` → erreur | Détecte tout de suite un écart de contrat au lieu de l'ignorer. |
| Erreurs `Error` avec message en français | Cohérent avec `rng.js`, `player.js` et le contrat des cartes. |

## Points ouverts (questions au G2 dans #196)

1. **Force de la main.** Format à fixer avec le G2 (ex. catégorie 1 à 10 de `evaluatePokerHand`, ramenée dans `[0, 1]`). `evaluatePokerHand` exige exactement 5 cartes : elle ne couvre ni le **preflop** (2 cartes), ni le **turn** et la **river** (6 et 7 cartes, meilleure main de 5 à choisir). Tant que ce point n'est pas tranché, `choisirAction` n'est pas écrite ; `deciderAction` prend la force en paramètre.
2. **Unité de `amount`** : total misé après la relance, ou supplément ? `minRaise` dans la même unité ? Les bornes actuelles `[minRaise, aiState.chips]` reprennent le contrat validé ; elles seront ajustées si besoin.
3. **Tapis** : si `aiState.chips < minRaise`, le bot ne relance pas (choix prudent). Si le G2 autorise le tapis, on l'ajoutera.

## Risques

- Le format de la force peut changer la façon de remplir la config (seuils). Les fonctions de décision ne dépendent que d'un nombre dans `[0, 1]`.
- Sans exposition par @ahmed-abc73, le G2 ne peut pas appeler l'IA via `coreService`.
- Les valeurs par défaut du comportement ne sont validées par personne : elles donnent un bot jouable, pas un bot optimal.

## Plan de tests

Commande : `npm test` (fichier `tests/unit/ai-poker.test.js`). Les tirages sont rendus reproductibles avec `semer()`, remis à `null` dans un `finally`.

| `describe` / `it` | Avant implémentation | Après |
|---|---|---|
| `ai.config` — fournit des seuils, des poids pour chaque niveau et action, et des tailles de relance | échec (module absent) | succès |
| `ai.config` — ne peut pas être modifiée par erreur | échec | succès |
| `niveauDeForce` — classe une force selon les seuils de la config | échec | succès |
| `niveauDeForce` — rejette une force hors de `[0, 1]` ou non numérique | échec | succès |
| `actionsCandidates` — ne garde jamais `fold` quand `check` est possible | échec | succès |
| `actionsCandidates` — retire `raise` si les jetons du bot sont sous `minRaise` | échec | succès |
| `actionsCandidates` — rejette une situation invalide (actions vides, inconnues, nombres invalides) | échec | succès |
| `montantDeRelance` — reste toujours entre `minRaise` et `aiState.chips` | échec | succès |
| `deciderAction` — renvoie toujours une action de `availableActions` | échec | succès |
| `deciderAction` — suit les poids de la config (poids nul jamais joué) | échec | succès |
| `deciderAction` — prend l'action de repli quand tous les poids sont nuls | échec | succès |
| `deciderAction` — ajoute un montant seulement pour une relance | échec | succès |
| `deciderAction` — donne la même décision avec la même graine | échec | succès |
| `validerConfig` — accepte la config par défaut | échec | succès |
| `validerConfig` — rejette des seuils, des poids d'actions, des relances ou un ordre de repli invalides | échec | succès |
| `validerConfig` — est appliquée par les fonctions qui reçoivent une config | échec | succès |
