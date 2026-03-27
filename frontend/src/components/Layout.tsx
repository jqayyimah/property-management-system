import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    void logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

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
              {isAdmin ? 'Admin Console' : 'Landlord Workspace'}
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
          <div className="sidebar-footer-name">{user?.full_name ?? user?.email}</div>
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
            <div className="header-eyebrow">Workspace</div>
            <span className="header-user">
              {user?.full_name ?? user?.email}
              {user?.role && <span className="header-role">{user.role}</span>}
            </span>
          </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
