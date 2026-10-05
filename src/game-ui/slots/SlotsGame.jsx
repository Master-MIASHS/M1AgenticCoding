import { useState } from 'react';
import BetPanel from '../common/BetPanel.jsx';
import { mockStart } from './slots.mock.js';
import './slots.css';

// Traduction visuelle : G2 n'envoie que des identifiants.
const SYMBOLS = {
  cherry: '\u{1F352}',
  lemon: '\u{1F34B}',
  grape: '\u{1F347}',
  bell: '\u{1F514}',
};
const symbolOf = (id) => SYMBOLS[id] ?? '\u2754';

const EMPTY_REELS = [Array(3).fill(null), Array(3).fill(null), Array(3).fill(null)];

// status : "playing" (prêt à jouer) | "loading" | "terminal" | "error"
export default function SlotsGame({ balance, start = mockStart, renderResult }) {
  const [status, setStatus] = useState('playing');
  const [payload, setPayload] = useState(null);
  const [gameResult, setGameResult] = useState(null);

  const handlePlay = async (bet) => {
    setStatus('loading');
    try {
      const res = await start(bet);
      setPayload(res.renderPayload);
      setGameResult(res.gameResult ?? null);
      setStatus('terminal');
    } catch {
      setStatus('error');
    }
  };

  const loading = status === 'loading';
  const reels = payload?.reels ?? EMPTY_REELS;
  const winningLines = payload?.winningLines ?? [];

  return (
    <section className="slots">
      <div className="slots__reels" aria-live="polite" aria-busy={loading}>
        {reels.map((reel, c) => (
          <div key={c} className={`slots__reel${loading ? ' slots__reel--spin' : ''}`}>
            {reel.map((id, r) => (
              <div
                key={r}
                className={`slots__cell${!loading && winningLines.includes(r) ? ' slots__cell--win' : ''}`}
              >
                {symbolOf(id)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {status === 'error' && (
        <p className="slots__error" role="alert">
          Une erreur est survenue, réessaie.
        </p>
      )}

      {status === 'terminal' && renderResult ? renderResult(gameResult) : null}

      <BetPanel balance={balance} onPlay={handlePlay} disabled={loading} />
    </section>
  );
}
