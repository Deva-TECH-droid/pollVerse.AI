import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/GullyCricket.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function MatchHistoryPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/api/gully-cricket/matches?status=completed`);
        if (res.ok) setMatches(await res.json());
      } catch (err) {
        console.error('Failed to load match history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="gc-container">
      <Link to="/gully-cricket" className="gc-back-link">← Back</Link>

      <div className="gc-hero">
        <h1 className="gc-title">📜 Match <span className="gc-accent">History</span></h1>
        <p className="gc-subtitle">Every completed match, with full scorecards and awards.</p>
      </div>

      {loading && <p className="gc-chart-empty">Loading matches...</p>}
      {!loading && matches.length === 0 && <div className="gc-placeholder">No completed matches yet.</div>}

      {!loading && matches.length > 0 && (
        <div className="gc-match-list">
          {matches.map((m) => (
            <Link key={m._id} to={`/gully-cricket/match/${m._id}/summary`} className="gc-match-card">
              <span className="gc-match-status gc-match-status-completed">completed</span>
              <div className="gc-match-teams-row">
                <span className="gc-team-badge">{m.teamA.name.slice(0, 2).toUpperCase()}</span>
                <span className="gc-match-teams">{m.teamA.name}</span>
                <span className="gc-match-vs">VS</span>
                <span className="gc-team-badge gc-team-badge-b">{m.teamB.name.slice(0, 2).toUpperCase()}</span>
                <span className="gc-match-teams">{m.teamB.name}</span>
              </div>
              <p className="gc-match-meta">{m.result || `${m.overs} overs`}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default MatchHistoryPage;