const QUESTION_COUNT = 5;
const OPTION_COUNT = 4;

function validateBank(raw) {
  if (!Array.isArray(raw)) {
    throw new TypeError('quiz: raw must be a shuffled question bank');
  }
  if (raw.length < QUESTION_COUNT) {
    throw new RangeError(`quiz: question bank must contain at least ${QUESTION_COUNT} questions`);
  }

  const ids = new Set();
  return raw.map((question) => {
    if (
      question === null ||
      typeof question !== 'object' ||
      typeof question.id !== 'string' ||
      question.id.length === 0 ||
      typeof question.question !== 'string' ||
      question.question.length === 0 ||
      !Array.isArray(question.options) ||
      question.options.length !== OPTION_COUNT ||
      question.options.some((option) => typeof option !== 'string' || option.length === 0) ||
      !Number.isInteger(question.correctIndex) ||
      question.correctIndex < 0 ||
      question.correctIndex >= OPTION_COUNT
    ) {
      throw new TypeError('quiz: every bank entry must be a valid question with four options');
    }
    if (ids.has(question.id)) {
      throw new TypeError(`quiz: question ids must be unique (duplicate "${question.id}")`);
    }
    ids.add(question.id);
    return {
      id: question.id,
      question: question.question,
      options: [...question.options],
      correctIndex: question.correctIndex,
    };
  });
}

function readPaytable(config) {
  const table = config?.paytable;
  const paytable = {};
  for (let score = 1; score <= QUESTION_COUNT; score += 1) {
    const multiplier = table?.[score];
    if (typeof multiplier !== 'number' || !Number.isFinite(multiplier) || multiplier < 0) {
      throw new TypeError(`quiz: config.paytable.${score} is required (a finite number >= 0)`);
    }
    paytable[score] = multiplier;
  }
  return paytable;
}

function sumBets(bets) {
  if (!Array.isArray(bets) || bets.length === 0) {
    throw new TypeError('quiz: bets must be a non-empty array of { type, amount }');
  }
  let total = 0;
  for (const bet of bets) {
    if (typeof bet?.amount !== 'number' || !Number.isFinite(bet.amount) || bet.amount <= 0) {
      throw new TypeError('quiz: every bet amount must be a positive number');
    }
    total += bet.amount;
  }
  return total;
}

function getActions(session) {
  if (session.phase === 'feedback') {
    return session.correct
      ? session.questionIndex + 1 === QUESTION_COUNT
        ? []
        : ['next', 'stop']
      : [];
  }
  return Array.from({ length: OPTION_COUNT }, (_, index) => `answer-${index}`);
}

function getOutcome(multiplier) {
  if (multiplier > 1) return 'win';
  if (multiplier === 1) return 'push';
  return 'loss';
}

function makeResult(session, multiplier) {
  const question = session.questions[session.questionIndex];
  return {
    outcome: getOutcome(multiplier),
    multiplier,
    details: {
      questionId: question.id,
      question: question.question,
      options: [...question.options],
      selectedIndex: session.selectedIndex,
      correctIndex: question.correctIndex,
      correctAnswers: session.correctAnswers,
      questionsAnswered: session.questionIndex + 1,
      totalQuestions: QUESTION_COUNT,
    },
  };
}

export function start(raw, { bets, config } = {}) {
  const totalBet = sumBets(bets);
  const paytable = readPaytable(config);
  const bank = validateBank(raw);
  const session = {
    needsDraw: true,
    questions: bank.slice(0, QUESTION_COUNT),
    questionIndex: 0,
    correctAnswers: 0,
    phase: 'question',
    selectedIndex: null,
    correct: false,
    totalBet,
    paytable,
  };
  return { ...session, availableActions: getActions(session) };
}

export function step(session, action) {
  if (session?.needsDraw !== true || !Array.isArray(session.questions)) {
    throw new TypeError('quiz: step requires an active quiz session');
  }
  if (!session.availableActions.includes(action)) {
    throw new TypeError(`quiz: unsupported action "${action}"`);
  }

  if (action === 'stop') {
    return makeResult(session, session.paytable[session.correctAnswers]);
  }
  if (action === 'next') {
    const nextSession = {
      ...session,
      questionIndex: session.questionIndex + 1,
      phase: 'question',
      selectedIndex: null,
      correct: false,
    };
    return { ...nextSession, availableActions: getActions(nextSession) };
  }

  const selectedIndex = Number(action.slice('answer-'.length));
  const question = session.questions[session.questionIndex];
  const correct = selectedIndex === question.correctIndex;
  const answeredSession = {
    ...session,
    phase: 'feedback',
    selectedIndex,
    correct,
    correctAnswers: session.correctAnswers + Number(correct),
  };

  if (!correct) {
    return makeResult(answeredSession, 0);
  }
  if (answeredSession.questionIndex + 1 === QUESTION_COUNT) {
    return makeResult(answeredSession, answeredSession.paytable[QUESTION_COUNT]);
  }
  return { ...answeredSession, availableActions: getActions(answeredSession) };
}

export function view({ phase, session, gameResult } = {}) {
  if (phase === 'result') {
    const details = gameResult?.details;
    if (!details || typeof details.questionId !== 'string') {
      throw new TypeError('quiz: result view requires question details');
    }
    return {
      questionId: details.questionId,
      question: details.question,
      options: [...details.options],
      questionNumber: details.questionsAnswered,
      totalQuestions: details.totalQuestions,
      answered: true,
      selectedIndex: details.selectedIndex,
      correctIndex: details.correctIndex,
      isCorrect: details.selectedIndex === details.correctIndex,
    };
  }
  if (phase !== 'playing' || session?.needsDraw !== true) {
    throw new TypeError('quiz: view requires a playing session or a terminal result');
  }
  const question = session.questions[session.questionIndex];
  const currentView = {
    questionId: question.id,
    question: question.question,
    options: [...question.options],
    questionNumber: session.questionIndex + 1,
    totalQuestions: QUESTION_COUNT,
    answered: session.phase === 'feedback',
  };
  if (session.phase === 'feedback') {
    currentView.selectedIndex = session.selectedIndex;
    currentView.correctIndex = question.correctIndex;
    currentView.isCorrect = session.correct;
  }
  return currentView;
}
