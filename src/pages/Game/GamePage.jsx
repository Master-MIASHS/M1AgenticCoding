// Generic game page (Groupe 4 - issue #146).
// Route `/game/:gameId`. App passes the game id taken from the URL; this page
// only identifies the game through the application registry. The game itself
// (rendering, actions) belongs to Groupe 3 (`src/game-ui/`) and is plugged in
// later: nothing here knows any game rule.

import { getBalance } from '../../services/coreService.js';
import { getGameMeta } from '../../config/gameRegistry.js';
import SlotsGame from '../../game-ui/slots/SlotsGame.jsx';
import RouletteGame from '../../game-ui/roulette/RouletteGame.jsx';
import WheelGame from '../../game-ui/wheel/WheelGame.jsx';
import './game.css';

// Games whose UI (Groupe 3) exists. Any other game keeps the waiting message.
const GAME_UIS = {
  slots: SlotsGame,
  roulette: RouletteGame,
  wheel: WheelGame,
};

const OUTCOME_LABELS = { win: 'Gagné', loss: 'Perdu', push: 'Égalité' };

function readBalance() {
  try {
    const balance = getBalance();
    return typeof balance === 'number' && Number.isFinite(balance) ? balance : 0;
  } catch {
    return 0;
  }
}

// Display only: the outcome and multiplier come from the game result.
function renderResult(gameResult) {
  if (!gameResult) {
    return null;
  }
  const label = OUTCOME_LABELS[gameResult.outcome] ?? 'Résultat';
  return (
    <p className="game__result" role="status">
      {label}
      {typeof gameResult.multiplier === 'number' && ` (x${gameResult.multiplier})`}
    </p>
  );
}

function GamePage({ gameId }) {
  const game = typeof gameId === 'string' ? getGameMeta(gameId) : undefined;
  const GameUI = game ? GAME_UIS[game.id] : undefined;

  return (
    <main className="page-game">
      <a className="game__back" href="#/">
        ← Retour au lobby
      </a>
      {game ? (
        <>
          <h1 className="game__title">{game.name}</h1>
          <p className="game__category">{game.category}</p>
          {GameUI ? (
            <>
              <p className="game__demo">
                Mode démonstration : les résultats sont simulés et le solde n&apos;est pas modifié.
              </p>
              <GameUI balance={readBalance()} renderResult={renderResult} />
            </>
          ) : (
            <p className="game__text">Ce jeu sera bientôt jouable.</p>
          )}
        </>
      ) : (
        <>
          <h1 className="game__title">Jeu introuvable</h1>
          <p className="game__text">
            Aucun jeu ne correspond à cet identifiant.
          </p>
        </>
      )}
    </main>
  );
}

export default GamePage;
