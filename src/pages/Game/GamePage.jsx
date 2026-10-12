// Generic game page (Groupe 4 - issue #146).
// Route `/game/:gameId`. App passes the game id taken from the URL; this page
// only identifies the game through the application registry. The game itself
// (rendering, actions) belongs to Groupe 3 (`src/game-ui/`) and is plugged in
// later: nothing here knows any game rule.

import { useMemo, useState } from 'react';
import { getBalance, getUnlockedGames } from '../../services/coreService.js';
import { getGameMeta } from '../../config/gameRegistry.js';
import { createGameRuntime } from './gameRuntime.js';
import SlotsGame from '../../game-ui/slots/SlotsGame.jsx';
import RouletteGame from '../../game-ui/roulette/RouletteGame.jsx';
import WheelGame from '../../game-ui/wheel/WheelGame.jsx';
import PlinkoGame from '../../game-ui/plinko/PlinkoGame.jsx';
import DiceGame from '../../game-ui/dice/DiceGame.jsx';
import ScratchGame from '../../game-ui/scratch/ScratchGame.jsx';
import BlackjackGame from '../../game-ui/blackjack/BlackjackGame.jsx';
import VideoPokerGame from '../../game-ui/video-poker/VideoPokerGame.jsx';
import MemoryGame from '../../game-ui/memory/MemoryGame.jsx';
import QuizGame from '../../game-ui/quiz/QuizGame.jsx';
import BingoGame from '../../game-ui/bingo/BingoGame.jsx';
import BaccaratGame from '../../game-ui/baccarat/BaccaratGame.jsx';
import PokerGame from '../../game-ui/poker/PokerGame.jsx';
import './game.css';

// Games whose UI (Groupe 3) exists. Any other game keeps the waiting message.
export const GAME_UIS = {
  slots: SlotsGame,
  roulette: RouletteGame,
  wheel: WheelGame,
  plinko: PlinkoGame,
  dice: DiceGame,
  scratch: ScratchGame,
  blackjack: BlackjackGame,
  'video-poker': VideoPokerGame,
  memory: MemoryGame,
  quiz: QuizGame,
  bingo: BingoGame,
  baccarat: BaccaratGame,
  poker: PokerGame,
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

// Props that a UI needs from the game config (never recomputed in the UI).
function configProps(gameId, config) {
  if (gameId === 'wheel') {
    return { segments: config.segments, betTypes: Object.keys(config.paytable) };
  }
  if (gameId === 'plinko') return { paytable: config.paytable };
  if (gameId === 'poker') return { blind: config.smallBlind };
  return {};
}

function GamePage({ gameId, unlockedGames = readUnlockedGames(), onPlayerUpdated }) {
  const game = typeof gameId === 'string' ? getGameMeta(gameId) : undefined;
  const [balance, setBalance] = useState(readBalance);
  // ONE runtime per game page: start() and action() share the same instance.
  // `onPlayerUpdated` must be stable (App memoizes it), otherwise the runtime,
  // and so the session of a multi-step round, would be recreated.
  const runtime = useMemo(
    () =>
      game
        ? createGameRuntime(game.id, undefined, () => {
            setBalance(readBalance());
            if (typeof onPlayerUpdated === 'function') onPlayerUpdated();
          })
        : undefined,
    [game, onPlayerUpdated]
  );
  // An unusable list keeps every game locked (never the other way round).
  const unlocked = Array.isArray(unlockedGames) ? unlockedGames : [];
  const locked = game ? !unlocked.includes(game.id) : false;
  const GameUI = game && !locked && runtime ? GAME_UIS[game.id] : undefined;

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
            <GameUI
              balance={balance}
              renderResult={renderResult}
              start={runtime.start}
              {...(runtime.action ? { action: runtime.action } : {})}
              {...configProps(game.id, runtime.config)}
            />
          ) : (
            <p className="game__text">Ce jeu est indisponible pour le moment.</p>
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