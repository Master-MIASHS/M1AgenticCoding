/**
 * Calcule les jeux acquis sans accéder à l'état ou au stockage.
 * Les acquis sont permanents, même après une hausse administrative des seuils.
 * L'appelant fournit le niveau effectif et getUnlockLevels() de la config d'Ania.
 *
 * @param {number} level - Niveau effectif, entier sûr supérieur ou égal à 1.
 * @param {Object<string, number>} unlockLevels - Seuils effectifs par identifiant.
 * @param {string[]} [unlockedGames=[]] - Identifiants déjà acquis, sans filtrage catalogue.
 * @returns {string[]} Nouvelle liste unique : acquis puis nouveaux jeux accessibles.
 * @throws {TypeError} Si la table ou les acquis ont une forme invalide.
 * @throws {RangeError} Si le niveau ou un seuil n'est pas un entier sûr >= 1.
 */
export function calculateUnlockedGames(level, unlockLevels, unlockedGames = []) {
  if (!Number.isSafeInteger(level) || level < 1) {
    throw new RangeError('unlockedGames : le niveau doit être un entier sûr supérieur ou égal à 1');
  }
  if (
    unlockLevels === null ||
    typeof unlockLevels !== 'object' ||
    (Object.getPrototypeOf(unlockLevels) !== Object.prototype &&
      Object.getPrototypeOf(unlockLevels) !== null)
  ) {
    throw new TypeError('unlockedGames : les seuils doivent être un objet { gameId: niveau }');
  }
  if (!Array.isArray(unlockedGames)) {
    throw new TypeError('unlockedGames : les acquis doivent être un tableau de chaînes');
  }
  for (const gameId of unlockedGames) {
    if (typeof gameId !== 'string') {
      throw new TypeError('unlockedGames : chaque acquis doit être une chaîne');
    }
  }
  const entries = Object.entries(unlockLevels);
  for (const [, threshold] of entries) {
    if (!Number.isSafeInteger(threshold) || threshold < 1) {
      throw new RangeError('unlockedGames : chaque seuil doit être un entier sûr supérieur ou égal à 1');
    }
  }

  const acquired = new Set(unlockedGames);
  for (const [gameId, threshold] of entries) {
    if (level >= threshold) acquired.add(gameId);
  }
  return [...acquired];
}
