import { Link, NavLink } from 'react-router-dom';
import './Navbar.css';
import useAuth from '../hooks/useAuth';

function Navbar() {
  const { token, user, logout } = useAuth();
  return (
    <header className="navbar">
      <div className="navbar__brand">
        <Link to="/">Yoga Market</Link>
      </div>
      <nav className="navbar__links">
        <NavLink to="/" end className="nav-item">
          Landing
        </NavLink>
        <NavLink to="/about" className="nav-item">
          About
        </NavLink>
        <NavLink to="/trainers" className="nav-item">
          {user?.role === 'trainer' ? 'Students' : 'Trainers'}
        </NavLink>
        {user?.role === 'student' && (
          <NavLink to="/my-journey" className="nav-item">
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
