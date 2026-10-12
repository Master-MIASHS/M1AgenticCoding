import { useState } from 'react';
import BetPanel from '../common/BetPanel.jsx';
import { mockStart, mockAction } from './videoPoker.mock.js';
import './videoPoker.css';

// Traduction visuelle : G2 n'envoie que { rank, suit }, des identifiants d'action et la
// catégorie de evaluatePokerHand() (1 à 10). Le nom de la main est un simple libellé.
const SUITS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const RED_SUITS = new Set(['hearts', 'diamonds']);
const HAND_NAMES = {
  10: 'Quinte royale',
  9: 'Quinte flush',
  8: 'Carré',
  7: 'Full',
  6: 'Couleur',
  5: 'Quinte',
  4: 'Brelan',
  3: 'Double paire',
  2: 'Paire',
  1: 'Carte haute',
};

// Jeu multi-étapes (contrat G2 § 1) : start(bets), puis action(sessionId, 'hold-<i>') pour
// garder / relâcher la carte i, puis action(sessionId, 'draw'). L'état « gardée » est lu dans
// view.held, jamais stocké ici ; une carte n'est cliquable que si son action est disponible.
// status : "playing" (prêt à miser) | "loading" | "round" (choix des cartes) | "terminal" | "error"
// renderResult(gameResult, bet) : gain affiché = bet × gameResult.multiplier
export default function VideoPokerGame({
  balance,
  start = mockStart,
  action = mockAction,
  renderResult,
}) {
  const [status, setStatus] = useState('playing');
  const [view, setView] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [actions, setActions] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [lastBet, setLastBet] = useState(null);

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

  const handlePlay = (bet) => {
    setLastBet(bet);
    run(() => start([{ type: 'main', amount: bet }]));
  };

  const send = (playerAction) => run(() => action(sessionId, playerAction));

  const loading = status === 'loading';
  const inRound = status === 'round';
  const hand = view?.hand ?? [];
  const held = view?.held ?? [];
  const category = view?.result?.category;

  let message = 'Mise pour recevoir 5 cartes.';
  if (inRound) message = 'Clique sur les cartes à garder, puis tire.';
  else if (status === 'terminal' && category != null) message = HAND_NAMES[category] ?? `Main ${category}`;

  return (
    <section className="video-poker">
      <div className="video-poker__hand" aria-live="polite" aria-busy={loading}>
        {hand.length === 0 &&
          Array.from({ length: 5 }, (_, i) => <span key={i} className="video-poker__card video-poker__card--back" />)}
        {hand.map((c, i) => {
          const holdAction = `hold-${i}`;
          const canToggle = inRound && actions.includes(holdAction);
          const isHeld = held[i] === true;
          return (
            <button
              key={`${c.rank}-${c.suit}-${i}`}
              type="button"
              className={`video-poker__card${RED_SUITS.has(c.suit) ? ' video-poker__card--red' : ''}${isHeld ? ' video-poker__card--held' : ''}`}
              aria-pressed={isHeld}
              aria-label={`${c.rank} ${c.suit}${isHeld ? ', gardée' : ''}`}
              disabled={!canToggle}
              onClick={() => send(holdAction)}
            >
              <span className="video-poker__rank">
                {c.rank}
                {SUITS[c.suit] ?? c.suit}
              </span>
              {isHeld && <span className="video-poker__held">GARDÉE</span>}
            </button>
          );
        })}
      </div>

      <p className="video-poker__message">{message}</p>

      {inRound && actions.includes('draw') && (
        <div className="video-poker__actions">
          <button type="button" className="video-poker__draw" onClick={() => send('draw')}>
            Tirer
          </button>
        </div>
      )}

      {status === 'error' && (
        <p className="video-poker__error" role="alert">
          Une erreur est survenue, réessaie.
        </p>
      )}

      {status === 'terminal' && renderResult ? renderResult(gameResult, lastBet) : null}

      <BetPanel balance={balance} onPlay={handlePlay} disabled={loading || inRound} />
    </section>
  );
}
