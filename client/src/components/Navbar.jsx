import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { AuthContext } from '../context/AuthContext';
import '../styles/Navbar.css';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const { user: clerkUser } = useUser();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setShowDropdown(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setShowDropdown(false);
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
          {!user && (
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              Home
            </Link>
          )}
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
            to="/gully-cricket"
            className={`nav-link ${location.pathname.startsWith('/gully-cricket') ? 'active' : ''}`}
          >
            🏏 Gully Cricket
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
              <div className="nav-avatar-dropdown-wrap" ref={dropdownRef}>
                {clerkUser?.imageUrl ? (
                  <img
                    src={clerkUser.imageUrl}
                    alt={user.name || user.email}
                    title={user.name || user.email}
                    className="nav-user-avatar"
                    onClick={() => setShowDropdown((s) => !s)}
                  />
                ) : (
                  <span className="nav-user-email" onClick={() => setShowDropdown((s) => !s)} style={{ cursor: 'pointer' }}>
                    {user.name || user.email}
                  </span>
                )}

                {showDropdown && (
                  <div className="nav-dropdown-menu">
                    {user.isAdmin && (
                      <Link to="/admin/analytics" className="nav-dropdown-item" onClick={() => setShowDropdown(false)}>
                        📊 Admin Analytics
                      </Link>
                    )}
                    <Link to="/gully-cricket" className="nav-dropdown-item" onClick={() => setShowDropdown(false)}>
                      🏏 Score
                    </Link>
                    <div className="nav-dropdown-divider" />
                    <button onClick={handleLogout} className="nav-dropdown-item nav-dropdown-item-danger">
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
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