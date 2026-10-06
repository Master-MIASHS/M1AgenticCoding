// Main layout skeleton for non-game screens. No business logic.
function MainLayout({ children }) {
  return (
    <div className="main-layout">
      {/* Zone Navbar Placeholder */}
      <nav className="main-layout__navbar">
        <div className="main-layout__navbar-placeholder">
          Navbar Placeholder
        </div>
      </nav>

      {/* Zone Player Info Placeholder */}
      <section className="main-layout__player-info">
        <div className="main-layout__player-info-placeholder">
          Player Info Placeholder
        </div>
      </section>

      {/* Main Content Zone */}
      <main className="main-layout__content">
        {children}
      </main>

      <footer className="main-layout__footer">
        <span>Front-end only - React + Vite + localStorage</span>
      </footer>
    </div>
  );
}

export default MainLayout;