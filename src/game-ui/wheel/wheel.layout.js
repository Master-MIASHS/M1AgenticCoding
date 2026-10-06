// Géométrie purement visuelle de la roue : où dessiner les segments et de combien la faire
// tourner pour amener le segment tiré sous le pointeur. Aucun tirage, aucun calcul de gain.

const FULL_TURNS = 4;

// Angle (en degrés, sens horaire depuis le haut) du centre du segment `index`.
export function segmentCenter(index, count) {
  return ((index + 0.5) * 360) / count;
}

// Nouvelle rotation du disque pour que le centre du segment `index` arrive sous le pointeur
// (en haut). Elle part de la rotation précédente et ajoute toujours quelques tours complets,
// pour que la roue tourne dans le même sens à chaque partie.
export function targetRotation(previous, index, count) {
  const base = previous - (previous % 360) + FULL_TURNS * 360;
  return base + (360 - segmentCenter(index, count));
}
