export default function Header() {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <svg className="brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4l3 3" />
        </svg>
        <span className="brand-name">Fix<strong>Flow</strong></span>
      </div>
      <nav className="topbar-nav">
        <span className="badge badge-version">v1.0</span>
      </nav>
    </header>
  );
}
