import { useEffect, useRef, useState } from 'react';
import BetPanel from '../common/BetPanel.jsx';
import { mockStart, mockAction } from './memory.mock.js';
import './memory.css';

// Traduction visuelle : G2 n'envoie que des identifiants de symbole (README des règles memory).
const SYMBOLS = {
  chip: '\u{1FA99}',
  card: '\u{1F0CF}',
  dice: '\u{1F3B2}',
  'roulette-wheel': '\u{1F3A1}',
  'slot-machine': '\u{1F3B0}',
  horseshoe: '\u{1F9F2}',
  bell: '\u{1F514}',
  jackpot: '\u{1F4B0}',
};

// Temps pendant lequel une paire ratée reste visible avant que l'UI envoie `continue`.
// Minuterie (pas d'événement d'animation) pour ne jamais rester bloqué.
const MISMATCH_MS = 900;

// Jeu multi-étapes (contrat G2 § 1) : start(bets), puis action(sessionId, 'reveal-<i>'), et
// 'continue' après une paire ratée. Tout l'affichage vient de renderPayload.view : une carte
// cachée a symbol: null, l'UI ne connaît jamais le plateau. Une carte n'est cliquable que si
// son action reveal-<i> est disponible.
// status : "playing" (prêt à miser) | "loading" | "round" | "terminal" | "error"
// renderResult(gameResult, bet) : gain affiché = bet × gameResult.multiplier
export default function MemoryGame({ balance, start = mockStart, action = mockAction, renderResult }) {
  const [status, setStatus] = useState('playing');
  const [view, setView] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [actions, setActions] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [lastBet, setLastBet] = useState(null);
  const continueTimer = useRef(null);

  useEffect(() => () => clearTimeout(continueTimer.current), []);

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

  // Paire ratée : on la laisse visible, puis on envoie `continue` (seule action disponible).
  useEffect(() => {
    if (status === 'round' && view?.pendingMismatch && actions.includes('continue')) {
      continueTimer.current = setTimeout(() => run(() => action(sessionId, 'continue')), MISMATCH_MS);
      return () => clearTimeout(continueTimer.current);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, view, actions, sessionId]);

  const handlePlay = (bet) => {
    setLastBet(bet);
    run(() => start([{ type: 'main', amount: bet }]));
  };

  const loading = status === 'loading';
  const inRound = status === 'round';
  const cards = view?.cards ?? Array.from({ length: 16 }, (_, position) => ({ position, symbol: null }));

  let message = 'Mise pour retourner le plateau.';
  if (inRound && view?.pendingMismatch) message = 'Raté ! Les cartes vont se retourner…';
  else if (inRound) message = 'Retourne deux cartes pour trouver une paire.';
  else if (status === 'terminal') message = view?.result?.success ? 'Toutes les paires trouvées !' : 'Plus de tours…';

  return (
    <section className="memory">
      {view && (
        <p className="memory__stats">
          Paires : {view.pairsFound} / 8 · Tours : {view.turnsUsed} / {view.maxTurns}
        </p>
      )}

      <div className="memory__board" aria-live="polite" aria-busy={loading}>
        {cards.map((c) => {
          const revealAction = `reveal-${c.position}`;
          const canReveal = inRound && actions.includes(revealAction);
          const faceUp = c.symbol != null;
          return (
            <button
              key={c.position}
              type="button"
              className={`memory__card${faceUp ? ' memory__card--up' : ''}${c.matched ? ' memory__card--matched' : ''}`}
              disabled={!canReveal}
              aria-label={faceUp ? `Carte ${c.position + 1} : ${c.symbol}` : `Carte ${c.position + 1} cachée`}
              onClick={() => run(() => action(sessionId, revealAction))}
            >
              {faceUp ? (SYMBOLS[c.symbol] ?? c.symbol) : ''}
            </button>
          );
        })}
      </div>

      <p className="memory__message">{message}</p>

      {status === 'error' && (
        <p className="memory__error" role="alert">
          Une erreur est survenue, réessaie.
        </p>
      )}

      {status === 'terminal' && renderResult ? renderResult(gameResult, lastBet) : null}

      <BetPanel balance={balance} onPlay={handlePlay} disabled={loading || inRound} />
    </section>
  );
}
