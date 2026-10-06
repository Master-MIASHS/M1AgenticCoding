/**
 * Lit et valide une paire XP/niveau, sans conserver de référence à l'entrée.
 * @param {object} value - État ou paire de progression.
 * @returns {{ xp: number, level: number }} Paire indépendante.
 */
function readPair(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('progression store: objet XP/niveau attendu.');
  }
  const { xp, level } = value;
  if (!Number.isFinite(xp) || xp < 0 || !Number.isSafeInteger(level) || level < 1) {
    throw new RangeError('progression store: XP finie positive ou nulle et niveau entier sûr positif attendus.');
  }
  return { xp, level };
}

/**
 * Adapte un état partagé à l'interface attendue par createProgression.
 * Les dépendances doivent être synchrones. updateState calcule sur une copie et
 * publie l'état complet uniquement après validation/persistance, ou lève une erreur.
 * Aucun cache ni stockage supplémentaire n'est créé par cet adaptateur interne.
 * @param {{ getState: function(): object, updateState: function(function(object): object): * }} dependencies - Accès internes à l'état.
 * @returns {{ read: function(): {xp: number, level: number}, write: function(object): void }} Adaptateur de progression.
 */
export function createProgressionStore({ getState, updateState }) {
  if (typeof getState !== 'function' || typeof updateState !== 'function') {
    throw new TypeError('progression store: getState et updateState requis.');
  }
  return {
    /**
     * Relit la progression du joueur courant, y compris après une restauration.
     * @returns {{ xp: number, level: number }} Nouvelle copie de la progression.
     */
    read() {
      return readPair(getState());
    },
    /**
     * Met à jour ensemble XP et niveau ; les champs supplémentaires sont ignorés.
     * @param {{ xp: number, level: number }} value - Progression à appliquer.
     * @returns {void}
     * @throws {Error} Valeurs invalides, diminution ou erreur d'écriture.
     */
    write(value) {
      const next = readPair(value);
      updateState((current) => {
        const previous = readPair(current);
        if (next.xp < previous.xp || next.level < previous.level) {
          throw new RangeError('progression store: XP et niveau ne peuvent pas diminuer.');
        }
        return { ...current, xp: next.xp, level: next.level };
      });
    },
  };
}
