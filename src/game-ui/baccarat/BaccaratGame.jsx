import { useEffect, useRef, useState } from 'react';
import BetPanel from '../common/BetPanel.jsx';
import { mockStart } from './baccarat.mock.js';
import './baccarat.css';

// Traduction visuelle : G2 n'envoie que { rank, suit } et des identifiants.
const SUITS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const RED_SUITS = new Set(['hearts', 'diamonds']);
const CHOICES = [
  { id: 'player', label: 'Joueur' },
  { id: 'banker', label: 'Banque' },
  { id: 'tie', label: 'Égalité' },
];
const WINNER_LABELS = { player: 'Le Joueur gagne', banker: 'La Banque gagne', tie: 'Égalité' };

// Délai entre deux cartes révélées : minuterie (comme la roue, le plinko et les dés).
const CARD_MS = 450;
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Card({ card }) {
  return (
    <span className={`baccarat__card${RED_SUITS.has(card.suit) ? ' baccarat__card--red' : ''}`}>
      {card.rank}
      {SUITS[card.suit] ?? card.suit}
    </span>
  );
}

// Ordre de distribution réel : joueur, banque, joueur, banque, puis les troisièmes cartes.
function dealOrder(details) {
  const order = [];
  for (let i = 0; i < 2; i += 1) {
    order.push(['player', i], ['banker', i]);
  }
  if (details.playerHand.length > 2) order.push(['player', 2]);
  if (details.bankerHand.length > 2) order.push(['banker', 2]);
  return order;
}

// Jeu instantané (contrat G2 § 1) : start([{ type: 'player' | 'banker' | 'tie', amount }]).
// Mains, totaux et gagnant lus dans gameResult.details (les mêmes données que la view() des
// règles #391 ; jamais le paquet, #168). L'UI ne tire aucune carte et ne décide rien.
// status : "playing" (prêt à jouer) | "loading" | "terminal" | "error"
// renderResult(gameResult, bet) : gain affiché = bet × gameResult.multiplier
export default function BaccaratGame({ balance, start = mockStart, renderResult }) {
  const [status, setStatus] = useState('playing');
  const [choice, setChoice] = useState(null);
  const [details, setDetails] = useState(null);
  const [shown, setShown] = useState(0);
  const [gameResult, setGameResult] = useState(null);
  const [lastBet, setLastBet] = useState(null);
  const dealTimer = useRef(null);

  useEffect(() => () => clearInterval(dealTimer.current), []);

  const handlePlay = async (bet) => {
    setStatus('loading');
    setLastBet(bet);
    clearInterval(dealTimer.current);
    try {
      const res = await start([{ type: choice, amount: bet }]);
      const nextDetails = res.gameResult?.details ?? null;
      const total = nextDetails ? dealOrder(nextDetails).length : 0;
      setDetails(nextDetails);
      setGameResult(res.gameResult ?? null);
      if (total > 0 && !prefersReducedMotion()) {
        setShown(1);
        dealTimer.current = setInterval(() => {
          setShown((current) => {
            if (current + 1 >= total) clearInterval(dealTimer.current);
            return Math.min(current + 1, total);
          });
        }, CARD_MS);
      } else {
        setShown(total);
      }
      setStatus('terminal');
    } catch {
      setStatus('error');
    }
  };

  const loading = status === 'loading';
  const order = details ? dealOrder(details) : [];
  const dealing = status === 'terminal' && shown < order.length;
  const busy = loading || dealing;
  const showResult = status === 'terminal' && !dealing;
  const visible = (side) =>
    order.slice(0, shown).filter(([s]) => s === side).map(([, i]) => details[`${side}Hand`][i]);

  let message = 'Choisis ton pari puis distribue.';
  if (loading) message = 'Le croupier distribue…';
  else if (dealing) message = 'Distribution…';
  else if (showResult && details) message = `${WINNER_LABELS[details.winner] ?? details.winner}${details.natural ? ' (naturel)' : ''}`;

  return (
    <section className="baccarat">
      <div className="baccarat__choices" role="group" aria-label="Pari">
        {CHOICES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`baccarat__choice${choice === id ? ' baccarat__choice--active' : ''}`}
            aria-pressed={choice === id}
            disabled={busy}
            onClick={() => setChoice(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="baccarat__table" aria-live="polite" aria-busy={busy}>
        {[
          ['player', 'Joueur', 'playerTotal'],
          ['banker', 'Banque', 'bankerTotal'],
        ].map(([side, title, totalKey]) => (
          <div
            key={side}
            className={`baccarat__hand${showResult && details?.winner === side ? ' baccarat__hand--winner' : ''}`}
          >
            <p className="baccarat__title">
              {title}
              {showResult && details && <span className="baccarat__total"> : {details[totalKey]}</span>}
            </p>
            <div className="baccarat__cards">
              {details &&
                visible(side).map((c, i) => <Card key={`${c.rank}-${c.suit}-${i}`} card={c} />)}
            </div>
          </div>
        ))}
      </div>

      <p className="baccarat__message">{message}</p>

      {status === 'error' && (
        <p className="baccarat__error" role="alert">
          Une erreur est survenue, réessaie.
        </p>
      )}

      {showResult && renderResult ? renderResult(gameResult, lastBet) : null}

      <BetPanel balance={balance} onPlay={handlePlay} disabled={busy || !choice} />
    </section>
  );
}
