import { useEffect, useRef, useState } from 'react';
import './Navbar.css';

const mainLinks = [
  { path: '/', label: 'Casino', icon: '🎰' },
  { path: '/leaderboard', label: 'Classement', icon: '🏆' },
  { path: '/shop', label: 'Boutique', icon: '🛍️' },
  { path: '/statistics', label: 'Statistiques', icon: '📊' },
];
const profileLinks = [
  { path: '/profile', label: 'Mon profil' },
  { path: '/progression', label: 'Ma progression' },
  { path: '/history', label: 'Mon historique' },
];
const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

function Navbar({ player, currentPath = '/' }) {
  const [mobileOpenPath, setMobileOpenPath] = useState(null);
  const [profileOpenPath, setProfileOpenPath] = useState(null);
  const headerRef = useRef(null);
  const profileRef = useRef(null);
  const profileButtonRef = useRef(null);
  const mobileButtonRef = useRef(null);
  const mobileOpen = mobileOpenPath === currentPath;
  const profileOpen = profileOpenPath === currentPath;
  const closeMenus = () => { setMobileOpenPath(null); setProfileOpenPath(null); };

  useEffect(() => {
    function dismiss(event) {
      if (!profileRef.current?.contains(event.target)) setProfileOpenPath(null);
      if (!headerRef.current?.contains(event.target)) setMobileOpenPath(null);
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);

  function handleKeyDown(event) {
    if (event.key !== 'Escape') return;
    if (profileOpen) {
      setProfileOpenPath(null);
      profileButtonRef.current?.focus();
    } else if (mobileOpen) {
      setMobileOpenPath(null);
      mobileButtonRef.current?.focus();
    }
  }

  function renderLink({ path, label, icon }) {
    return <a key={path} href={'#' + path} aria-current={currentPath === path ? 'page' : undefined} onClick={closeMenus}>
      {icon && <span aria-hidden="true">{icon}</span>} {label}
    </a>;
  }

  const balance = Number.isFinite(player?.balance) ? numberFormat.format(player.balance) : '—';
  return (
    <header className="navbar" ref={headerRef} onKeyDown={handleKeyDown}>
      <div className="navbar__inner">
        <a className="navbar__brand" href="#/" onClick={closeMenus} aria-label="Casino Fantôme — accueil">
          <span className="navbar__ghost" aria-hidden="true">👻</span>
          <span>CASINO <strong>FANTÔME</strong></span>
        </a>
        <button className="navbar__toggle" type="button" ref={mobileButtonRef}
          aria-expanded={mobileOpen} aria-controls="navbar-navigation"
          aria-label={mobileOpen ? 'Fermer la navigation' : 'Ouvrir la navigation'}
          onClick={() => {
            setMobileOpenPath(mobileOpen ? null : currentPath);
            setProfileOpenPath(null);
          }}>
          <span aria-hidden="true">{mobileOpen ? '✕' : '☰'}</span>
        </button>
        <div id="navbar-navigation" className={'navbar__navigation' + (mobileOpen ? ' navbar__navigation--open' : '')}>
          <nav className="navbar__links" aria-label="Navigation principale">{mainLinks.map(renderLink)}</nav>
          <div className="navbar__player">
            <span className="navbar__balance" aria-label={'Solde du joueur : ' + balance}><span aria-hidden="true">💰</span> {balance}</span>
            <span className="navbar__level" aria-label={'Niveau : ' + (player?.level ?? 'indisponible')}>
              <span aria-hidden="true">⭐</span> Niv. {player?.level ?? '—'}
            </span>
            <div className="navbar__profile" ref={profileRef} onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setProfileOpenPath(null);
            }}>
              <button ref={profileButtonRef} className="navbar__profile-button" type="button"
                aria-expanded={profileOpen} aria-controls="navbar-profile-links"
                aria-label="Profil du joueur" onClick={() => setProfileOpenPath(profileOpen ? null : currentPath)}>
                <span aria-hidden="true">👤</span><span>Profil</span><span aria-hidden="true">⌄</span>
              </button>
              <nav id="navbar-profile-links" className="navbar__dropdown" aria-label="Espace joueur" hidden={!profileOpen}>
                {profileLinks.map(renderLink)}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
export default Navbar;