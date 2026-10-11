// TEMPORAIRE : seuils d'XP cumulée, en attente de validation métier.
// L'indice 0 correspond au niveau 1.
// Le dernier seuil est le niveau maximal calculable avec cette configuration.
export const TEMPORARY_LEVEL_THRESHOLDS = Object.freeze([0, 100, 250, 500, 1000]);

// Tâche 14 (#247) : base configurable validée par G5, indépendante du résultat.
// Cette base ne rend pas définitifs les seuils de niveaux ci-dessus.
export const XP_GAIN_CONFIG = Object.freeze({ baseXP: 10 });
