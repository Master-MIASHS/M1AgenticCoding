import './Loader.css';

/** Accessible loading indicator. Parent controls when it is mounted.
 * @param {{label?: string, size?: 'sm'|'md'|'lg', showLabel?: boolean}} props
 */
export default function Loader({ label = 'Chargement…', size = 'md', showLabel = true }) {
  const variant = ['sm', 'md', 'lg'].includes(size) ? size : 'md';
  const text = typeof label === 'string' && label.trim() ? label : 'Chargement…';
  return (
    <span className={`ui-loader ui-loader--${variant}`} role="status" aria-live="polite">
      <span className="ui-loader__spinner" aria-hidden="true" />
      <span className={showLabel ? 'ui-loader__label' : 'ui-loader__sr-only'}>{text}</span>
    </span>
  );
}
