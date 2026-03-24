import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">Property Manager</div>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/apartments">Apartments</NavLink>
          <NavLink to="/tenants">Tenants</NavLink>
          <NavLink to="/rents">Rents</NavLink>
          <NavLink to="/reminders">Reminders</NavLink>
        </nav>
      </aside>
      <div className="main-content">
        <header className="header">
          <span className="header-user">
            {user?.full_name ?? user?.email}
            {user?.role && <span className="header-role">{user.role}</span>}
          </span>
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
