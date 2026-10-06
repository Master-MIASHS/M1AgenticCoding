import { useEffect, useRef, useState } from 'react';
import BetPanel from '../common/BetPanel.jsx';
import { mockStart, wheelMockSegments, wheelMockBetTypes } from './wheel.mock.js';
import { segmentCenter, targetRotation } from './wheel.layout.js';
import './wheel.css';

// Traduction visuelle : G2 et le Core n'envoient que des identifiants.
const COLORS = {
  red: 'var(--color-danger, #e74c3c)',
  black: '#000000',
  gold: 'var(--color-accent, #ffd166)',
  green: 'var(--color-success, #2ecc71)',
  blue: '#3b82f6',
};
const colorOf = (id) => COLORS[id] ?? 'var(--color-border, #2a2e3a)';

const BET_LABELS = { red: 'Rouge', black: 'Noir', gold: 'Or', green: 'Vert', blue: 'Bleu' };
const betLabelOf = (type) => BET_LABELS[type] ?? type;

// Durée de la rotation. La fin est gérée par une minuterie et pas par `transitionend`,
// qui n'est pas émis quand le navigateur ne dessine pas la page (onglet en arrière-plan).
const SPIN_MS = 3000;
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// status : "playing" (prêt à jouer) | "loading" | "terminal" | "error"
// start(bets) : bets est toujours un tableau [{ type, amount }] (contrat G2 § 2.1)
// renderResult(gameResult, bet) : gain affiché = bet × gameResult.multiplier
// segments / betTypes : disposition de la roue et types de pari de la config admin.
// Ils ne sont pas encore fournis à G3 (#122) : données fictives du mock en attendant.
export default function WheelGame({
  balance,
  start = mockStart,
  renderResult,
  segments = wheelMockSegments,
  betTypes = wheelMockBetTypes,
}) {
  const [status, setStatus] = useState('playing');
  const [betType, setBetType] = useState(null);
  const [segment, setSegment] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinMs, setSpinMs] = useState(0);
  const [gameResult, setGameResult] = useState(null);
  const [lastBet, setLastBet] = useState(null);
  const spinTimer = useRef(null);

  useEffect(() => () => clearTimeout(spinTimer.current), []);

  const handlePlay = async (bet) => {
    setStatus('loading');
    setLastBet(bet);
    try {
      const res = await start([{ type: betType, amount: bet }]);
      const drawn = res.renderPayload?.raw ?? null;
      // Placement visuel uniquement : on retrouve le segment tiré dans la roue dessinée.
      const index = drawn ? segments.findIndex(({ id }) => id === drawn.id) : -1;
      if (index >= 0) {
        const duration = prefersReducedMotion() ? 0 : SPIN_MS;
        setSpinMs(duration);
        setRotation((previous) => targetRotation(previous, index, segments.length));
        if (duration > 0) {
          setSpinning(true);
          clearTimeout(spinTimer.current);
          spinTimer.current = setTimeout(() => setSpinning(false), duration);
        }
      }
      setSegment(drawn);
      setGameResult(res.gameResult ?? null);
      setStatus('terminal');
    } catch {
      setStatus('error');
    }
  };

  const loading = status === 'loading';
  const busy = loading || spinning;
  const showResult = status === 'terminal' && !spinning;
  const slice = 360 / segments.length;
  const background = `conic-gradient(${segments
    .map((s, i) => `${colorOf(s.color)} ${i * slice}deg ${(i + 1) * slice}deg`)
    .join(', ')})`;

  let message = 'Choisis un pari puis lance la roue.';
  if (busy) message = 'La roue tourne…';
  else if (showResult && segment) message = `Segment : ${segment.label ?? segment.id}`;

  return (
    <section className="wheel">
      <div className="wheel__bets" role="group" aria-label="Type de pari">
        {betTypes.map((type) => (
          <button
            key={type}
            type="button"
            className={`wheel__bet${betType === type ? ' wheel__bet--active' : ''}`}
            aria-pressed={betType === type}
            disabled={busy}
            onClick={() => setBetType(type)}
          >
            {betLabelOf(type)}
          </button>
        ))}
      </div>

      <div className="wheel__stage" aria-hidden="true">
        <div className="wheel__pointer" />
        <div
          className="wheel__disc"
          style={{
            background,
            transform: `rotate(${rotation}deg)`,
            transition: `transform ${spinMs}ms cubic-bezier(0.17, 0.67, 0.21, 1)`,
          }}
        >
          {segments.map((s, i) => (
            <span
              key={s.id ?? i}
              className="wheel__label"
              style={{ transform: `rotate(${segmentCenter(i, segments.length)}deg)` }}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <p className="wheel__message" aria-live="polite" aria-busy={busy}>
        {message}
      </p>

      {status === 'error' && (
        <p className="wheel__error" role="alert">
          Une erreur est survenue, réessaie.
        </p>
      )}

      {showResult && renderResult ? renderResult(gameResult, lastBet) : null}

      <BetPanel balance={balance} onPlay={handlePlay} disabled={busy || !betType} />
    </section>
  );
}
