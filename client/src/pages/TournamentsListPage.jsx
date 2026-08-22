import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/GullyCricket.css';
import '../styles/Tournament.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function TournamentsListPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await fetch(`${API_URL}/api/gully-cricket/tournaments`);
        if (res.ok) setTournaments(await res.json());
      } catch (err) {
        console.error('Failed to load tournaments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  return (
    <div className="gc-container">
      <Link to="/gully-cricket" className="gc-back-link">← Back</Link>

      <div className="gc-hero">
        <h1 className="gc-title">🏆 <span className="gc-accent">Tournaments</span></h1>
        <p className="gc-subtitle">Every tournament you've created — pick up right where you left off.</p>
        <Link to="/gully-cricket/tournament/create" className="gc-submit-btn gc-cta-link tr-tournament-cta">
          + New Tournament
        </Link>
      </div>

      {loading && <p className="gc-chart-empty">Loading tournaments...</p>}
      {!loading && tournaments.length === 0 && <div className="gc-placeholder">No tournaments yet — create the first one!</div>}

      {!loading && tournaments.length > 0 && (
        <div className="gc-match-list">
          {tournaments.map((t) => (
            <Link key={t._id} to={`/gully-cricket/tournament/${t._id}`} className="gc-match-card">
              <span className={`tr-status-badge tr-status-${t.status}`} style={{ position: 'absolute', top: 16, right: 20, margin: 0 }}>
                {t.status}
              </span>
              <p className="gc-match-teams">{t.name}</p>
              <p className="gc-match-meta">
                {t.teams.length}/{t.numberOfTeams} teams · {t.oversPerMatch} overs
                {t.venue ? ` · ${t.venue}` : ''}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default TournamentsListPage;