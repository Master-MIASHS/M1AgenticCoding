// ---------------------------------------------------------------------------
// Progression page - pure display helpers
// ---------------------------------------------------------------------------
// Kept free of React / DOM so they stay unit-testable with `node --test`.
// No XP or level business logic here: values come from the Core (via
// coreService) or from the game registry, and are only shaped for display.
// ---------------------------------------------------------------------------

/**
 * Répartit les jeux du registre entre débloqués et verrouillés.
 * Les ids présents dans l'état du joueur mais absents du registre sont
 * conservés côté débloqués (affichage défensif, jamais de donnée perdue).
 *
 * @param {Array<{ id: string, name: string, unlockLevel: number, category?: string }>} registry
 * @param {string[]} [unlockedIds]
 * @returns {{ unlocked: Array<object>, locked: Array<object> }}
 */
export function splitGamesByUnlock(registry, unlockedIds) {
  const games = Array.isArray(registry) ? registry : [];
  const ids = new Set(Array.isArray(unlockedIds) ? unlockedIds : []);
  const knownIds = new Set(games.map((game) => game.id));

  const unlocked = [];
  const locked = [];
  for (const game of games) {
    if (ids.has(game.id)) {
      unlocked.push(game);
    } else {
      locked.push(game);
    }
  }
  for (const id of ids) {
    if (!knownIds.has(id)) {
      unlocked.push({ id, name: id, unlockLevel: null, category: 'inconnu' });
    }
  }

  locked.sort(
    (a, b) => (a.unlockLevel ?? Number.MAX_SAFE_INTEGER) - (b.unlockLevel ?? Number.MAX_SAFE_INTEGER),
  );

  return { unlocked, locked };
}

/**
 * Déduit l'affichage de la barre de progression depuis les valeurs du Core.
 * Le seuil d'XP du niveau suivant n'est pas encore exposé par le contrat du
 * Core : tant que ce champ est absent, la progression reste neutre (null)
 * et la barre se remplit automatiquement dès que le champ sera fourni.
 *
 * @param {{ xp?: number, xpForNextLevel?: number } | null} state
 * @returns {{ percent: number | null, threshold: number | null }}
 */
export function getLevelProgress(state) {
  const xp = state?.xp;
  const threshold = state?.xpForNextLevel;

  if (typeof xp !== 'number' || !Number.isFinite(xp)) {
    return { percent: null, threshold: null };
  }
  if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold <= 0) {
    return { percent: null, threshold: null };
  }

  const ratio = Math.min(Math.max(xp / threshold, 0), 1);
  return { percent: Math.round(ratio * 100), threshold };
}

/**
 * Formate un nombre au format français, avec repli sur un tiret lorsque la
 * valeur est absente ou non numérique.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function formatNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('fr-FR')
    : '—';
}
