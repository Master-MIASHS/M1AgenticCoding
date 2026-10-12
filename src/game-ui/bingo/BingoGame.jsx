import { useEffect, useRef, useState } from 'react';
import BetPanel from '../common/BetPanel.jsx';
import { mockStart, mockAction } from './bingo.mock.js';
import './bingo.css';

const LETTERS = ['B', 'I', 'N', 'G', 'O'];
// Rythme du « Tirage auto » : l'UI enchaîne simplement les actions `next`, elle ne tire rien.
const AUTO_MS = 600;

const winnerLabel = (id) => (id === 'player' ? 'toi' : id.replace('bot-', 'Bot '));

function Grid({ grid, small = false }) {
  return (
    <div className={`bingo__grid${small ? ' bingo__grid--small' : ''}`}>
      {LETTERS.map((letter) => (
        <span key={letter} className="bingo__head">
          {letter}
        </span>
      ))}
      {grid.flat().map((cell, index) => (
        <span
          key={index}
          className={`bingo__cell${cell.marked ? ' bingo__cell--marked' : ''}${cell.free ? ' bingo__cell--free' : ''}`}
        >
          {cell.free ? '★' : cell.number}
        </span>
      ))}
    </div>
  );
}

// Jeu multi-étapes (contrat G2 § 1) : start(bets), puis action(sessionId, 'next') à chaque boule.
// Tout vient de renderPayload.view : cases cochées (marked), boules sorties, avancement public
// des bots pendant la partie (jamais leur grille), gagnants et grilles des bots à la fin.
// status : "playing" (prêt à miser) | "loading" | "round" | "terminal" | "error"
// renderResult(gameResult, bet) : gain affiché = bet × gameResult.multiplier
export default function BingoGame({ balance, start = mockStart, action = mockAction, renderResult }) {
  const [status, setStatus] = useState('playing');
  const [view, setView] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [actions, setActions] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [lastBet, setLastBet] = useState(null);
  const [auto, setAuto] = useState(false);
  const autoTimer = useRef(null);

  useEffect(() => () => clearTimeout(autoTimer.current), []);

  const run = async (call) => {
    setStatus('loading');
    try {
      const res = await call();
      setView(res.renderPayload?.view ?? null);
      setSessionId(res.sessionId ?? null);
      setActions(res.terminal || !Array.isArray(res.availableActions) ? [] : res.availableActions);
      setGameResult(res.terminal ? (res.gameResult ?? null) : null);
      setStatus(res.terminal ? 'terminal' : 'round');
      if (res.terminal) setAuto(false);
    } catch {
      setAuto(false);
      setStatus('error');
    }
  };

  const drawNext = () => run(() => action(sessionId, 'next'));

  useEffect(() => {
    if (auto && status === 'round' && actions.includes('next')) {
      autoTimer.current = setTimeout(drawNext, AUTO_MS);
      return () => clearTimeout(autoTimer.current);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, status, actions, sessionId]);

  const handlePlay = (bet) => {
    setLastBet(bet);
    setAuto(false);
    run(() => start([{ type: 'main', amount: bet }]));
  };

  const loading = status === 'loading';
  const inRound = status === 'round' || (loading && auto);
  const drawn = view?.drawnBalls ?? [];
  const winners = view?.winnerIds ?? [];

  let message = 'Mise pour recevoir ta grille.';
  if (status === 'round' || (loading && view)) message = `${drawn.length} boule${drawn.length > 1 ? 's' : ''} sortie${drawn.length > 1 ? 's' : ''}.`;
  if (status === 'terminal') message = `Bingo pour ${winners.map(winnerLabel).join(', ')} !`;

  return (
    <section className="bingo">
      <div className="bingo__table" aria-live="polite" aria-busy={loading}>
        <div className="bingo__ball">{view?.currentBall ?? '–'}</div>
        {view?.playerGrid ? <Grid grid={view.playerGrid} /> : <p className="bingo__empty">Ta grille apparaîtra ici.</p>}
      </div>

      {drawn.length > 0 && (
        <p className="bingo__history">Dernières boules : {drawn.slice(-10).join(' · ')}</p>
      )}

      {status !== 'terminal' && view?.bots && (
        <ul className="bingo__bots">
          {view.bots.map((bot) => (
            <li key={bot.id}>
              {winnerLabel(bot.id)} : encore {bot.remaining} case{bot.remaining > 1 ? 's' : ''}
            </li>
          ))}
        </ul>
      )}

      {status === 'terminal' && view?.bots && (
        <div className="bingo__bot-grids">
          {view.bots.map((bot) => (
            <div key={bot.id} className={winners.includes(bot.id) ? 'bingo__bot bingo__bot--winner' : 'bingo__bot'}>
              <p>{winnerLabel(bot.id)}</p>
              {bot.grid && <Grid grid={bot.grid} small />}
            </div>
          ))}
        </div>
      )}

      <p className="bingo__message">{message}</p>

      {(status === 'round' || (loading && auto)) && actions.includes('next') && (
        <div className="bingo__actions">
          <button type="button" className="bingo__next" disabled={loading || auto} onClick={drawNext}>
            Tirer une boule
          </button>
          <label className="bingo__auto">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Tirage auto
          </label>
        </div>
      )}

      {status === 'error' && (
        <p className="bingo__error" role="alert">
          Une erreur est survenue, réessaie.
        </p>
      )}

      {status === 'terminal' && renderResult ? renderResult(gameResult, lastBet) : null}

      <BetPanel balance={balance} onPlay={handlePlay} disabled={loading || inRound} />
    </section>
  );
}
