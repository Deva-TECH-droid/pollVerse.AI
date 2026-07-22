import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import '../styles/GullyCricket.css';
import '../styles/PlayerProfile.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function StatTile({ label, value }) {
  return (
    <div className="pp-stat-tile">
      <p className="pp-stat-value">{value}</p>
      <p className="pp-stat-label">{label}</p>
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

  const fetchProfile = async (name) => {
    if (!name?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/gully-cricket/players/${encodeURIComponent(name.trim())}`);
      if (!res.ok) throw new Error('Failed to load player profile');
      setProfile(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (nameFromUrl) fetchProfile(nameFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameFromUrl]);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/gully-cricket/player/${encodeURIComponent(searchName.trim())}`);
  };

  return (
    <div className="gc-container">
      <Link to="/gully-cricket" className="gc-back-link">← Back</Link>

      <div className="gc-hero">
        <h1 className="gc-title">📊 Player <span className="gc-accent">Profile</span></h1>
        <p className="gc-subtitle">Career stats, aggregated by exact player name across completed matches.</p>
      </div>

      <form className="pp-search-row" onSubmit={handleSearch}>
        <input
          type="text"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder="Enter player name exactly as scored (e.g. Virat)"
        />
        <button type="submit" className="gc-submit-btn">Search</button>
      </form>

      {loading && <p className="gc-chart-empty">Loading profile...</p>}
      {error && <p className="gc-error">⚠️ {error}</p>}

      {profile && !loading && (
        <div className="pp-profile-card">
          <h2 className="pp-player-name">{profile.name}</h2>
          {profile.matchesPlayed === 0 ? (
            <p className="gc-chart-empty">No completed matches found for this name yet.</p>
          ) : (
            <div className="pp-stats-grid">
              <StatTile label="Matches" value={profile.matchesPlayed} />
              <StatTile label="Runs" value={profile.totalRuns} />
              <StatTile label="Highest Score" value={profile.highestScore} />
              <StatTile label="Average" value={profile.average} />
              <StatTile label="Strike Rate" value={profile.strikeRate} />
              <StatTile label="Fifties" value={profile.fifties} />
              <StatTile label="Wickets" value={profile.wickets} />
              <StatTile label="MOTM Awards" value={profile.motmAwards} />
              <StatTile label="MVP Awards" value={profile.mvpAwards} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PlayerProfilePage;