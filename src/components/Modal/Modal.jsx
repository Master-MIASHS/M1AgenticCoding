import { useEffect, useId, useRef } from 'react';
import './Modal.css';

/** Controlled dialog. The parent must set isOpen=false in onClose.
 * @param {{isOpen: boolean, onClose: Function, title: import('react').ReactNode, children: import('react').ReactNode, closeOnBackdrop?: boolean, footer?: import('react').ReactNode, variant?: 'neutral'|'success'|'error'}} props
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  closeOnBackdrop = false,
  footer,
  variant = 'neutral',
}) {
  const tone = ['neutral', 'success', 'error'].includes(variant) ? variant : 'neutral';
  const requestClose = () => {
    if (typeof onClose === 'function') onClose();
  };
  const dialogRef = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className={`ui-modal ui-modal--${tone}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (!closeOnBackdrop || event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          requestClose();
      }}
    >
      {isOpen && (
        <>
          <header className="ui-modal__header">
            <h2 id={titleId}>{title}</h2>
            <button
              type="button"
              className="ui-modal__close"
              aria-label="Fermer la fenêtre"
              onClick={requestClose}
            >
              ×
            </button>
          </header>
          <div className="ui-modal__content">{children}</div>
          {footer != null && <footer className="ui-modal__footer">{footer}</footer>}
        </>
      )}
    </dialog>
  );
}
