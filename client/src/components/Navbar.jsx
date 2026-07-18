import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { AuthContext } from '../context/AuthContext';
import '../styles/Navbar.css';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const { user: clerkUser } = useUser();

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
          <Link
            to="/ai-dashboard"
            className={`nav-link ${location.pathname === '/ai-dashboard' ? 'active' : ''}`}
          >
            🤖 AI Performance
          </Link>
          <Link
            to="/leaderboard"
            className={`nav-link ${location.pathname === '/leaderboard' ? 'active' : ''}`}
          >
            🏆 Leaderboard
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
              {clerkUser?.imageUrl ? (
                <img
                  src={clerkUser.imageUrl}
                  alt={user.name || user.email}
                  title={user.name || user.email}
                  className="nav-user-avatar"
                />
              ) : (
                <span className="nav-user-email">{user.name || user.email}</span>
              )}
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