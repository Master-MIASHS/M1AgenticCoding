import { useId, useRef, useState } from 'react';
import './Sidebar.css';

const isValidItem = (item) =>
  item !== null &&
  typeof item === 'object' &&
  typeof item.path === 'string' &&
  item.path !== '' &&
  typeof item.label === 'string' &&
  item.label.trim() !== '';

/**
 * Side navigation. It renders the links it is given and never builds a URL on
 * its own: the caller passes `getHref` (or a ready `href` on an item), because
 * the routing library is not decided. It is collapsible on small screens.
 * @param {object} props
 * @param {Array<{path: string, label: string, icon?: string, href?: string}>} [props.items]
 * @param {string} [props.currentPath] The item with the same `path` gets aria-current="page".
 * @param {(path: string) => string} [props.getHref] Turns an item path into a link target.
 * @param {string} [props.ariaLabel] Accessible name of the navigation.
 * @param {string} [props.className] Additional wrapper class.
 * @returns {import('react').ReactElement|null}
 */
function Sidebar({
  items,
  currentPath,
  getHref,
  ariaLabel = 'Navigation latérale',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const navId = useId();
  const toggleRef = useRef(null);
  const links = Array.isArray(items) ? items.filter(isValidItem) : [];

  if (links.length === 0) return null;

  const close = () => setOpen(false);
  const handleKeyDown = (event) => {
    if (event.key !== 'Escape' || !open) return;
    close();
    toggleRef.current?.focus();
  };
  const hrefOf = (item) => {
    if (typeof item.href === 'string') return item.href;
    return typeof getHref === 'function' ? getHref(item.path) : item.path;
  };

  return (
    <div className={`sidebar ${className}`.trim()} onKeyDown={handleKeyDown}>
      <button
        ref={toggleRef}
        type="button"
        className="sidebar__toggle"
        aria-expanded={open}
        aria-controls={navId}
        onClick={() => setOpen(!open)}
      >
        {open ? 'Fermer le menu' : 'Ouvrir le menu'}
      </button>
      <nav
        id={navId}
        className={`sidebar__nav${open ? ' sidebar__nav--open' : ''}`}
        aria-label={ariaLabel}
      >
        <ul className="sidebar__list">
          {links.map((item) => (
            <li key={item.path}>
              <a
                className="sidebar__link"
                href={hrefOf(item)}
                aria-current={item.path === currentPath ? 'page' : undefined}
                onClick={close}
              >
                {item.icon && (
                  <span className="sidebar__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default Sidebar;
