import { useEffect, useRef } from 'react';
import './Loader.css';

/** Loading indicator. Overlay blocks pointer and keyboard interaction until unmounted.
 * @param {{label?: string, size?: 'sm'|'md'|'lg', showLabel?: boolean, variant?: 'inline'|'overlay'}} props
 */
export default function Loader({
  label = 'Chargement…',
  size = 'md',
  showLabel = true,
  variant = 'inline',
}) {
  const dialogRef = useRef(null);
  const overlay = variant === 'overlay';
  const sizeName = ['sm', 'md', 'lg'].includes(size) ? size : 'md';
  const text = typeof label === 'string' && label.trim() ? label : 'Chargement…';
  useEffect(() => {
    if (!overlay) return;
    const dialog = dialogRef.current;
    const previous = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, [overlay]);
  const indicator = (
    <span className={`ui-loader ui-loader--${sizeName}`} role="status" aria-live="polite">
      <span className="ui-loader__spinner" aria-hidden="true" />
      <span className={showLabel ? 'ui-loader__label' : 'ui-loader__sr-only'}>{text}</span>
    </span>
  );
  return overlay ? (
    <dialog
      ref={dialogRef}
      className="ui-loader__overlay"
      aria-label={text}
      aria-busy="true"
      onCancel={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {indicator}
    </dialog>
  ) : (
    indicator
  );
}
