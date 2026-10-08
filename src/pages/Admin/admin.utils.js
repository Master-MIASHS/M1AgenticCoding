// ---------------------------------------------------------------------------
// Admin screen - pure display helpers
// ---------------------------------------------------------------------------
// Kept free of React / DOM so they stay unit-testable with `node --test`.
// No game / economy business logic here: values are consumed as provided by
// the Core (via coreService) or, while the Core does not yet expose them, by
// the application-level game registry. These helpers only shape data for
// display and do simple (non-business) validation of raw JSON input.
// ---------------------------------------------------------------------------

/**
 * Normalizes a games source into a stable display list.
 *
 * Accepts either the Core `GAMES` object map
 * (`{ slots: { id, name, unlockLevel }, ... }`) or a plain array of game
 * objects. Unknown / malformed entries are dropped defensively.
 *
 * @param {object|Array<object>} [source]
 * @returns {Array<{ id: string, name: string, unlockLevel: number|null }>}
 */
export function gamesToDisplayList(source) {
  let entries = [];
  if (Array.isArray(source)) {
    entries = source;
  } else if (source && typeof source === 'object') {
    entries = Object.values(source);
  }

  const list = [];
  const seen = new Set();
  for (const game of entries) {
    if (!game || typeof game !== 'object') continue;
    const id = typeof game.id === 'string' ? game.id : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    list.push({
      id,
      name: typeof game.name === 'string' ? game.name : id,
      unlockLevel: typeof game.unlockLevel === 'number' ? game.unlockLevel : null,
    });
  }

  list.sort(
    (a, b) =>
      (a.unlockLevel ?? Number.MAX_SAFE_INTEGER) - (b.unlockLevel ?? Number.MAX_SAFE_INTEGER)
  );
  return list;
}

/**
 * Fallback selector for the games list.
 *
 * The Core canonical list (`GAMES`) must be consumed once it is exposed via
 * the coreService facade. Until G1 exposes it (see open issue `groupe: G1`),
 * the application-level registry is used as a clearly-marked fallback.
 *
 * @param {object|Array<object>|undefined} coreGames coreService.GAMES (when exposed)
 * @param {Array<object>} fallbackRegistry GAME_REGISTRY from src/config/gameRegistry.js
 * @returns {{ list: Array<object>, source: 'core'|'registry' }}
 */
export function pickGamesList(coreGames, fallbackRegistry) {
  const coreList = gamesToDisplayList(coreGames);
  if (coreList.length > 0) {
    return { list: coreList, source: 'core' };
  }
  return { list: gamesToDisplayList(fallbackRegistry), source: 'registry' };
}

/**
 * Fallback selector for the per-game config reader.
 *
 * Returns the Core `getGameConfig` when exposed via the facade, otherwise a
 * stub clearly flagged as unavailable so the screen shows an "attente G1"
 * state instead of a fake configuration.
 *
 * @param {Function|undefined} coreGetGameConfig coreService.getGameConfig (when exposed)
 * @returns {{ fn: Function, available: boolean }}
 */
export function pickGetGameConfig(coreGetGameConfig) {
  if (typeof coreGetGameConfig === 'function') {
    return { fn: coreGetGameConfig, available: true };
  }
  return {
    fn: () => ({ probabilities: {}, multipliers: {}, exposed: false }),
    available: false,
  };
}

/**
 * Parses a raw JSON object from a textarea.
 *
 * Display-level validation only: the value must be valid JSON and a plain
 * object. No business rule is enforced here (e.g. "probabilities sum to 1").
 *
 * @param {string} [text]
 * @returns {{ ok: boolean, value: object|null, error: string|null }}
 */
export function parseConfigJson(text) {
  const trimmed = (text ?? '').trim();
  if (trimmed === '') {
    return { ok: true, value: {}, error: null };
  }
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, value: null, error: 'JSON invalide.' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, value: null, error: 'Le JSON doit être un objet (ex: {"red": 0.4}).' };
  }
  return { ok: true, value: parsed, error: null };
}

/**
 * Builds the payload passed to `setGameConfig` from two raw JSON strings.
 *
 * @param {string} [probabilitiesText]
 * @param {string} [multipliersText]
 * @returns {{ ok: boolean, config?: { probabilities: object, multipliers: object }, error?: string }}
 */
export function buildGameConfig(probabilitiesText, multipliersText) {
  const probabilities = parseConfigJson(probabilitiesText);
  if (!probabilities.ok) {
    return { ok: false, error: `Probabilités : ${probabilities.error}` };
  }
  const multipliers = parseConfigJson(multipliersText);
  if (!multipliers.ok) {
    return { ok: false, error: `Multiplicateurs : ${multipliers.error}` };
  }
  return {
    ok: true,
    config: { probabilities: probabilities.value, multipliers: multipliers.value },
  };
}

/**
 * Serializes a stored config into the two JSON textareas (pretty-printed).
 *
 * @param {{ probabilities?: object, multipliers?: object }|null|undefined} [config]
 * @returns {{ probabilitiesJson: string, multipliersJson: string }}
 */
export function configForDisplay(config) {
  const probabilities =
    config && typeof config.probabilities === 'object' && config.probabilities !== null
      ? config.probabilities
      : {};
  const multipliers =
    config && typeof config.multipliers === 'object' && config.multipliers !== null
      ? config.multipliers
      : {};
  return {
    probabilitiesJson: JSON.stringify(probabilities, null, 2),
    multipliersJson: JSON.stringify(multipliers, null, 2),
  };
}

/**
 * Maps the Core global stats to display rows. Missing / invalid values
 * degrade to 0 (they are display-only, never recomputed here).
 *
 * @param {{ totalPlays?: number, totalWagered?: number, totalWon?: number, activePlayers?: number }|null|undefined} [stats]
 * @returns {Array<{ key: string, label: string, value: number }>}
 */
export function statsToDisplay(stats) {
  const safe = stats && typeof stats === 'object' ? stats : {};
  const rows = [
    { key: 'totalPlays', label: 'Parties jouées' },
    { key: 'totalWagered', label: 'Total misé' },
    { key: 'totalWon', label: 'Total gagné' },
    { key: 'activePlayers', label: 'Joueurs actifs' },
  ];
  return rows.map((row) => ({
    ...row,
    value: typeof safe[row.key] === 'number' && Number.isFinite(safe[row.key]) ? safe[row.key] : 0,
  }));
}

/**
 * Formats a number for display (fr-FR), with a dash fallback.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function formatNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('fr-FR') : '—';
}
