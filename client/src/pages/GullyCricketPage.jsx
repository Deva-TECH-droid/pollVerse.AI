import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/GullyCricket.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function GullyCricketPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch(`${API_URL}/api/gully-cricket/matches`);
        if (res.ok) setMatches(await res.json());
      } catch (err) {
        console.error('Failed to load matches:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  return (
    <div className="gc-container">
      <div className="gc-hero">
        <h1 className="gc-title">🏏 Gully Cricket <span className="gc-accent">Live Scoring</span></h1>
        <p className="gc-subtitle">Score your local matches ball-by-ball, track player stats, and settle every "he's out" debate for good.</p>
        <Link to="/gully-cricket/create" className="gc-submit-btn gc-cta-link">+ New Match</Link>
        <div className="gc-hero-links">
          <Link to="/gully-cricket/history">📜 Match History</Link>
          <Link to="/gully-cricket/player">📊 Player Profiles</Link>
        </div>
      </div>

      {loading && <p className="gc-chart-empty">Loading matches...</p>}

      {!loading && matches.length === 0 && (
        <div className="gc-placeholder">No matches yet — create the first one!</div>
      )}

      {!loading && matches.length > 0 && (
        <div className="gc-match-list">
          {matches.map((m) => (
            <Link key={m._id} to={`/gully-cricket/match/${m._id}`} className="gc-match-card">
              <span className={`gc-match-status gc-match-status-${m.status}`}>{m.status}</span>
              <div className="gc-match-teams-row">
                <span className="gc-team-badge">{m.teamA.name.slice(0, 2).toUpperCase()}</span>
                <span className="gc-match-teams">{m.teamA.name}</span>
                <span className="gc-match-vs">VS</span>
                <span className="gc-team-badge gc-team-badge-b">{m.teamB.name.slice(0, 2).toUpperCase()}</span>
                <span className="gc-match-teams">{m.teamB.name}</span>
              </div>
              <p className="gc-match-meta">{m.overs} overs · {m[m.tossWonBy].name} has won the toss and elected to {m.tossDecision === 'bat' ? 'bat first' : 'bowl first'}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default GullyCricketPage;