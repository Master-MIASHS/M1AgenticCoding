// Lobby page (Groupe 4 - issue #164).
// Home screen listing the casino games. Which games are unlocked comes from the
// Core (via coreService): the page only matches the Core's list against the
// display registry and hands the result to GameCard. It never decides itself
// that a game is locked or playable.

import { useCallback, useState } from 'react';
import { getState, getLevel, getUnlockedGames } from '../../services/coreService.js';
import { GAME_REGISTRY } from '../../config/gameRegistry.js';
import GameCard from '../../components/GameCard/GameCard.jsx';
import { GAME_UIS } from '../Game/GamePage.jsx';
import PlayerHeader from '../../components/PlayerHeader/PlayerHeader.jsx';
import './lobby.css';

function loadLobby() {
  try {
    const state = getState();
    const level = getLevel();
    const unlocked = getUnlockedGames();
    return {
      data: {
        state,
        level,
        unlockedIds: new Set(Array.isArray(unlocked) ? unlocked : []),
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Erreur inconnue.',
    };
  }
}

function useLobbyData() {
  const [result, setResult] = useState(loadLobby);

  const retry = useCallback(() => {
    setResult(loadLobby());
  }, []);

  return { data: result.data, error: result.error, retry };
}

function Lobby() {
  const { data, error, retry } = useLobbyData();

  if (error) {
    return (
      <div className="page-lobby page-lobby--error">
        <h1 className="lobby__title">Lobby</h1>
        <p className="lobby__error">Impossible de charger le lobby.</p>
        <button type="button" className="lobby__retry" onClick={retry}>
          Réessayer
        </button>
      </div>
    );
  }

  const { state, level, unlockedIds } = data;

  return (
    <div className="page-lobby">
      <h1 className="lobby__title">Lobby</h1>
      <PlayerHeader
        pseudo={state?.pseudo}
        level={level}
        balance={state?.balance}
        xp={state?.xp}
        xpForNextLevel={state?.xpForNextLevel}
      />
      <h2 className="lobby__subtitle">Les jeux du casino</h2>
      <ul className="lobby__games">
        {GAME_REGISTRY.map((game) => (
          <li key={game.id} className="lobby__game">
            <GameCard
              name={game.name}
              category={game.category}
              locked={!unlockedIds.has(game.id)}
              comingSoon={!GAME_UIS[game.id]}
              unlockLevel={game.unlockLevel}
              href={`#/game/${game.id}`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Lobby;
