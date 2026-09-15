// Minimal main layout (skeleton). No business logic.
function MainLayout({ children }) {
  return (
    <div className="main-layout">
      <header className="main-layout__header">
        <span>Casino Fantôme</span>
      </header>
      <main className="main-layout__content">{children}</main>
      <footer className="main-layout__footer">
        <span>Front-end only - React + Vite + localStorage</span>
      </footer>
    </div>
  );
}

export default MainLayout;