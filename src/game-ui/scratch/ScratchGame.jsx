import { useState } from 'react';
import BetPanel from '../common/BetPanel.jsx';
import { mockStart } from './scratch.mock.js';
import './scratch.css';

// Traduction visuelle : G2 n'envoie que des identifiants de symbole (config admin).
const SYMBOLS = {
  star: '⭐',
  clover: '\u{1F340}',
  diamond: '\u{1F48E}',
  cherry: '\u{1F352}',
  empty: '—',
};

// status : "playing" (prêt à jouer) | "loading" | "covered" (ticket acheté, à gratter)
//          | "terminal" (ticket gratté) | "error"
// start(bets) : bets est toujours un tableau [{ type: 'mise', amount }] (contrat G2 § 2.1)
// renderResult(gameResult, bet) : gain affiché = bet × gameResult.multiplier
// Le symbole est lu dans gameResult.details.symbol (règles G2 #216). Le résultat est déjà tiré
// quand le ticket apparaît : gratter ne fait que le dévoiler.
export default function ScratchGame({ balance, start = mockStart, renderResult }) {
  const [status, setStatus] = useState('playing');
  const [gameResult, setGameResult] = useState(null);
  const [lastBet, setLastBet] = useState(null);

  const handlePlay = async (bet) => {
    setStatus('loading');
    setLastBet(bet);
    try {
      const res = await start([{ type: 'mise', amount: bet }]);
      setGameResult(res.gameResult ?? null);
      setStatus('covered');
    } catch {
      setStatus('error');
    }
  };

  const symbol = gameResult?.details?.symbol;
  const known = symbol != null && SYMBOLS[symbol] !== undefined;
  const loading = status === 'loading';
  const covered = status === 'covered';

  let message = 'Achète un ticket avec ta mise.';
  if (loading) message = 'Impression du ticket…';
  else if (covered) message = 'Gratte la zone pour découvrir ton symbole.';

  return (
    <section className="scratch">
      <div className="scratch__ticket">
        <div className={`scratch__symbol${known ? '' : ' scratch__symbol--text'}`} aria-hidden={covered}>
          {status === 'terminal' ? (known ? SYMBOLS[symbol] : symbol ?? '?') : '?'}
        </div>
        {(covered || loading || status === 'playing' || status === 'error') && (
          <button
            type="button"
            className="scratch__cover"
            disabled={!covered}
            onClick={() => setStatus('terminal')}
          >
            {covered ? 'Gratter ici' : 'Ticket'}
          </button>
        )}
      </div>

      <p className="scratch__message" aria-live="polite" aria-busy={loading}>
        {message}
      </p>

      {status === 'error' && (
        <p className="scratch__error" role="alert">
          Une erreur est survenue, réessaie.
        </p>
      )}

      {status === 'terminal' && renderResult ? renderResult(gameResult, lastBet) : null}

      <BetPanel balance={balance} onPlay={handlePlay} disabled={loading || covered} />
    </section>
  );
}
