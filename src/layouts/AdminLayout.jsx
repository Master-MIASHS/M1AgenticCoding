// Minimal admin layout (skeleton). No business logic.
function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      <header className="admin-layout__header">
        <span>Administration</span>
      </header>
      <main className="admin-layout__content">{children}</main>
    </div>
  );
}

export default AdminLayout;