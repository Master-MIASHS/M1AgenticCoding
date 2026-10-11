import { useEffect, useRef, useState } from 'react';
import BetPanel from '../common/BetPanel.jsx';
import { mockStart } from './dice.mock.js';
import './dice.css';

// Délai entre deux lancers affichés. La révélation est rythmée par une minuterie, comme la roue
// et le plinko, pour ne jamais rester bloquée si la page n'est pas dessinée.
const ROLL_MS = 700;
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// status : "playing" (prêt à jouer) | "loading" | "terminal" | "error"
// start(bets) : bets est toujours un tableau [{ type: 'pass', amount }] (contrat G2 § 2.1)
// renderResult(gameResult, bet) : gain affiché = bet × gameResult.multiplier
// Déroulé lu dans gameResult.details = { rolls, point } (forme demandée au G2 dans #159) :
// l'UI affiche les totaux fournis, elle ne lance rien et ne décide rien.
export default function DiceGame({ balance, start = mockStart, renderResult }) {
  const [status, setStatus] = useState('playing');
  const [rolls, setRolls] = useState([]);
  const [point, setPoint] = useState(null);
  const [shown, setShown] = useState(0);
  const [gameResult, setGameResult] = useState(null);
  const [lastBet, setLastBet] = useState(null);
  const revealTimer = useRef(null);

  useEffect(() => () => clearInterval(revealTimer.current), []);

  const handlePlay = async (bet) => {
    setStatus('loading');
    setLastBet(bet);
    clearInterval(revealTimer.current);
    try {
      const res = await start([{ type: 'pass', amount: bet }]);
      const details = res.gameResult?.details ?? {};
      const nextRolls = Array.isArray(details.rolls) ? details.rolls : [];
      setRolls(nextRolls);
      setPoint(Number.isInteger(details.point) ? details.point : null);
      setGameResult(res.gameResult ?? null);
      if (nextRolls.length > 1 && !prefersReducedMotion()) {
        setShown(1);
        revealTimer.current = setInterval(() => {
          setShown((current) => {
            if (current + 1 >= nextRolls.length) clearInterval(revealTimer.current);
            return Math.min(current + 1, nextRolls.length);
          });
        }, ROLL_MS);
      } else {
        setShown(nextRolls.length);
      }
      setStatus('terminal');
    } catch {
      setStatus('error');
    }
  };

  const loading = status === 'loading';
  const revealing = status === 'terminal' && shown < rolls.length;
  const busy = loading || revealing;
  const showResult = status === 'terminal' && !revealing;
  // Le point n'est affiché qu'une fois le lancer de sortie montré.
  const showPoint = point !== null && shown >= 1;

  let message = 'Mise puis lance les dés.';
  if (loading) message = 'Les dés roulent…';
  else if (revealing) message = 'Lancer suivant…';

  return (
    <section className="dice">
      <div className="dice__table" aria-live="polite" aria-busy={busy}>
        {loading && <div className="dice__roll dice__roll--rolling">🎲</div>}
        {!loading &&
          rolls.slice(0, shown).map((total, index) => (
            <div key={index} className="dice__step">
              <span className="dice__label">{index === 0 ? 'Lancer de sortie' : `Lancer ${index + 1}`}</span>
              <div className="dice__roll">{total}</div>
            </div>
          ))}
        {!loading && rolls.length === 0 && <div className="dice__roll dice__roll--empty">?</div>}
      </div>

      {showPoint && <p className="dice__point">Point : {point}</p>}

      <p className="dice__message">{message}</p>

      {status === 'error' && (
        <p className="dice__error" role="alert">
          Une erreur est survenue, réessaie.
        </p>
      )}

      {showResult && renderResult ? renderResult(gameResult, lastBet) : null}

      <BetPanel balance={balance} onPlay={handlePlay} disabled={busy} />
    </section>
  );
}
