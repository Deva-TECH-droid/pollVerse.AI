import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import '../styles/GullyCricket.css';

const API_URL = process.env.REACT_APP_API_URL || '';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

function MatchDetailPage() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [spectatorCount, setSpectatorCount] = useState(0);

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

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.emit('joinMatchViewer', { matchId: id });

    socket.on('viewerCountUpdate', ({ matchId, count }) => {
      if (String(matchId) === String(id)) {
        setSpectatorCount(count);
      }
    });

    socket.on('matchStreamUpdate', ({ matchId, isLiveStreaming, streamUrl }) => {
      if (String(matchId) === String(id)) {
        setMatch((prev) => (prev ? { ...prev, isLiveStreaming, streamUrl } : prev));
      }
    });

    return () => {
      socket.emit('leaveMatchViewer');
      socket.disconnect();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="gc-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading match dashboard...</p>
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

  const tossWinner = match[match.tossWonBy];
  const latestInnings = match.innings && match.innings.length > 0 ? match.innings[match.innings.length - 1] : null;
  const currentScoreText = latestInnings
    ? `${latestInnings.battingTeamName || 'Team'}: ${latestInnings.totalRuns}/${latestInnings.wickets} (${latestInnings.overs} ov)`
    : 'Yet to start';

  return (
    <div className="gc-container">
      <Link to="/gully-cricket" className="gc-back-link">← Back to Matches</Link>

      {/* Creator Match Dashboard Card */}
      <div className="gc-creator-dashboard">
        <div className="gc-dash-header">
          <h2 className="gc-dash-title">{match.teamA.name} <span className="gc-vs">🆚</span> {match.teamB.name}</h2>
          <span className="gc-dash-meta">⚡ {match.overs} Overs Match</span>
        </div>

        <div className="gc-dash-metrics">
          <div className="gc-dash-metric-item">
            <span className="gc-metric-icon">📊</span>
            <div>
              <span className="gc-metric-label">Score</span>
              <strong className="gc-metric-val">{currentScoreText}</strong>
            </div>
          </div>

          <div className="gc-dash-metric-item">
            <span className="gc-metric-icon">🎥</span>
            <div>
              <span className="gc-metric-label">Live Stream</span>
              <strong className={`gc-metric-val ${match.isLiveStreaming ? 'is-live-tag' : ''}`}>
                {match.isLiveStreaming ? '🔴 LIVE NOW' : 'OFFLINE'}
              </strong>
            </div>
          </div>

          <div className="gc-dash-metric-item">
            <span className="gc-metric-icon">👥</span>
            <div>
              <span className="gc-metric-label">Spectators</span>
              <strong className="gc-metric-val">{spectatorCount} watching</strong>
            </div>
          </div>
        </div>

        <div className="gc-dash-actions">
          <Link
            to={match.status === 'completed' ? `/gully-cricket/match/${match._id}/summary` : `/gully-cricket/match/${match._id}/score`}
            className="gc-btn-action gc-btn-score"
          >
            📊 [Start Scoring]
          </Link>
          <Link
            to={`/gully-cricket/match/${match._id}/stream`}
            className="gc-btn-action gc-btn-stream"
          >
            🎥 [Start / Watch Live Stream]
          </Link>
        </div>
      </div>

      {/* Team Rosters */}
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
        {match.overs}-over match · {tossWinner.name} won the toss and elected to {match.tossDecision === 'bat' ? 'bat first' : 'bowl first'}.
      </div>
    </div>
  );
}

export default MatchDetailPage;