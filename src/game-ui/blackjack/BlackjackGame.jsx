import { useState } from 'react';
import BetPanel from '../common/BetPanel.jsx';
import { mockStart, mockAction } from './blackjack.mock.js';
import './blackjack.css';

// Traduction visuelle : G2 n'envoie que { rank, suit } et des identifiants d'action.
const SUITS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const RED_SUITS = new Set(['hearts', 'diamonds']);
const ACTION_LABELS = { hit: 'Tirer', stand: 'Rester', double: 'Doubler' };
const actionLabel = (id) => ACTION_LABELS[id] ?? id;

function Card({ card }) {
  return (
    <span className={`blackjack__card${RED_SUITS.has(card.suit) ? ' blackjack__card--red' : ''}`}>
      {card.rank}
      {SUITS[card.suit] ?? card.suit}
    </span>
  );
}

function Hand({ title, cards = [], hidden = 0, total }) {
  return (
    <div className="blackjack__hand">
      <p className="blackjack__hand-title">
        {title}
        {typeof total === 'number' && <span className="blackjack__total"> : {total}</span>}
      </p>
      <div className="blackjack__cards">
        {cards.map((card, index) => (
          <Card key={`${card.rank}-${card.suit}-${index}`} card={card} />
        ))}
        {Array.from({ length: hidden }, (_, index) => (
          <span key={`hidden-${index}`} className="blackjack__card blackjack__card--back" aria-label="carte cachée" />
        ))}
      </div>
    </div>
  );
}

// Jeu multi-étapes (contrat G2 § 1) : start(bets) puis action(sessionId, playerAction)
// jusqu'à terminal: true. Les boutons ne viennent que de availableActions ; les cartes ne
// viennent que de renderPayload.view (jamais la carte cachée du croupier, #168).
// status : "playing" (prêt à miser) | "loading" | "round" (manche en cours) | "terminal" | "error"
// renderResult(gameResult, bet) : bet = mise réellement engagée (details.totalBet, doublée
// après « Doubler »), gain affiché = bet × gameResult.multiplier.
export default function BlackjackGame({
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

  const apply = (res) => {
    setView(res.renderPayload?.view ?? null);
    setSessionId(res.sessionId ?? null);
    if (res.terminal) {
      setActions([]);
      setGameResult(res.gameResult ?? null);
      setStatus('terminal');
    } else {
      setActions(Array.isArray(res.availableActions) ? res.availableActions : []);
      setStatus('round');
    }
  };

  const run = async (call) => {
    setStatus('loading');
    try {
      apply(await call());
    } catch {
      setStatus('error');
    }
  };

  const handlePlay = (bet) => {
    setLastBet(bet);
    setGameResult(null);
    run(() => start([{ type: 'main', amount: bet }]));
  };

  const handleAction = (playerAction) => run(() => action(sessionId, playerAction));

  const loading = status === 'loading';
  const inRound = status === 'round';
  const engagedBet = gameResult?.details?.totalBet ?? lastBet;

  let message = 'Mise pour recevoir tes cartes.';
  if (loading) message = 'Le croupier distribue…';
  else if (status === 'round') message = 'À toi de jouer.';
  else if (status === 'terminal' && view?.natural) message = 'Blackjack !';

  return (
    <section className="blackjack">
      <div className="blackjack__table" aria-live="polite" aria-busy={loading}>
        <Hand
          title="Croupier"
          cards={view?.dealerHand ?? []}
          hidden={view?.dealerHiddenCards ?? 0}
          total={view?.dealerTotal}
        />
        <Hand title="Toi" cards={view?.playerHand ?? []} total={view?.playerTotal} />
      </div>

      <p className="blackjack__message">{message}</p>

      {status === 'round' && (
        <div className="blackjack__actions" role="group" aria-label="Actions">
          {actions.map((id) => (
            <button key={id} type="button" className="blackjack__action" onClick={() => handleAction(id)}>
              {actionLabel(id)}
            </button>
          ))}
        </div>
      )}

      {status === 'error' && (
        <p className="blackjack__error" role="alert">
          Une erreur est survenue, réessaie.
        </p>
      )}

      {status === 'terminal' && renderResult ? renderResult(gameResult, engagedBet) : null}

      <BetPanel balance={balance} onPlay={handlePlay} disabled={loading || inRound} />
    </section>
  );
}
