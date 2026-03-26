import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="app-layout">
      <aside className="sidebar">
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
            <NavLink key={link.to} to={link.to} end={link.to === '/'}>
              <span className="sidebar-icon" aria-hidden="true">
                {link.icon}
              </span>
              <span>{link.label}</span>
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin/consumption">
              <span className="sidebar-icon" aria-hidden="true">
                📊
              </span>
              <span>Consumption</span>
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin/landlords">
              <span className="sidebar-icon" aria-hidden="true">
                🧾
              </span>
              <span>Landlords</span>
            </NavLink>
          )}
          <NavLink to="/settings">
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
          <div>
            <div className="header-eyebrow">Workspace</div>
            <span className="header-user">
              {user?.full_name ?? user?.email}
              {user?.role && <span className="header-role">{user.role}</span>}
            </span>
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
