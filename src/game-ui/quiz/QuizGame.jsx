import { useState } from 'react';
import BetPanel from '../common/BetPanel.jsx';
import { mockStart, mockAction } from './quiz.mock.js';
import './quiz.css';

const LETTERS = ['A', 'B', 'C', 'D'];

// Jeu multi-étapes (contrat G2 § 1) : start(bets), puis action(sessionId, 'answer-<i>'), et après
// une bonne réponse 'next' (continuer) ou 'stop' (encaisser). La question, les options et, après
// la réponse seulement, la bonne réponse viennent de renderPayload.view : l'UI ne la connaît
// jamais avant. Chaque bouton n'existe que si son action est dans availableActions.
// status : "playing" (prêt à miser) | "loading" | "round" | "terminal" | "error"
// renderResult(gameResult, bet) : gain affiché = bet × gameResult.multiplier
export default function QuizGame({ balance, start = mockStart, action = mockAction, renderResult }) {
  const [status, setStatus] = useState('playing');
  const [view, setView] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [actions, setActions] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [lastBet, setLastBet] = useState(null);

  const run = async (call) => {
    setStatus('loading');
    try {
      const res = await call();
      setView(res.renderPayload?.view ?? null);
      setSessionId(res.sessionId ?? null);
      setActions(res.terminal || !Array.isArray(res.availableActions) ? [] : res.availableActions);
      setGameResult(res.terminal ? (res.gameResult ?? null) : null);
      setStatus(res.terminal ? 'terminal' : 'round');
    } catch {
      setStatus('error');
    }
  };

  const handlePlay = (bet) => {
    setLastBet(bet);
    run(() => start([{ type: 'main', amount: bet }]));
  };

  const send = (playerAction) => run(() => action(sessionId, playerAction));

  const loading = status === 'loading';
  const inRound = status === 'round';
  const answered = view?.answered === true && Number.isInteger(view?.correctIndex);

  const optionClass = (index) => {
    if (!answered) return 'quiz__option';
    if (index === view.correctIndex) return 'quiz__option quiz__option--correct';
    if (index === view.selectedIndex) return 'quiz__option quiz__option--wrong';
    return 'quiz__option';
  };

  let message = 'Mise pour recevoir ta première question.';
  if (inRound && answered) message = 'Bonne réponse ! Continuer pour gagner plus, ou encaisser ?';
  else if (inRound) message = 'Choisis ta réponse.';
  else if (status === 'terminal' && answered) message = view.isCorrect ? 'Bravo !' : 'Mauvaise réponse…';

  return (
    <section className="quiz">
      <div className="quiz__card" aria-live="polite" aria-busy={loading}>
        {view ? (
          <>
            <p className="quiz__progress">
              Question {view.questionNumber} / {view.totalQuestions}
            </p>
            <p className="quiz__question">{view.question}</p>
            <div className="quiz__options" role="group" aria-label="Réponses">
              {view.options.map((option, index) => {
                const answerAction = `answer-${index}`;
                return (
                  <button
                    key={`${view.questionId}-${index}`}
                    type="button"
                    className={optionClass(index)}
                    disabled={!(inRound && actions.includes(answerAction))}
                    onClick={() => send(answerAction)}
                  >
                    <span className="quiz__letter">{LETTERS[index] ?? index + 1}</span>
                    {option}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <p className="quiz__question">Prêt à risquer ta mise ?</p>
        )}
      </div>

      <p className="quiz__message">{message}</p>

      {inRound && (actions.includes('next') || actions.includes('stop')) && (
        <div className="quiz__actions">
          {actions.includes('next') && (
            <button type="button" className="quiz__next" onClick={() => send('next')}>
              Question suivante
            </button>
          )}
          {actions.includes('stop') && (
            <button type="button" className="quiz__stop" onClick={() => send('stop')}>
              Encaisser
            </button>
          )}
        </div>
      )}

      {status === 'error' && (
        <p className="quiz__error" role="alert">
          Une erreur est survenue, réessaie.
        </p>
      )}

      {status === 'terminal' && renderResult ? renderResult(gameResult, lastBet) : null}

      <BetPanel balance={balance} onPlay={handlePlay} disabled={loading || inRound} />
    </section>
  );
}
