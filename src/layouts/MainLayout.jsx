import Navbar from '../components/Navbar/Navbar.jsx';
import './MainLayout.css';

// Shared G4 shell. The application supplies player data.
function MainLayout({ children, player, currentPath = '/' }) {
  return (
    <div className="main-layout">
      <a className="skip-link" href="#main-content" onClick={(event) => {
        event.preventDefault();
        document.getElementById('main-content')?.focus();
      }}>Aller au contenu</a>
      <Navbar player={player} currentPath={currentPath} />
      <main id="main-content" tabIndex={-1} className="main-layout__content">{children}</main>
    </div>
  );
}
export default MainLayout;