import { Link, NavLink } from 'react-router-dom';
import './Navbar.css';
import useAuth from '../hooks/useAuth';

function Navbar() {
  const { token, user, logout } = useAuth();
  return (
    <header className="navbar">
      <div className="navbar__brand">
        <Link to="/">AsanaIQ</Link>
      </div>
      <nav className="navbar__links">
        {token && (
          <NavLink to="/" end className="nav-item">
            Home
          </NavLink>
        )}
        <NavLink to="/about" className="nav-item">
          About
        </NavLink>
        {token && (
          <NavLink to="/trainers" className="nav-item">
            {user?.role === 'trainer' ? 'Students' : 'Trainers'}
          </NavLink>
        )}
        {token && (
          <NavLink to="/connections" className="nav-item">
            Inbox
          </NavLink>
        )}
        {token && user?.role === 'student' && (
          <NavLink to="/progress" className="nav-item">
            My Journey
          </NavLink>
        )}
        {user?.role === 'trainer' && (
          <NavLink to="/trainer-dashboard" className="nav-item">
            My Dashboard
          </NavLink>
        )}
        {!token && (
          <>
            <NavLink to="/login" className="nav-item">
              Login
            </NavLink>
            <NavLink to="/register" className="nav-item">
              Register
            </NavLink>
          </>
        )}
      </nav>
      {token && (
        <div className="navbar__user-area">
          <span className="pill">{user?.role || 'user'}</span>
          <button className="nav-logout" onClick={logout}>
            Logout
          </button>
        </div>
      )}
    </header>
  );
}

export default Navbar;
