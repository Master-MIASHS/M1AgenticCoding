// Géométrie purement visuelle du plateau de plinko. La case d'arrivée est déjà tirée par le
// Core : ce module ne fait que dessiner un trajet qui y mène. Aucun hasard, aucun calcul de gain.

// Trajet de la bille : une suite de rebonds (0 = gauche, 1 = droite), un par rangée, avec
// exactement `slot` rebonds à droite pour finir dans la case `slot`. Les rebonds à droite sont
// répartis régulièrement pour donner un trajet en zigzag, toujours le même pour une case donnée.
export function ballPath(slot, rows) {
  if (!Number.isInteger(slot) || slot < 0 || slot > rows) {
    throw new RangeError(`plinko: case ${slot} hors du plateau (0 à ${rows})`);
  }
  const path = [];
  let rights = 0;
  for (let row = 0; row < rows; row += 1) {
    const target = Math.round(((row + 1) * slot) / rows);
    const move = target > rights ? 1 : 0;
    rights += move;
    path.push(move);
  }
  return path;
}

// Position de la bille après `step` rebonds, en unités de case (0 = case la plus à gauche).
// Au départ elle est au centre du plateau ; après le dernier rebond, elle est sur sa case.
export function ballPosition(path, step) {
  const rows = path.length;
  const rights = path.slice(0, step).reduce((sum, move) => sum + move, 0);
  return { x: rights + (rows - step) / 2, y: step };
}
