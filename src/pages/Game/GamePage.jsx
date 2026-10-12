// Generic game page (Groupe 4 - issue #146).
// Route `/game/:gameId`. App passes the game id taken from the URL; this page
// only identifies the game through the application registry. The game itself
// (rendering, actions) belongs to Groupe 3 (`src/game-ui/`) and is plugged in
// later: nothing here knows any game rule.

import { useMemo, useState } from 'react';
import { getBalance } from '../../services/coreService.js';
import { getGameMeta } from '../../config/gameRegistry.js';
import { createGameStart } from './gameRuntime.js';
import SlotsGame from '../../game-ui/slots/SlotsGame.jsx';
import RouletteGame from '../../game-ui/roulette/RouletteGame.jsx';
import WheelGame from '../../game-ui/wheel/WheelGame.jsx';
import PlinkoGame from '../../game-ui/plinko/PlinkoGame.jsx';
import DiceGame from '../../game-ui/dice/DiceGame.jsx';
import './game.css';

// Games whose UI (Groupe 3) exists. Any other game keeps the waiting message.
export const GAME_UIS = {
  slots: SlotsGame,
  roulette: RouletteGame,
  wheel: WheelGame,
  plinko: PlinkoGame,
  dice: DiceGame,
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

// The lock lives here too (not only in the lobby): a locked game must not open
// from its URL. The unlocked list comes from the Core; if it cannot be read, the
// game stays locked.
function readUnlockedGames() {
  try {
    const ids = getUnlockedGames();
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
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

function GamePage({ gameId, unlockedGames = readUnlockedGames() }) {
  const game = typeof gameId === 'string' ? getGameMeta(gameId) : undefined;
  const GameUI = game ? GAME_UIS[game.id] : undefined;
  const [balance, setBalance] = useState(readBalance);
  // Real round (Core draw -> G2 rules -> Core settlement) when the game is
  // plugged in gameRuntime.js; otherwise the G3 UI keeps its own mock.
  const realStart = useMemo(() => (game ? createGameStart(game.id) : undefined), [game]);
  const start = useMemo(
    () =>
      realStart &&
      (async (bets) => {
        try {
          return await realStart(bets);
        } finally {
          setBalance(readBalance());
        }
      }),
    [realStart]
  );
  const locked = game ? !unlockedGames.includes(game.id) : false;
  const GameUI = game && !locked ? GAME_UIS[game.id] : undefined;

  return (
    <div className="page-game">
      <a className="game__back" href="#/">
        ← Retour au lobby
      </a>
      {game ? (
        <>
          <h1 className="game__title">{game.name}</h1>
          <p className="game__category">{game.category}</p>
          {locked ? (
            <p className="game__text game__locked" role="status">
              Jeu verrouillé
              {typeof game.unlockLevel === 'number' && ` : niveau ${game.unlockLevel} requis`}.
            </p>
          ) : GameUI ? (
            <>
              {start ? null : (
                <p className="game__demo">
                  Mode démonstration : les résultats sont simulés et le solde n&apos;est pas modifié.
                </p>
              )}
              <GameUI
                balance={balance}
                renderResult={renderResult}
                {...(start ? { start } : {})}
              />
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
    </div>
  );
}

export default GamePage;
