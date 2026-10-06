import './XPBar.css';

const formatNumber = (value) => value.toLocaleString('fr-FR');

/**
 * Displays supplied XP values on the same scale, without deriving levels.
 * @param {object} props
 * @param {number} [props.xp] Current nonnegative XP.
 * @param {number} [props.xpForNextLevel] Positive target supplied by the caller.
 * @param {number} [props.level] Optional level to display.
 * @param {string} [props.className] Additional wrapper class.
 * @returns {import('react').ReactElement}
 */
function XPBar({ xp, xpForNextLevel, level, className = '' }) {
  const hasXP = Number.isFinite(xp) && xp >= 0;
  const hasTarget = Number.isFinite(xpForNextLevel) && xpForNextLevel > 0;
  const hasLevel = Number.isFinite(level) && level >= 0;
  const percent = hasXP && hasTarget ? Math.min(xp / xpForNextLevel, 1) * 100 : null;
  const text = `${hasXP ? formatNumber(xp) : '—'} / ${hasTarget ? formatNumber(xpForNextLevel) : '—'} XP`;

  return (
    <div className={`xp-bar ${className}`.trim()}>
      <div className="xp-bar__label">
        <span>{text}</span>
        {hasLevel && <span>Niv. {formatNumber(level)}</span>}
      </div>
      <div
        className="xp-bar__track"
        role="progressbar"
        aria-label="Progression d’expérience vers le niveau suivant"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        aria-valuetext={percent === null ? `${text} — Progression indisponible` : text}
      >
        {percent !== null && <div className="xp-bar__fill" style={{ width: `${percent}%` }} />}
      </div>
      {percent === null && <span className="xp-bar__status">Progression indisponible</span>}
    </div>
  );
}

export default XPBar;
