// Progression page (Groupe 4).
// Displays the player progression exposed by the Core contract (via
// coreService) and the games display registry. No XP / level / unlock
// business logic here: values are consumed as provided by the Core and
// missing contract fields degrade gracefully (neutral XP bar, fallbacks).
//
// The screen is structured in small sections so future additions (reward
// tiers, XP history, achievements, upcoming unlocks) can slot in without
// reworking the existing blocks.

import { useCallback, useState } from 'react';
import { getState, getLevel, getUnlockedGames } from '../../services/coreService.js';
import { GAME_REGISTRY } from '../../config/gameRegistry.js';
import { formatNumber, getLevelProgress, splitGamesByUnlock } from './progression.utils.js';
import XPBar from '../../components/XPBar/XPBar';
import './progression.css';

function loadProgression() {
  try {
    const state = getState();
    const level = getLevel();
    const unlockedGames = getUnlockedGames();
    return { data: { state, level, unlockedGames }, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Erreur inconnue.',
    };
  }
}

function useProgressionData() {
  const [result, setResult] = useState(loadProgression);

  const retry = useCallback(() => {
    setResult(loadProgression());
  }, []);

  return { data: result.data, error: result.error, retry };
}

function ProgressionHeader({ state, level }) {
  return (
    <header className="progression__header">
      <div className="progression__level">
        <span className="progression__level-label">Niveau actuel</span>
        <span className="progression__level-value">Niv. {formatNumber(level)}</span>
      </div>
      <dl className="progression__xp-details">
        <div className="progression__xp-detail">
          <dt>XP actuelle</dt>
          <dd>{formatNumber(state.xp)}</dd>
        </div>
        <div className="progression__xp-detail">
          <dt>Nécessaire pour le niveau suivant</dt>
          <dd>
            {typeof state.xpForNextLevel === 'number' && Number.isFinite(state.xpForNextLevel)
              ? `${formatNumber(state.xpForNextLevel)} XP`
              : 'À définir par le Core'}
          </dd>
        </div>
      </dl>
      <XPBar level={level} xp={state.xp} xpForNextLevel={state.xpForNextLevel} />
    </header>
  );
}

function GameCard({ game, locked }) {
  const requiredLevel = locked ? game.unlockLevel : null;

  return (
    <li className={'progression__game' + (locked ? ' progression__game--locked' : '')}>
      <span className="progression__game-icon" aria-hidden="true">
        {locked ? '🔒' : '🎮'}
      </span>
      <span className="progression__game-name">{game.name}</span>
      {game.category && (
        <span className="progression__game-category">{game.category}</span>
      )}
      {requiredLevel !== null && requiredLevel !== undefined && (
        <span className="progression__game-level">
          Niveau {formatNumber(requiredLevel)} requis
        </span>
      )}
    </li>
  );
}

function GamesSection({ id, title, games, locked }) {
  const emptyMessage = locked
    ? 'Tous les jeux sont débloqués.'
    : 'Aucun jeu débloqué pour le moment.';

  return (
    <section className="progression__section" aria-labelledby={id}>
      <h2 id={id} className="progression__section-title">
        {title}
        <span className="progression__section-count" aria-hidden="true">
          {games.length}
        </span>
      </h2>
      {games.length === 0 ? (
        <p className="progression__empty">{emptyMessage}</p>
      ) : (
        <ul className="progression__games">
          {games.map((game) => (
            <GameCard key={game.id} game={game} locked={locked} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Progression() {
  const { data, error, retry } = useProgressionData();

  if (error) {
    return (
      <div className="page-progression">
        <h1 className="progression__title">Ma progression</h1>
        <div className="progression__error" role="alert">
          <p>Impossible de charger votre progression.</p>
          <p className="progression__error-detail">{error}</p>
          <button type="button" className="progression__retry" onClick={retry}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-progression">
        <h1 className="progression__title">Ma progression</h1>
        <p className="progression__empty">Aucune donnée de progression disponible.</p>
      </div>
    );
  }

  const { state, level, unlockedGames } = data;
  const { unlocked, locked } = splitGamesByUnlock(GAME_REGISTRY, unlockedGames);

  return (
    <div className="page-progression">
      <h1 className="progression__title">Ma progression</h1>
      <ProgressionHeader state={state} level={level} />
      <GamesSection
        id="progression-unlocked"
        title="Jeux débloqués"
        games={unlocked}
        locked={false}
      />
      <GamesSection
        id="progression-locked"
        title="Jeux verrouillés"
        games={locked}
        locked
      />
    </div>
  );
}

export default Progression;
