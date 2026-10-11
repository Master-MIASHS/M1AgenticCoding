import { useEffect, useRef, useState } from 'react';
import BetPanel from '../common/BetPanel.jsx';
import { mockStart, plinkoMockPaytable } from './plinko.mock.js';
import { ballPath, ballPosition } from './plinko.layout.js';
import './plinko.css';

// Durée d'un rebond. La chute est rythmée par une minuterie (pas par `transitionend`, qui n'est
// pas émis quand la page n'est pas dessinée), comme la roue.
const STEP_MS = 180;
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const formatMultiplier = (m) => `×${m}`;

// status : "playing" (prêt à jouer) | "loading" | "terminal" | "error"
// start(bets) : bets est toujours un tableau [{ type: 'slot', amount }] (contrat G2 § 2.1)
// renderResult(gameResult, bet) : gain affiché = bet × gameResult.multiplier
// paytable : gains par case, de la config admin (getGameConfig('plinko'), #122). Pas encore
// fournie à G3 (#158) : données fictives du mock en attendant. Affichage seulement.
export default function PlinkoGame({
  balance,
  start = mockStart,
  renderResult,
  paytable = plinkoMockPaytable,
}) {
  const [status, setStatus] = useState('playing');
  const [path, setPath] = useState(null);
  const [step, setStep] = useState(0);
  const [slot, setSlot] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [lastBet, setLastBet] = useState(null);
  const dropTimer = useRef(null);

  useEffect(() => () => clearInterval(dropTimer.current), []);

  const rows = paytable.length - 1;

  const handlePlay = async (bet) => {
    setStatus('loading');
    setLastBet(bet);
    clearInterval(dropTimer.current);
    try {
      const res = await start([{ type: 'slot', amount: bet }]);
      const drawn = res.renderPayload?.raw;
      // Trajet visuel uniquement : la case d'arrivée vient du tirage, l'UI ne fait que l'animer.
      const nextPath = Number.isInteger(drawn) && drawn <= rows ? ballPath(drawn, rows) : null;
      setPath(nextPath);
      setSlot(Number.isInteger(drawn) ? drawn : null);
      setGameResult(res.gameResult ?? null);
      if (nextPath && !prefersReducedMotion()) {
        setStep(0);
        dropTimer.current = setInterval(() => {
          setStep((current) => {
            if (current + 1 >= rows) clearInterval(dropTimer.current);
            return Math.min(current + 1, rows);
          });
        }, STEP_MS);
      } else {
        setStep(rows);
      }
      setStatus('terminal');
    } catch {
      setStatus('error');
    }
  };

  const loading = status === 'loading';
  const dropping = status === 'terminal' && path !== null && step < rows;
  const busy = loading || dropping;
  const showResult = status === 'terminal' && !dropping;
  const ball = path ? ballPosition(path, step) : { x: rows / 2, y: 0 };
  const slots = rows + 1;

  let message = 'Mise puis lâche la bille.';
  if (busy) message = 'La bille descend…';
  else if (showResult && slot !== null) message = `Case ${slot + 1} : ${formatMultiplier(paytable[slot])}`;

  return (
    <section className="plinko">
      <div className="plinko__board" aria-hidden="true">
        {/* Rangée `row` : un clou sous chaque position possible de la bille à cette profondeur. */}
        {Array.from({ length: rows }, (_, row) =>
          Array.from({ length: row + 1 }, (__, k) => (
            <span
              key={`${row}-${k}`}
              className="plinko__peg"
              style={{
                left: `${(((rows - row) / 2 + k + 0.5) / slots) * 100}%`,
                top: `${((row + 0.5) / (rows + 1)) * 100}%`,
              }}
            />
          ))
        )}
        <span
          className={`plinko__ball${busy || showResult ? ' plinko__ball--visible' : ''}`}
          style={{
            left: `${((ball.x + 0.5) / slots) * 100}%`,
            top: `${(ball.y / (rows + 1)) * 100}%`,
            transition: `left ${STEP_MS}ms linear, top ${STEP_MS}ms linear`,
          }}
        />
      </div>

      <ol className="plinko__slots" style={{ '--plinko-slots': slots }}>
        {paytable.map((multiplier, index) => (
          <li
            key={index}
            className={`plinko__slot${showResult && index === slot ? ' plinko__slot--hit' : ''}`}
          >
            {formatMultiplier(multiplier)}
          </li>
        ))}
      </ol>

      <p className="plinko__message" aria-live="polite" aria-busy={busy}>
        {message}
      </p>

      {status === 'error' && (
        <p className="plinko__error" role="alert">
          Une erreur est survenue, réessaie.
        </p>
      )}

      {showResult && renderResult ? renderResult(gameResult, lastBet) : null}

      <BetPanel balance={balance} onPlay={handlePlay} disabled={busy} />
    </section>
  );
}
