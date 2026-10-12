
export const mockPokerView = {
  phase: 'playing',
  stage: 'flop',

  playerHand: [
    { rank: 'A', suit: 'hearts' },
    { rank: 'K', suit: 'spades' },
  ],

  // Trois cartes communes : le flop.
  communityCards: [
    { rank: 'A', suit: 'spades' },
    { rank: '10', suit: 'hearts' },
    { rank: '7', suit: 'clubs' },
  ],

  pot: 120,
  currentBet: 40,
  raiseStep: 20,

  playerChips: 980,
  botChips: 900,

  playerContribution: 40,
  botContribution: 80,

  availableActions: ['fold', 'call', 'raise'],
};

export const mockPokerPayload = {
  view: mockPokerView,
  terminal: false,
  gameResult: null,
};