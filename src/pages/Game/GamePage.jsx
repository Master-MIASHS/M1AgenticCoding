// Generic game page (Groupe 4 - issue #146).
// Route `/game/:gameId`. App passes the game id taken from the URL; this page
// only identifies the game through the application registry. The game itself
// (rendering, actions) belongs to Groupe 3 (`src/game-ui/`) and is plugged in
// later: nothing here knows any game rule.

import { getGameMeta } from '../../config/gameRegistry.js';
import './game.css';

function GamePage({ gameId }) {
  const game = typeof gameId === 'string' ? getGameMeta(gameId) : undefined;

  return (
    <main className="page-game">
      <a className="game__back" href="#/">
        ← Retour au lobby
      </a>
      {game ? (
        <>
          <h1 className="game__title">{game.name}</h1>
          <p className="game__category">{game.category}</p>
          <p className="game__text">Ce jeu sera bientôt jouable.</p>
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
