// ---------------------------------------------------------------------------
// Games - Roulette draw (Groupe 2 - ticket #191)
// ---------------------------------------------------------------------------
// The ONLY roulette code allowed to touch the Core: it asks the Core for the
// random number, exactly once per spin, through the `core` object it receives.
// rules.js stays pure (no Core import, no Math.random(), nothing hardcoded);
// the draw picks the number, the rules settle it.
//
// roulette is an instant game drawn from `tirageEntier(0, 36)` (contrat § 4.1,
// PR #115): the raw handed to the rules and to G3 is the integer 0..36.
// ---------------------------------------------------------------------------

export { resolve } from './rules.js';

/**
 * Draws one roulette spin through the Core.
 *
 * Returns the drawn number, an integer between 0 and 36, produced by
 * `core.tirageEntier(0, 36)` guarded by the Core (safe integers, [0, 1) RNG,
 * no Math.random() here). `context` is accepted for signature parity with the
 * orchestrator's draw(core, context) and currently unused: the roulette layout
 * needs no parameters beyond the wheel bounds.
 *
 * @param {{ tirageEntier: Function }} core - the Core facade passed by createGame.
 * @param {object} [context] - unused, kept for createGame's draw signature.
 * @returns {number}
 */
export function draw(core, context) {
  return core.tirageEntier(0, 36);
}
