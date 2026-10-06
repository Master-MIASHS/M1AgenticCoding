import './BalanceDisplay.css';

const formatNumber = (value) => value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

/**
 * Displays a player balance supplied by the caller, without any currency
 * (the Core contract does not define one) and without computing anything.
 * @param {object} props
 * @param {number} [props.balance] Balance to display.
 * @param {string} [props.label] Text shown before the balance (default "Solde").
 * @param {string} [props.className] Additional wrapper class.
 * @returns {import('react').ReactElement}
 */
function BalanceDisplay({ balance, label = 'Solde', className = '' }) {
  const hasBalance = Number.isFinite(balance);

  return (
    <span className={`balance-display ${className}`.trim()}>
      {label} <strong className="balance-display__value">{hasBalance ? formatNumber(balance) : '—'}</strong>
    </span>
  );
}

export default BalanceDisplay;
