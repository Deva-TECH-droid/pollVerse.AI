import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GullyCricketWelcomeIntro from '../components/GullyCricketWelcomeIntro';
import '../styles/GullyCricket.css';
import '../styles/Tournament.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function GullyCricketPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCricketIntro, setShowCricketIntro] = useState(true);
  const navigate = useNavigate();

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
      {showCricketIntro && (
        <GullyCricketWelcomeIntro
          onComplete={() => setShowCricketIntro(false)}
          onCreateMatch={() => {
            setShowCricketIntro(false);
            navigate('/gully-cricket/create');
          }}
        />
      )}

      <div className="gc-hero">
        <h1 className="gc-title">
          🏏 Gully Cricket <span className="gc-accent">Live Scoring</span>
        </h1>
        <p className="gc-subtitle">
          Score your local matches ball-by-ball, track player stats, and settle every "he's out" debate for good.
        </p>
        <div className="gc-hero-cta-row">
          <Link to="/gully-cricket/create" className="gc-submit-btn gc-cta-link">
            + New Match
          </Link>
          <Link to="/gully-cricket/tournament/create" className="gc-submit-btn gc-cta-link tr-tournament-cta">
            🏆 Create Tournament
          </Link>
        </div>
        <div className="gc-hero-links"
           >
          {/* <button
            onClick={() => setShowCricketIntro(true)}
            style={{
              background: 'rgba(253, 224, 71, 0.12)',
              border: '1px solid #fde047',
              color: '#fde047',
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            🏟️ Stadium Intro
          </button> */}
          <Link to="/gully-cricket/history"
           style={{
              background: 'rgba(253, 224, 71, 0.12)',
              border: '1px solid #fde047',
              color: '#fde047',
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              cursor: 'pointer',
              hover: {
                background: 'rgba(55, 190, 62, 0.2)',
              },
              fontWeight: 600,
              fontSize: '0.9rem',
            }}>📜 Match History</Link>
          <Link to="/gully-cricket/player"
           style={{
              background: 'rgba(253, 224, 71, 0.12)',
              border: '1px solid #fde047',
              color: '#fde047',
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              cursor: 'pointer',
              hover: {
                background: 'rgba(6, 213, 40, 0.2)',
              },
              fontWeight: 600,
              fontSize: '0.9rem',
            }}>📊 Player Profiles</Link>
          <Link to="/gully-cricket/tournaments"
           style={{
              background: 'rgba(253, 224, 71, 0.12)',
              border: '1px solid #c1d71b',
              color: '#fde047',
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              cursor: 'pointer',
              hover: {
                background: 'rgba(53, 224, 23, 0.2)',
              },
              fontWeight: 600,
              fontSize: '0.9rem',
            }}>🏆 Tournaments</Link>
        </div>
      </div>

      {loading && (
  <p
    className="gc-chart-empty"
    style={{
      animation: "pulse 1.2s ease-in-out infinite",
      opacity: 0.6,
    }}
  >
    Loading matches...
  </p>
)}

      {!loading && matches.length === 0 && (
        <div className="gc-placeholder">No matches yet — create the first one!</div>
      )}

      {!loading && matches.length > 0 && (
        <div className="gc-match-list">
          {matches.map((m) => (
            <div key={m._id} className={`gc-match-card ${m.isLiveStreaming ? 'is-streaming-card' : ''}`}>
              <div className="gc-card-top-row">
                {m.isLiveStreaming ? (
                  <span className="gc-live-stream-tag">🔴 LIVE STREAMING NOW</span>
                ) : (
                  <span className={`gc-match-status gc-match-status-${m.status}`}>{m.status}</span>
                )}
                <span className="gc-card-overs-tag">⚡ {m.overs} Overs</span>
              </div>

              <div className="gc-match-teams-row">
                <span className="gc-team-badge">{m.teamA.name.slice(0, 2).toUpperCase()}</span>
                <span className="gc-match-teams">{m.teamA.name}</span>
                <span className="gc-match-vs">VS</span>
                <span className="gc-team-badge gc-team-badge-b">{m.teamB.name.slice(0, 2).toUpperCase()}</span>
                <span className="gc-match-teams">{m.teamB.name}</span>
              </div>

              <p className="gc-match-meta">
                {m[m.tossWonBy]?.name} won toss & elected to {m.tossDecision === 'bat' ? 'bat first' : 'bowl first'}
              </p>

              <div className="gc-card-cta-bar">
                <Link to={`/gully-cricket/match/${m._id}`} className="gc-btn-sec">
                  📊 Match Dashboard
                </Link>
                <Link to={`/gully-cricket/match/${m._id}/stream`} className="gc-btn-pri">
                  {m.isLiveStreaming ? '🎥 [Watch Live Stream]' : '🎥 Live Stream Hub'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GullyCricketPage;