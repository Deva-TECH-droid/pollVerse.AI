import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Navbar.css';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">⚡</span>
          LivePoll
        </Link>
        <div className="navbar-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link
            to="/polls"
            className={`nav-link ${location.pathname === '/polls' ? 'active' : ''}`}
          >
            Polls
          </Link>
          {user?.isAdmin && (
            <Link
              to="/create"
              className={`nav-link nav-link-cta ${location.pathname === '/create' ? 'active' : ''}`}
            >
              + Create Poll
            </Link>
          )}
          {user && !user.isAdmin && (
            <Link
              to="/feedback"
              className={`nav-link ${location.pathname === '/feedback' ? 'active' : ''}`}
            >
              Feedback
            </Link>
          )}
          {user ? (
            <>
              <div className="nav-credits">
                <span className="credits-badge">🪙 {user.credits || 0} Credits</span>
              </div>
              <span className="nav-user-email">{user.name || user.email}</span>
              <button onClick={handleLogout} className="nav-link text-btn" style={{ color: '#ef4444' }}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="nav-link nav-link-cta" state={{ from: location }}>
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;