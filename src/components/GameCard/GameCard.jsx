import './GameCard.css';

const FALLBACK_NAME = 'Jeu';

/**
 * Card for one game in the lobby, either playable or locked. The caller
 * decides whether the game is locked; the card never reads the Core.
 * @param {object} props
 * @param {string} [props.name] Game name (fallback "Jeu").
 * @param {string} [props.category] Optional category shown in small text.
 * @param {boolean} [props.locked] True when the game cannot be played yet.
 * @param {boolean} [props.comingSoon] True when the game is unlocked but has no screen yet.
 * A locked card stays locked: `locked` takes precedence over `comingSoon`.
 * @param {number} [props.unlockLevel] Level required, shown when locked.
 * @param {string} [props.href] Link to the game, supplied by the caller.
 * @param {Function} [props.onSelect] Called when a playable card is selected.
 * @param {string} [props.className] Additional wrapper class.
 * @returns {import('react').ReactElement}
 */
function GameCard({
  name,
  category,
  locked = false,
  comingSoon = false,
  unlockLevel,
  href,
  onSelect,
  className = '',
}) {
  const title = typeof name === 'string' && name.trim() ? name : FALLBACK_NAME;
  const hasLevel = Number.isFinite(unlockLevel) && unlockLevel > 0;
  const soon = comingSoon && !locked;
  const classes =
    `game-card${locked ? ' game-card--locked' : ''}${soon ? ' game-card--soon' : ''} ${className}`.trim();

  let action;
  if (locked) {
    action = (
      <button type="button" className="game-card__action" disabled aria-disabled="true">
        {hasLevel ? `Niveau ${unlockLevel.toLocaleString('fr-FR')} requis` : 'Verrouillé'}
      </button>
    );
  } else if (soon) {
    action = (
      <button type="button" className="game-card__action" disabled aria-disabled="true">
        Bientôt
      </button>
    );
  } else if (href) {
    action = (
      <a className="game-card__action" href={href} onClick={onSelect} aria-label={`Jouer à ${title}`}>
        Jouer
      </a>
    );
  } else {
    action = (
      <button type="button" className="game-card__action" onClick={onSelect} aria-label={`Jouer à ${title}`}>
        Jouer
      </button>
    );
  }

  return (
    <article className={classes}>
      <p className="game-card__name">{title}</p>
      {category && <p className="game-card__category">{category}</p>}
      {action}
    </article>
  );
}

export default GameCard;
