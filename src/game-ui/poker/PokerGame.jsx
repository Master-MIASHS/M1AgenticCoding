import { useState } from 'react';
import './poker.css';

const SUIT_SYMBOLS = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const ACTION_LABELS = {
  fold: 'Se coucher',
  check: 'Parole',
  call: 'Suivre',
  raise: 'Relancer',
};

function PlayingCard({ card, hidden = false }) {
  if (hidden || !card) {
    return (
      <div
        className="poker-card poker-card--back"
        aria-label="Carte cachée"
      >
        ?
      </div>
    );
  }

  const suit = SUIT_SYMBOLS[card.suit] ?? card.suit;
  const isRed =
    card.suit === 'hearts' || card.suit === 'diamonds';

  return (
    <div
      className={`poker-card${isRed ? ' poker-card--red' : ''}`}
      aria-label={`${card.rank} de ${card.suit}`}
    >
      <span className="poker-card__rank">{card.rank}</span>
      <span className="poker-card__suit" aria-hidden="true">
        {suit}
      </span>
    </div>
  );
}

function CardRow({ cards = [], count }) {
  return (
    <div className="poker-card-row">
      {Array.from({ length: count }, (_, index) => (
        <PlayingCard
          key={index}
          card={cards[index]}
          hidden={!cards[index]}
        />
      ))}
    </div>
  );
}

const WINNER_LABELS = { player: 'Vous', ai: "L'adversaire", tie: 'Égalité' };

// Jeu multi-étapes (contrat G2 § 1) : start([{ type: 'small-blind', amount: blind }]), puis
// action(sessionId, 'fold' | 'check' | 'call' | 'raise'). La mise d'ouverture est la blinde de
// la config (prop `blind`, jamais écrite ici). L'UI n'affiche que renderPayload.view (jamais
// les cartes de l'adversaire avant l'abattage) et availableActions ; elle ne décide rien.
// Sans `start` (jeu non branché), le jeu est indisponible : aucun mock présenté comme réel.
export default function PokerGame({ balance = 0, blind, start, action, renderResult }) {
  const [status, setStatus] = useState('idle');
  const [view, setView] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [actions, setActions] = useState([]);
  const [gameResult, setGameResult] = useState(null);

  if (typeof start !== 'function' || typeof action !== 'function' || typeof blind !== 'number') {
    return (
      <p className="poker-game" role="status">
        Poker indisponible pour le moment.
      </p>
    );
  }

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

  const loading = status === 'loading';
  const inRound = status === 'round';
  const terminal = status === 'terminal';
  const canStart = !loading && !inRound && balance >= blind;

  return (
    <section className="poker-game" aria-busy={loading}>
      <header className="poker-header">
        <div>
          <p className="poker-eyebrow">CASINO</p>
          <h2>Texas Hold’em</h2>
        </div>
        <div className="poker-balance">
          <span>Solde</span>
          <strong>{balance}</strong>
        </div>
      </header>

      {view && (
        <div className="poker-table" aria-label="Table de poker">
          <div className="poker-player poker-player--opponent">
            <span className="poker-player__name">Adversaire</span>
            {view.botChips !== undefined && (
              <span className="poker-player__chips">{view.botChips} jetons</span>
            )}
            {terminal && view.aiHand && <CardRow cards={view.aiHand} count={2} />}
          </div>

          {view.pot !== undefined && (
            <div className="poker-pot">
              <span>Pot</span>
              <strong>{view.pot}</strong>
            </div>
          )}

          <div className="poker-community">
            <p>Cartes communes</p>
            <CardRow cards={view.communityCards} count={5} />
          </div>

          <div className="poker-player poker-player--you">
            <span className="poker-player__name">Vos cartes</span>
            <CardRow cards={view.playerHand} count={2} />
            {view.playerChips !== undefined && (
              <span className="poker-player__chips">{view.playerChips} jetons</span>
            )}
          </div>
        </div>
      )}

      <div className="poker-controls">
        {view && !terminal && (
          <p>
            Étape : <strong>{view.stage}</strong>
          </p>
        )}

        {inRound && (
          <div className="poker-actions" role="group" aria-label="Actions disponibles">
            {actions.map((name) => (
              <button
                key={name}
                type="button"
                className={`poker-action poker-action--${name}`}
                disabled={loading}
                onClick={() => run(() => action(sessionId, name))}
              >
                {ACTION_LABELS[name] ?? name}
              </button>
            ))}
          </div>
        )}

        {terminal && (
          <p role="status">
            Partie terminée{view?.winner ? ` — vainqueur : ${WINNER_LABELS[view.winner] ?? view.winner}` : ''}.
          </p>
        )}
        {terminal && renderResult ? renderResult(gameResult, view?.totalBet ?? blind) : null}

        {status === 'error' && <p role="alert">Action impossible, réessaie.</p>}

        {!inRound && (
          <button
            type="button"
            className="poker-action"
            disabled={!canStart}
            onClick={() => run(() => start([{ type: 'small-blind', amount: blind }]))}
          >
            {terminal ? 'Nouvelle main' : 'Jouer'} (blinde {blind})
          </button>
        )}
      </div>
    </section>
  );
}
