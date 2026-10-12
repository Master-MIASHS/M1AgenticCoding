// Mock du Quiz « risque ton argent » au format de l'orchestrateur G2 (skill jeux-g2 § 1 à 3).
// Jeu multi-étapes : start(bets), puis action(sessionId, 'answer-<i>'), et après une bonne
// réponse 'next' (continuer) ou 'stop' (encaisser). Règles G2 #302, README de src/games/quiz/.
//
// Même forme de view que les vraies règles : { questionId, question, options, questionNumber,
// totalQuestions, answered } pendant le choix ; selectedIndex, correctIndex et isCorrect ne
// sont ajoutés qu'après la réponse.
//
// Ce mock remplace l'orchestrateur en démonstration : 5 questions fixes et déroulement simulé
// simplement pour pouvoir jouer. Avec le vrai jeu, questions, correction et gains viennent des
// règles G2 ; le composant QuizGame ne connaît jamais la bonne réponse avant la view.

const QUESTIONS = [
  { id: 'demo-1', question: 'Combien de cases compte une roulette européenne ?', options: ['36', '37', '38', '40'], correctIndex: 1 },
  { id: 'demo-2', question: 'Au blackjack, quelle valeur peut prendre un as ?', options: ['1 seulement', '11 seulement', '1 ou 11', '10'], correctIndex: 2 },
  { id: 'demo-3', question: 'Combien de cartes dans un jeu classique ?', options: ['32', '48', '52', '54'], correctIndex: 2 },
  { id: 'demo-4', question: 'Quelle main bat un brelan au poker ?', options: ['Double paire', 'Paire', 'Carte haute', 'Quinte'], correctIndex: 3 },
  { id: 'demo-5', question: 'Combien de faces a un dé classique ?', options: ['4', '6', '8', '12'], correctIndex: 1 },
];
// Gains fictifs de démonstration, mise incluse, par nombre de bonnes réponses (contrat § 2.2).
const PAYTABLE = { 1: 1.5, 2: 2, 3: 3, 4: 5, 5: 10 };

let calls = 0;
const sessions = new Map();

const later = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 250));
const ANSWERS = ['answer-0', 'answer-1', 'answer-2', 'answer-3'];

function viewOf(s) {
  const q = QUESTIONS[s.index];
  const view = {
    questionId: q.id,
    question: q.question,
    options: [...q.options],
    questionNumber: s.index + 1,
    totalQuestions: QUESTIONS.length,
    answered: s.selectedIndex !== null,
  };
  if (s.selectedIndex !== null) {
    view.selectedIndex = s.selectedIndex;
    view.correctIndex = q.correctIndex;
    view.isCorrect = s.selectedIndex === q.correctIndex;
  }
  return view;
}

function playing(sessionId, s) {
  return {
    sessionId,
    renderPayload: { gameId: 'quiz', phase: 'playing', view: viewOf(s) },
    availableActions: s.selectedIndex === null ? [...ANSWERS] : ['next', 'stop'],
    terminal: false,
  };
}

function finished(sessionId, s, outcome, multiplier) {
  sessions.delete(sessionId);
  const view = viewOf(s);
  return {
    sessionId,
    renderPayload: { gameId: 'quiz', phase: 'result', view: { ...view, answered: true } },
    availableActions: [],
    terminal: true,
    gameResult: { outcome, multiplier, details: { correctAnswers: s.correct, questionsAnswered: s.index + 1 } },
  };
}

// Même forme que start(bets) de G2 : bets = [{ type: 'main', amount }].
export function mockStart(bets) {
  if (!Array.isArray(bets) || bets.length === 0) {
    return Promise.reject(new Error('quiz mock : bets doit être un tableau [{ type, amount }]'));
  }
  calls += 1;
  const sessionId = `quiz-mock-${calls}`;
  const s = { index: 0, selectedIndex: null, correct: 0 };
  sessions.set(sessionId, s);
  return later(playing(sessionId, s));
}

// Même forme que action(sessionId, playerAction) de G2 ; une action indisponible ou une
// session terminée est refusée, comme createGame.
export function mockAction(sessionId, playerAction) {
  const s = sessions.get(sessionId);
  if (!s) {
    return Promise.reject(new Error(`quiz mock : session inconnue ou terminée '${sessionId}'`));
  }
  if (!playing(sessionId, s).availableActions.includes(playerAction)) {
    return Promise.reject(new Error(`quiz mock : action non disponible '${playerAction}'`));
  }
  // Tous les gains fictifs du mock sont > 1 : encaisser est toujours un gain ici.
  if (playerAction === 'stop') return later(finished(sessionId, s, 'win', PAYTABLE[s.correct]));
  if (playerAction === 'next') {
    s.index += 1;
    s.selectedIndex = null;
    return later(playing(sessionId, s));
  }
  s.selectedIndex = Number(playerAction.slice('answer-'.length));
  if (s.selectedIndex !== QUESTIONS[s.index].correctIndex) return later(finished(sessionId, s, 'loss', 0));
  s.correct += 1;
  if (s.index === QUESTIONS.length - 1) return later(finished(sessionId, s, 'win', PAYTABLE[s.correct]));
  return later(playing(sessionId, s));
}
