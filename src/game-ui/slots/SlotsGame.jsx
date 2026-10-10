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
// Les symboles viennent de la config admin : un identifiant inconnu est affiché tel quel.
const symbolOf = (id) => (id == null ? '❔' : (SYMBOLS[id] ?? id));

const EMPTY_REELS = [null, null, null];

// status : "playing" (prêt à jouer) | "loading" | "terminal" | "error"
// start(bets) : bets est toujours un tableau [{ type, amount }] (contrat G2 § 2.1)
// renderResult(gameResult, bet) : gain affiché = bet × gameResult.multiplier
// 3 rouleaux d'un symbole, lus dans renderPayload.raw.symbols (règles G2 #216).
export default function SlotsGame({ balance, start = mockStart, renderResult }) {
  const [status, setStatus] = useState('playing');
  const [payload, setPayload] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [lastBet, setLastBet] = useState(null);

  const handlePlay = async (bet) => {
    setStatus('loading');
    setLastBet(bet);
    try {
      const res = await start([{ type: 'mise', amount: bet }]);
      setPayload(res.renderPayload);
      setGameResult(res.gameResult ?? null);
      setStatus('terminal');
    } catch {
      setStatus('error');
    }
  };

  const loading = status === 'loading';
  const reels = payload?.raw?.symbols ?? EMPTY_REELS;
  // Mise en évidence d'après le résultat fourni par G2, jamais recalculée ici.
  const won = status === 'terminal' && gameResult?.outcome === 'win';

  return (
    <section className="slots">
      <div className="slots__reels" aria-live="polite" aria-busy={loading}>
        {reels.map((id, c) => (
          <div key={c} className={`slots__reel${loading ? ' slots__reel--spin' : ''}`}>
            <div
              className={`slots__cell${won ? ' slots__cell--win' : ''}${id != null && !SYMBOLS[id] ? ' slots__cell--text' : ''}`}
            >
              {symbolOf(id)}
            </div>
          </div>
        ))}
      </div>

      {status === 'error' && (
        <p className="slots__error" role="alert">
          Une erreur est survenue, réessaie.
        </p>
      )}

      {status === 'terminal' && renderResult ? renderResult(gameResult, lastBet) : null}

      <BetPanel balance={balance} onPlay={handlePlay} disabled={loading} />
    </section>
  );
}
