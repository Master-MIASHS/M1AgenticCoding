// ---------------------------------------------------------------------------
// Games - Template mock rules (Groupe 2)
// ---------------------------------------------------------------------------
// Fictitious rules used to auto-test the generic orchestrator (createGame)
// WITHOUT any real game. They follow the EXACT same contract as real rules
// (contrat G2 § 2.2 and § 3, #68):
//
//   single-step : resolve(raw, { bets }) -> gameResult
//   multi-step  : start(raw, { bets }) -> session (needsDraw: true)
//                 step(session, action, raw) -> session | gameResult
//
//   gameResult = { outcome: 'win' | 'loss' | 'push', multiplier, details }
//   (`multiplier` includes the stake; no `payout`: the Core computes it).
//
// Rules interpret the RAW draw (raw.value / raw.nonce) into a win/loss.
// They NEVER generate randomness themselves: no Math.random(), no import of
// coreService or of the Core. Randomness enters only through the raw result
// the orchestrator hands them.
// ---------------------------------------------------------------------------

/**
 * Single-step mock rules (slots-like): one draw settles the round.
 * `raw.value < 0.5` wins with a 2x multiplier (stake included).
 */
export const singleStepRules = {
  resolve(raw) {
    const win = raw.value < 0.5;
    return {
      outcome: win ? 'win' : 'loss',
      multiplier: win ? 2 : 0,
      details: { rawValue: raw.value },
    };
  },
};

/**
 * Multi-step mock rules (blackjack-like): the opening draw never settles the
 * round, the player then sends one 'draw' action whose draw is terminal.
 * Wins when firstDraw + secondDraw < 1.2, with a 1.5x multiplier.
 */
export const multiStepRules = {
  start(raw) {
    return {
      needsDraw: true,
      firstDraw: raw.value,
      availableActions: ['draw'],
    };
  },

  step(session, action, raw) {
    const win = session.firstDraw + raw.value < 1.2;
    return {
      outcome: win ? 'win' : 'loss',
      multiplier: win ? 1.5 : 0,
      details: { action, firstDraw: session.firstDraw, secondDraw: raw.value },
    };
  },
};
