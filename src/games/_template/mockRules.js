// ---------------------------------------------------------------------------
// Games - Template mock rules (Groupe 2)
// ---------------------------------------------------------------------------
// Fictitious rules used to auto-test the generic orchestrator (createGame)
// WITHOUT any real game. They follow the EXACT same contract as real rules:
//
//   single-step : resolve(raw, { bets }) -> gameResult
//   multi-step  : start(raw, { bets }) -> state
//                 step(raw, state, { bets }) -> state | gameResult
//
// Rules interpret the RAW draw (raw.value / raw.nonce) into a win/loss.
// They NEVER generate randomness themselves: no Math.random(), no import of
// coreService or of the Core. Randomness enters only through the raw result
// the orchestrator hands them.
// ---------------------------------------------------------------------------

function totalBet(bets) {
  return bets.reduce((sum, bet) => sum + bet.amount, 0);
}

/**
 * Single-step mock rules (slots-like): one draw settles the round.
 * `raw.value < 0.5` wins and pays 2x the total bet.
 */
export const singleStepRules = {
  resolve(raw, { bets }) {
    const bet = totalBet(bets);
    const win = raw.value < 0.5;
    return {
      terminal: true,
      outcome: win ? 'win' : 'loss',
      payout: win ? bet * 2 : 0,
      rawValue: raw.value,
    };
  },
};

/**
 * Multi-step mock rules (blackjack-like): the first draw never settles the
 * round (`needsDraw: true`), the second draw is terminal.
 * Wins when firstDraw + secondDraw < 1.2, paying 1.5x the total bet.
 */
export const multiStepRules = {
  start(raw, { bets }) {
    return {
      terminal: false,
      needsDraw: true,
      totalBet: totalBet(bets),
      firstDraw: raw.value,
    };
  },

  step(raw, state) {
    const win = state.firstDraw + raw.value < 1.2;
    return {
      terminal: true,
      outcome: win ? 'win' : 'loss',
      payout: win ? state.totalBet * 1.5 : 0,
      firstDraw: state.firstDraw,
      secondDraw: raw.value,
    };
  },
};
