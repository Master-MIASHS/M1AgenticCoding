
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

export default function PokerGame({
  balance = 0,
  renderPayload,
  renderResult,
  onAction,
}) {
  const view = renderPayload?.view;
  const error = renderPayload?.error;
  const terminal =
    view?.phase === 'result' || renderPayload?.terminal === true;
  const availableActions = Array.isArray(view?.availableActions)
    ? view.availableActions
    : [];

  if (error) {
    return (
      <main className="poker-game" role="alert">
        <h1>Impossible de charger la partie</h1>
        <p>{error.message ?? String(error)}</p>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="poker-game" aria-live="polite">
        <p role="status">Chargement de la partie de poker…</p>
      </main>
    );
  }

  return (
    <main className="poker-game">
      <header className="poker-header">
        <div>
          <p className="poker-eyebrow">CASINO</p>
          <h1>Texas Hold’em</h1>
        </div>

        <div className="poker-balance">
          <span>Solde</span>
          <strong>{balance}</strong>
        </div>
      </header>

      <section className="poker-table" aria-label="Table de poker">
        <div className="poker-player poker-player--opponent">
          <span className="poker-player__name">Adversaire</span>
          <span className="poker-player__chips">
            {view.botChips ?? '—'} jetons
          </span>

          {terminal && view.aiHand && (
            <CardRow cards={view.aiHand} count={2} />
          )}
        </div>

        <div className="poker-pot">
          <span>Pot</span>
          <strong>{view.pot ?? '—'}</strong>
        </div>

        <div className="poker-community">
          <p>Cartes communes</p>
          <CardRow cards={view.communityCards} count={5} />
        </div>

        <div className="poker-player poker-player--you">
          <span className="poker-player__name">Vos cartes</span>
          <CardRow cards={view.playerHand} count={2} />
          <span className="poker-player__chips">
            {view.playerChips ?? '—'} jetons
          </span>
        </div>
      </section>

      <section
        className="poker-controls"
        aria-label="Commandes de la partie"
      >
        <p>
          Étape : <strong>{view.stage ?? 'Résultat'}</strong>
        </p>

        <p>
          Mise actuelle :{' '}
          <strong>{view.currentBet ?? view.totalBet ?? '—'}</strong>
        </p>

        {terminal ? (
          <>
            <p role="status">
              Partie terminée
              {view.winner ? ` — vainqueur : ${view.winner}` : ''}.
            </p>

            {renderResult && renderPayload?.gameResult
              ? renderResult(
                  renderPayload.gameResult,
                  view.totalBet
                )
              : null}
          </>
        ) : (
          <div
            className="poker-actions"
            role="group"
            aria-label="Actions disponibles"
          >
            {availableActions.map((actionName) => (
              <button
                key={actionName}
                type="button"
                className={`poker-action poker-action--${actionName}`}
                onClick={() => onAction?.(actionName)}
                disabled={!onAction}
                title={
                  !onAction
                    ? 'Les actions ne sont pas encore connectées'
                    : undefined
                }
              >
                {ACTION_LABELS[actionName] ?? actionName}
              </button>
            ))}

            {availableActions.length === 0 && (
              <p>Aucune action disponible pour le moment.</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}