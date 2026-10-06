import LevelBadge from '../LevelBadge/LevelBadge.jsx';
import BalanceDisplay from '../BalanceDisplay/BalanceDisplay.jsx';
import XPBar from '../XPBar/XPBar.jsx';
import './PlayerHeader.css';

const FALLBACK_PSEUDO = 'Joueur Fantôme';

/**
 * Summary of the player (name, level, balance, XP progress) assembled from the
 * common components. It reads nothing from the Core and computes nothing: the
 * caller supplies every value, and each missing value only degrades its own
 * part of the header.
 * @param {object} props
 * @param {string} [props.pseudo] Player name (fallback "Joueur Fantôme").
 * @param {number} [props.level] Passed to LevelBadge.
 * @param {number} [props.balance] Passed to BalanceDisplay.
 * @param {number} [props.xp] Passed to XPBar.
 * @param {number} [props.xpForNextLevel] Passed to XPBar.
 * @param {string} [props.className] Additional wrapper class.
 * @returns {import('react').ReactElement}
 */
function PlayerHeader({ pseudo, level, balance, xp, xpForNextLevel, className = '' }) {
  const name = typeof pseudo === 'string' && pseudo.trim() ? pseudo.trim() : FALLBACK_PSEUDO;
  const initial = Array.from(name)[0].toUpperCase();

  return (
    <section className={`player-header ${className}`.trim()} aria-label="Résumé du joueur">
      <div className="player-header__avatar" aria-hidden="true">
        {initial}
      </div>
      <div className="player-header__identity">
        <p className="player-header__pseudo">{name}</p>
        <div className="player-header__badges">
          <LevelBadge level={level} />
          <BalanceDisplay balance={balance} />
        </div>
      </div>
      <div className="player-header__xp">
        <XPBar xp={xp} xpForNextLevel={xpForNextLevel} />
      </div>
    </section>
  );
}

export default PlayerHeader;
