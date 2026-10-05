import './Notification.css';

const labels = { info: 'Information', success: 'Succès', warning: 'Attention', error: 'Erreur' };

/** Presentational message. Parent removes it when onClose is called.
 * @param {{type?: 'info'|'success'|'warning'|'error', children: import('react').ReactNode, onClose?: Function}} props
 */
export default function Notification({ type = 'info', children, onClose }) {
  const variant = Object.hasOwn(labels, type) ? type : 'info';
  return (
    <div className={`ui-notification ui-notification--${variant}`}>
      <div role={variant === 'error' ? 'alert' : 'status'} aria-atomic="true" className="ui-notification__message">
        <strong>{labels[variant]}</strong>
        <div>{children}</div>
      </div>
      {onClose && <button type="button" className="ui-notification__close" aria-label="Fermer la notification" onClick={onClose}>×</button>}
    </div>
  );
}

