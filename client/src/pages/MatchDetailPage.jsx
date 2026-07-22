import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../styles/GullyCricket.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function MatchDetailPage() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res = await fetch(`${API_URL}/api/gully-cricket/matches/${id}`);
        if (!res.ok) throw new Error('Match not found');
        const data = await res.json();
        setMatch(data.match);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMatch();
  }, [id]);

  if (loading) {
    return (
      <div className="gc-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading match...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="gc-container">
        <p className="gc-error">⚠️ {error || 'Match not found'}</p>
        <Link to="/gully-cricket" className="gc-back-link">← Back to Gully Cricket</Link>
      </div>
    );
  }

  const battingTeam = match[match.battingTeam];
  const bowlingTeam = match[match.bowlingTeam];
  const tossWinner = match[match.tossWonBy];

  return (
    <div className="gc-container">
      <Link to="/gully-cricket" className="gc-back-link">← Back</Link>

      <div className="gc-hero">
        <h1 className="gc-title">
          {match.teamA.name} <span className="gc-accent">vs</span> {match.teamB.name}
        </h1>
        <p className="gc-subtitle">{match.overs}-over match · {tossWinner.name} has won the toss and elected to {match.tossDecision === 'bat' ? 'bat first' : 'bowl first'}</p>
      </div>

      <div className="gc-match-info-grid">
        <div className="gc-team-card">
          <div className="gc-team-card-header">
            <span className="gc-team-badge">{match.teamA.name.slice(0, 2).toUpperCase()}</span>
            <div>
              <p className="gc-team-card-title">{match.teamA.name}</p>
              <p className="gc-team-card-role">{match.battingTeam === 'teamA' ? '🏏 Batting first' : '🎯 Bowling first'}</p>
            </div>
          </div>
          <div className="gc-player-avatar-row">
            {match.teamA.players.map((p, i) => (
              <span key={i} className="gc-player-avatar">
                <span className="gc-player-avatar-circle">{p.charAt(0).toUpperCase()}</span>
                {p}
              </span>
            ))}
          </div>
        </div>
        <div className="gc-team-card">
          <div className="gc-team-card-header">
            <span className="gc-team-badge gc-team-badge-b">{match.teamB.name.slice(0, 2).toUpperCase()}</span>
            <div>
              <p className="gc-team-card-title">{match.teamB.name}</p>
              <p className="gc-team-card-role">{match.battingTeam === 'teamB' ? '🏏 Batting first' : '🎯 Bowling first'}</p>
            </div>
          </div>
          <div className="gc-player-avatar-row">
            {match.teamB.players.map((p, i) => (
              <span key={i} className="gc-player-avatar">
                <span className="gc-player-avatar-circle">{p.charAt(0).toUpperCase()}</span>
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="gc-placeholder">
        Match created! {battingTeam.name} will open the batting against {bowlingTeam.name}'s bowling.
      </div>

      <Link
        to={match.status === 'completed' ? `/gully-cricket/match/${match._id}/summary` : `/gully-cricket/match/${match._id}/score`}
        className="gc-submit-btn gc-cta-link"
        style={{ marginTop: 20 }}
      >
        🏏 {match.status === 'created' ? 'Start Scoring' : match.status === 'live' ? 'Continue Scoring' : 'View Full Scorecard'}
      </Link>
    </div>
  );
}

export default MatchDetailPage;