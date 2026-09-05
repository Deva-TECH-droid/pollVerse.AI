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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target) && !e.target.closest('.navbar-mobile-toggle')) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setShowDropdown(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setShowDropdown(false);
    setMobileMenuOpen(false);
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

        {/* Desktop Links */}
        <div className="navbar-links desktop-only">
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
            to="/cricket"
            className={`nav-link ${location.pathname.startsWith('/cricket') ? 'active' : ''}`}
          >
            🌍 Cricket Scores
          </Link>
          <Link
            to="/gully-cricket"
            className={`nav-link ${location.pathname.startsWith('/gully-cricket') ? 'active' : ''}`}
          >
            🏏 Match Scoring & Stream
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
                      🏏 Live Scoring
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

        {/* Right side mobile controls */}
        <div className="navbar-mobile-actions">
          {user && (
            <span className="mobile-credits-chip">🪙 {user.credits || 0}</span>
          )}
          {!user && (
            <Link to="/login" className="nav-link-cta-mobile" state={{ from: location }}>
              Login
            </Link>
          )}
          <button
            type="button"
            className="navbar-mobile-toggle"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen((o) => !o)}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="navbar-mobile-drawer" ref={mobileMenuRef}>
          <div className="mobile-drawer-inner">
            <Link
              to="/"
              className={`mobile-nav-link ${location.pathname === '/' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              🏠 Home
            </Link>
            <Link
              to="/polls"
              className={`mobile-nav-link ${location.pathname === '/polls' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              🗳️ Polls
            </Link>
            <Link
              to="/cricket"
              className={`mobile-nav-link ${location.pathname.startsWith('/cricket') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              🌍 Live Cricket Scores
            </Link>
            <Link
              to="/gully-cricket"
              className={`mobile-nav-link ${location.pathname.startsWith('/gully-cricket') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              🏏 Match Scoring & Camera Stream
            </Link>
            <Link
              to="/ai-dashboard"
              className={`mobile-nav-link ${location.pathname === '/ai-dashboard' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              🤖 AI Performance
            </Link>
            <Link
              to="/leaderboard"
              className={`mobile-nav-link ${location.pathname === '/leaderboard' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              🏆 Leaderboard
            </Link>

            {user?.isAdmin && (
              <Link
                to="/create"
                className="mobile-nav-link mobile-nav-cta"
                onClick={() => setMobileMenuOpen(false)}
              >
                + Create Poll
              </Link>
            )}

            {user && !user.isAdmin && (
              <Link
                to="/feedback"
                className={`mobile-nav-link ${location.pathname === '/feedback' ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                💬 Feedback
              </Link>
            )}

            <div className="mobile-drawer-divider" />

            {user ? (
              <div className="mobile-user-section">
                <div className="mobile-user-row">
                  {clerkUser?.imageUrl && (
                    <img src={clerkUser.imageUrl} alt="Avatar" className="mobile-avatar" />
                  )}
                  <div className="mobile-user-meta">
                    <span className="mobile-user-name">{user.name || user.email}</span>
                    <span className="mobile-user-sub">🪙 {user.credits || 0} Credits</span>
                  </div>
                </div>

                {user.isAdmin && (
                  <Link
                    to="/admin/analytics"
                    className="mobile-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    📊 Admin Analytics
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mobile-nav-link mobile-logout-btn"
                >
                  🚪 Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="mobile-nav-link mobile-nav-cta"
                state={{ from: location }}
                onClick={() => setMobileMenuOpen(false)}
              >
                🔐 Sign In / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;