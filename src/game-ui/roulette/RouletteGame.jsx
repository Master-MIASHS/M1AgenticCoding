import { useState } from 'react';
import BetPanel from '../common/BetPanel.jsx';
import { mockStart } from './roulette.mock.js';
import './roulette.css';

const CHOICES = [
  { id: 'red', label: 'Rouge' },
  { id: 'black', label: 'Noir' },
  { id: 'even', label: 'Pair' },
  { id: 'odd', label: 'Impair' },
];

// status : "playing" (prêt à jouer) | "loading" | "terminal" | "error"
export default function RouletteGame({ balance, start = mockStart, renderResult }) {
  const [status, setStatus] = useState('playing');
  const [choice, setChoice] = useState(null);
  const [payload, setPayload] = useState(null);
  const [gameResult, setGameResult] = useState(null);

  const handlePlay = async (bet) => {
    setStatus('loading');
    try {
      const res = await start(bet, choice);
      setPayload(res.renderPayload);
      setGameResult(res.gameResult ?? null);
      setStatus('terminal');
    } catch {
      setStatus('error');
    }
  };

  const loading = status === 'loading';

  return (
    <section className="roulette">
      <div className="roulette__choices" role="group" aria-label="Type de pari">
        {CHOICES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`roulette__choice${choice === id ? ' roulette__choice--active' : ''}`}
            aria-pressed={choice === id}
            disabled={loading}
            onClick={() => setChoice(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="roulette__display" aria-live="polite" aria-busy={loading}>
        {loading && <div className="roulette__ball roulette__ball--spin">…</div>}
        {!loading && payload && (
          <div className={`roulette__ball roulette__ball--${payload.color}`}>{payload.number}</div>
        )}
        {!loading && !payload && <div className="roulette__ball">?</div>}
      </div>

      {status === 'error' && (
        <p className="roulette__error" role="alert">
          Une erreur est survenue, réessaie.
        </p>
      )}

      {status === 'terminal' && renderResult ? renderResult(gameResult) : null}

      <BetPanel balance={balance} onPlay={handlePlay} disabled={loading || !choice} />
    </section>
  );
}
