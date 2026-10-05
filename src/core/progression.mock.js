/**
 * Crée un adaptateur temporaire, isolé du state Core et sans persistance.
 * Seuls xp et level sont conservés ; les lectures et écritures sont copiées.
 * @param {{ xp: number, level: number }} initial - Progression initiale.
 * @returns {{ read: function(): object, write: function(object): void }}
 */
export function createProgressionMock(initial = { xp: 0, level: 1 }) {
  let snapshot = { xp: initial.xp, level: initial.level };
  return {
    read: () => ({ ...snapshot }),
    write: ({ xp, level }) => { snapshot = { xp, level }; },
  };
}
