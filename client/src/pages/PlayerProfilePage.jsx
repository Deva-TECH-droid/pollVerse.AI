import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import '../styles/GullyCricket.css';
import '../styles/PlayerProfile.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function StatTile({ label, value, subtext, icon, highlight = false }) {
  return (
    <div className={`pp-stat-tile ${highlight ? 'pp-stat-tile-highlight' : ''}`}>
      <div className="pp-stat-top">
        {icon && <span className="pp-stat-icon">{icon}</span>}
        <span className="pp-stat-label">{label}</span>
      </div>
      <p className="pp-stat-value">{value}</p>
      {subtext && <p className="pp-stat-subtext">{subtext}</p>}
    </div>
  );
}

function PlayerProfilePage() {
  const { name: nameFromUrl } = useParams();
  const navigate = useNavigate();
  const [searchName, setSearchName] = useState(nameFromUrl || '');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'batting' | 'bowling' | 'matches'

  const fetchProfile = async (name) => {
    if (!name?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/gully-cricket/players/${encodeURIComponent(name.trim())}`);
      if (!res.ok) throw new Error('Failed to load player profile');
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (nameFromUrl) {
      setSearchName(nameFromUrl);
      fetchProfile(nameFromUrl);
    }
  }, [nameFromUrl]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchName.trim()) {
      navigate(`/gully-cricket/player/${encodeURIComponent(searchName.trim())}`);
    }
  };

  // Helper to generate colorful player jersey initials
  const getInitials = (fullName) => {
    const parts = (fullName || 'P').trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  const roleEmoji = (role) => {
    const r = (role || '').toLowerCase();
    if (r.includes('all')) return '⚡';
    if (r.includes('bowl')) return '🎯';
    if (r.includes('keep') || r.includes('wk')) return '🧤';
    return '🏏';
  };

  return (
    <div className="gc-container pp-page-container">
      <div className="pp-top-nav">
        <Link to="/gully-cricket" className="gc-back-link">← Back to Cricket Hub</Link>
        <Link to="/cricket" className="pp-alt-link">🌍 Global Cricket Scores</Link>
      </div>

      <div className="pp-search-card">
        <div className="pp-search-header">
          <h2>🏏 Player Profile Search</h2>
          <p>Instant career statistics, recent form guides, and match breakdown.</p>
        </div>
        <form className="pp-search-row" onSubmit={handleSearch}>
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Search player name (e.g. Virat, Ram, Rohit, Bumrah)..."
          />
          <button type="submit" className="gc-submit-btn pp-search-btn">
            🔍 Search
          </button>
        </form>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Compiling player career records & match database...</p>
        </div>
      )}

      {error && <p className="gc-error">⚠️ {error}</p>}

      {profile && !loading && (
        <div className="pp-profile-wrapper">
          {/* Main Sports Card Header */}
          <div className="pp-hero-sports-card">
            <div className="pp-hero-left">
              <div className="pp-avatar-wrap">
                <div className="pp-player-jersey-badge">
                  <span className="pp-jersey-num">#{profile.jerseyNumber || 18}</span>
                  <span className="pp-jersey-initials">{getInitials(profile.name)}</span>
                </div>
                <div className="pp-role-pill">
                  {roleEmoji(profile.role)} {profile.role || 'Player'}
                </div>
              </div>

              <div className="pp-meta-info">
                <div className="pp-name-row">
                  <h1 className="pp-name-title">{profile.name}</h1>
                  <span className="pp-verified-badge" title="Official Profile">✓</span>
                </div>

                <div className="pp-tags-row">
                  <span className="pp-team-tag">🛡️ {profile.team || 'Local Club'}</span>
                  <span className="pp-country-tag">🇮🇳 {profile.country || 'India'}</span>
                  <span className="pp-matches-chip">🏆 {profile.matchesPlayed} Matches</span>
                </div>

                <div className="pp-styles-row">
                  <span className="pp-style-badge">🏏 {profile.battingStyle || 'Right-hand bat'}</span>
                  <span className="pp-style-badge">⚾ {profile.bowlingStyle || 'Right-arm medium'}</span>
                </div>
              </div>
            </div>

            <div className="pp-hero-right">
              {/* Form Guide */}
              <div className="pp-form-guide-block">
                <p className="pp-form-label">RECENT FORM (LAST 5)</p>
                <div className="pp-form-pills">
                  {profile.recentForm?.length > 0 ? (
                    profile.recentForm.map((f, i) => (
                      <span
                        key={i}
                        className={`pp-form-pill ${
                          f.matchRuns >= 30 || f.matchWkts >= 2 ? 'pp-form-good' : ''
                        }`}
                        title={`vs ${f.opponent || 'Opponent'}`}
                      >
                        {f.formLabel}
                      </span>
                    ))
                  ) : (
                    <span className="pp-form-pill">No recent matches</span>
                  )}
                </div>
              </div>

              {/* MVP & Awards Banner */}
              <div className="pp-awards-banner">
                <div className="pp-award-item">
                  <span className="pp-award-count">🏅 {profile.mvpPoints || 0}</span>
                  <span className="pp-award-title">MVP Points</span>
                </div>
                <div className="pp-award-item">
                  <span className="pp-award-count">⭐ {profile.motmAwards || 0}</span>
                  <span className="pp-award-title">Player of Match</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="pp-tabs-bar">
            <button
              className={`pp-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              📊 Full Career Overview
            </button>
            <button
              className={`pp-tab-btn ${activeTab === 'batting' ? 'active' : ''}`}
              onClick={() => setActiveTab('batting')}
            >
              🏏 Batting Stats
            </button>
            <button
              className={`pp-tab-btn ${activeTab === 'bowling' ? 'active' : ''}`}
              onClick={() => setActiveTab('bowling')}
            >
              🎯 Bowling & Fielding
            </button>
            <button
              className={`pp-tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
              onClick={() => setActiveTab('matches')}
            >
              📅 Match History ({profile.recentMatches?.length || 0})
            </button>
          </div>

          {/* 1. All Overview Tab */}
          {activeTab === 'all' && (
            <div className="pp-tab-content">
              <h3 className="pp-section-heading">🌟 Key Career Metrics</h3>
              <div className="pp-stats-grid">
                <StatTile label="Matches Played" value={profile.matchesPlayed} icon="🏆" />
                <StatTile label="Total Runs" value={profile.totalRuns} icon="🏏" highlight />
                <StatTile label="Batting Average" value={profile.average} icon="📈" />
                <StatTile label="Strike Rate" value={profile.strikeRate} icon="⚡" />
                <StatTile label="Highest Score" value={profile.highestScore} icon="👑" />
                <StatTile label="Wickets" value={profile.wickets} icon="🎯" highlight />
                <StatTile label="Bowling Economy" value={profile.economy} icon="💪" />
                <StatTile label="Catches Taken" value={profile.catches} icon="🧤" />
                <StatTile label="Maiden Overs" value={profile.maidens || 0} icon="🛡️" />
                <StatTile label="Dot Balls" value={profile.dotBalls || 0} icon="⚪" />
                <StatTile label="50s / 100s" value={`${profile.fifties} / ${profile.hundreds || 0}`} icon="🌟" />
                <StatTile label="Career MVP Pts" value={profile.mvpPoints || 0} icon="🏅" highlight />
              </div>
            </div>
          )}

          {/* 2. Batting Tab */}
          {activeTab === 'batting' && (
            <div className="pp-tab-content">
              <h3 className="pp-section-heading">🏏 Batting & Boundary Mastery</h3>
              <div className="pp-stats-grid">
                <StatTile label="Innings Runs" value={profile.totalRuns} icon="🏏" highlight />
                <StatTile label="Balls Faced" value={profile.ballsFaced} icon="⚾" />
                <StatTile label="Highest Score" value={profile.highestScore} icon="👑" />
                <StatTile label="Batting Average" value={profile.average} icon="📈" />
                <StatTile label="Strike Rate" value={profile.strikeRate} icon="⚡" highlight />
                <StatTile label="Half-Centuries (50s)" value={profile.fifties} icon="🔥" />
                <StatTile label="Centuries (100s)" value={profile.hundreds || 0} icon="👑" />
                <StatTile label="Boundaries (4s)" value={profile.fours || 0} icon="💥" />
                <StatTile label="Maximums (6s)" value={profile.sixes || 0} icon="🚀" highlight />
              </div>
            </div>
          )}

          {/* 3. Bowling Tab */}
          {activeTab === 'bowling' && (
            <div className="pp-tab-content">
              <h3 className="pp-section-heading">🎯 Bowling & Fielding Execution</h3>
              <div className="pp-stats-grid">
                <StatTile label="Wickets Taken" value={profile.wickets} icon="🎯" highlight />
                <StatTile label="Overs Bowled" value={profile.oversBowled || '0.0'} icon="⌛" />
                <StatTile label="Runs Conceded" value={profile.runsConceded} icon="🛡️" />
                <StatTile label="Bowling Economy" value={profile.economy} icon="💪" highlight />
                <StatTile label="Bowling Average" value={profile.bowlingAverage || '—'} icon="📊" />
                <StatTile label="Maiden Overs" value={profile.maidens || 0} icon="⭐" />
                <StatTile label="Dot Balls Bowled" value={profile.dotBalls || 0} icon="⚪" />
                <StatTile label="Catches Taken" value={profile.catches} icon="🧤" />
                <StatTile label="Run Outs Executed" value={profile.runOuts || 0} icon="⚡" />
              </div>
            </div>
          )}

          {/* 4. Match History Tab */}
          {activeTab === 'matches' && (
            <div className="pp-tab-content">
              <h3 className="pp-section-heading">📅 Match Log & Individual Scorecards</h3>
              {profile.recentMatches?.length > 0 ? (
                <div className="pp-matches-table-wrap">
                  <table className="pp-matches-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Opponent</th>
                        <th>Batting</th>
                        <th>Bowling</th>
                        <th>Catches</th>
                        <th>MVP Pts</th>
                        <th>Awards</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.recentMatches.map((m, idx) => (
                        <tr key={idx}>
                          <td>{new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                          <td>
                            <strong>vs {m.opponent}</strong>
                            <span className="pp-table-sub">{m.team}</span>
                          </td>
                          <td>
                            <span className="pp-table-runs">
                              {m.runs}{m.isOut ? '' : '*'} <small>({m.balls})</small>
                            </span>
                          </td>
                          <td>
                            {m.wickets > 0 || Number(m.overs) > 0 ? (
                              <span>{m.wickets}/{m.runsConceded} <small>({m.overs} ov)</small></span>
                            ) : (
                              <span className="pp-table-dnb">—</span>
                            )}
                          </td>
                          <td>{m.catches > 0 ? `🧤 ${m.catches}` : '0'}</td>
                          <td><span className="pp-table-mvp">+{m.mvpPoints} pts</span></td>
                          <td>
                            {m.isMotm && <span className="pp-table-badge motm">⭐ MOTM</span>}
                            {m.isMvp && <span className="pp-table-badge mvp">🏅 MVP</span>}
                            {!m.isMotm && !m.isMvp && <span className="pp-table-dnb">—</span>}
                          </td>
                          <td>
                            <Link to={`/gully-cricket/match/${m.matchId}/summary`} className="pp-match-link">
                              View Scorecard →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="gc-chart-empty">No match history found for this player.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PlayerProfilePage;