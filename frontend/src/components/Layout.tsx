import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const signedInEmail = user?.email ?? user?.full_name ?? '';
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const primaryLinks = [
    { to: '/', label: 'Dashboard', icon: '◫' },
    { to: '/properties', label: 'Properties', icon: '🏠' },
    { to: '/apartments', label: 'Apartments', icon: '▣' },
    { to: '/tenants', label: 'Tenants', icon: '👥' },
    { to: '/rents', label: 'Rents', icon: '💰' },
    { to: '/reminders', label: 'Reminders', icon: '🔔' },
    ...(!isAdmin ? [{ to: '/billing', label: 'Billing', icon: '💳' }] : []),
  ];

  const handleLogout = () => {
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
    void logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
    setIsAccountMenuOpen(false);
  };

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isAccountMenuOpen]);

  return (
    <div className="app-layout">
      <button
        type="button"
        className={`mobile-nav-overlay ${isMobileMenuOpen ? 'is-open' : ''}`}
        aria-label="Close navigation menu"
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <aside className={`sidebar ${isMobileMenuOpen ? 'is-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">PM</div>
          <div>
            <div className="sidebar-logo-title">Property Manager</div>
            <div className="sidebar-logo-subtitle">
              {isAdmin ? 'Admin Console' : 'Landlord Portal'}
            </div>
          </div>
        </div>
        <nav>
          {primaryLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={handleNavClick}
            >
              <span className="sidebar-icon" aria-hidden="true">
                {link.icon}
              </span>
              <span>{link.label}</span>
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin/consumption" onClick={handleNavClick}>
              <span className="sidebar-icon" aria-hidden="true">
                📊
              </span>
              <span>Consumption</span>
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin/landlords" onClick={handleNavClick}>
              <span className="sidebar-icon" aria-hidden="true">
                🧾
              </span>
              <span>Landlords</span>
            </NavLink>
          )}
          <NavLink to="/settings" onClick={handleNavClick}>
            <span className="sidebar-icon" aria-hidden="true">
              ⚙️
            </span>
            <span>Settings</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footer-label">Signed in as</div>
          <div className="sidebar-footer-name">{signedInEmail}</div>
          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </aside>
      <div className="main-content">
        <header className="header">
          <div className="header-leading">
            <button
              type="button"
              className="mobile-nav-toggle"
              aria-label="Open navigation menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((current) => !current)}
            >
              ☰
            </button>
            <div>
              <div className="header-eyebrow">Account Overview</div>
              <span className="header-user">
                {signedInEmail}
                {user?.role && <span className="header-role">{user.role}</span>}
              </span>
            </div>
          </div>
          <div className="account-menu-wrap" ref={accountMenuRef}>
            <button
              type="button"
              className="account-menu-trigger"
              aria-label="Open account menu"
              aria-expanded={isAccountMenuOpen}
              onClick={() => setIsAccountMenuOpen((current) => !current)}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="account-menu-icon"
              >
                <path
                  d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 1.79-6 4v1h12v-1c0-2.21-2.67-4-6-4Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            {isAccountMenuOpen && (
              <div className="account-menu">
                <div className="account-menu-label">Signed in as</div>
                <div className="account-menu-email">{signedInEmail}</div>
                <button
                  type="button"
                  className="account-menu-logout"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
