import './LevelBadge.css';

const formatNumber = (value) => value.toLocaleString('fr-FR');

/**
 * Displays a player level supplied by the caller, without deriving anything.
 * @param {object} props
 * @param {number} [props.level] Nonnegative level to display.
 * @param {string} [props.label] Text shown before the level (default "Niveau").
 * @param {string} [props.className] Additional wrapper class.
 * @returns {import('react').ReactElement}
 */
function LevelBadge({ level, label = 'Niveau', className = '' }) {
  const hasLevel = Number.isFinite(level) && level >= 0;

  return (
    <span className={`level-badge ${className}`.trim()}>
      {label} {hasLevel ? formatNumber(level) : '—'}
    </span>
  );
}

export default LevelBadge;
