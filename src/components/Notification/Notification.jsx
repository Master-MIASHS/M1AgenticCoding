import { useEffect, useRef } from 'react';
import './Notification.css';

const labels = { info: 'Information', success: 'Succès', warning: 'Attention', error: 'Erreur' };

/** Controlled message: autoClose calls onClose; the parent removes the message.
 * @param {{type?: 'info'|'success'|'warning'|'error', children: import('react').ReactNode, onClose?: Function, autoClose?: number|false}} props
 */
export default function Notification({ type = 'info', children, onClose, autoClose = false }) {
  const variant = Object.hasOwn(labels, type) ? type : 'info';
  const callback = useRef(onClose);
  const closeable = typeof onClose === 'function';
  useEffect(() => {
    callback.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!closeable || !Number.isFinite(autoClose) || autoClose <= 0 || autoClose > 2147483647)
      return;
    const timer = setTimeout(() => callback.current?.(), autoClose);
    return () => clearTimeout(timer);
  }, [autoClose, closeable]);
  return (
    <div className={`ui-notification ui-notification--${variant}`}>
      <div
        role={variant === 'error' ? 'alert' : 'status'}
        aria-atomic="true"
        className="ui-notification__message"
      >
        <strong>{labels[variant]}</strong>
        <div>{children}</div>
      </div>
      {closeable && (
        <button
          type="button"
          className="ui-notification__close"
          aria-label="Fermer la notification"
          onClick={onClose}
        >
          ×
        </button>
      )}
    </div>
  );
}
