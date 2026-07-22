import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import '../styles/GullyCricket.css';

const API_URL = process.env.REACT_APP_API_URL || '';
const OVERS_PRESETS = [5, 10, 20];

function PlayerListEditor({ label, players, setPlayers }) {
  const [draft, setDraft] = useState('');

  const addPlayer = () => {
    const name = draft.trim();
    if (!name) return;
    setPlayers([...players, name]);
    setDraft('');
  };

  const removePlayer = (index) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  return (
    <div className="gc-player-editor">
      <p className="gc-field-label">{label} ({players.length} players)</p>
      <div className="gc-player-input-row">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Player name"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPlayer())}
        />
        <button type="button" onClick={addPlayer}>+ Add</button>
      </div>
      <div className="gc-player-chips">
        {players.map((p, i) => (
          <span key={i} className="gc-player-chip">
            {p}
            <button type="button" onClick={() => removePlayer(i)}>✕</button>
          </span>
        ))}
      </div>
    </div>
  );
}

function CreateMatchPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [teamAName, setTeamAName] = useState('');
  const [teamBName, setTeamBName] = useState('');
  const [teamAPlayers, setTeamAPlayers] = useState([]);
  const [teamBPlayers, setTeamBPlayers] = useState([]);
  const [overs, setOvers] = useState(10);
  const [customOvers, setCustomOvers] = useState('');
  const [tossWonBy, setTossWonBy] = useState('teamA');
  const [tossDecision, setTossDecision] = useState('bat');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const effectiveOvers = customOvers ? Number(customOvers) : overs;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!teamAName.trim() || !teamBName.trim()) {
      setError('Both team names are required.');
      return;
    }
    if (teamAPlayers.length < 2 || teamBPlayers.length < 2) {
      setError('Each team needs at least 2 players.');
      return;
    }
    if (!effectiveOvers || effectiveOvers < 1) {
      setError('Enter a valid number of overs.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/gully-cricket/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          teamAName: teamAName.trim(),
          teamBName: teamBName.trim(),
          teamAPlayers,
          teamBPlayers,
          overs: effectiveOvers,
          tossWonBy,
          tossDecision,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create match');
      }
      const match = await res.json();
      navigate(`/gully-cricket/match/${match._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="gc-container">
      <div className="gc-hero">
        <h1 className="gc-title">🏏 Create a <span className="gc-accent">Match</span></h1>
        <p className="gc-subtitle">Set up both teams, pick the format, and call the toss.</p>
      </div>

      <form className="gc-form" onSubmit={handleSubmit}>
        <div className="gc-form-row">
          <div className="gc-form-field">
            <label className="gc-field-label">Team A name</label>
            <input type="text" value={teamAName} onChange={(e) => setTeamAName(e.target.value)} placeholder="e.g. Sector 12 Strikers" />
          </div>
          <div className="gc-form-field">
            <label className="gc-field-label">Team B name</label>
            <input type="text" value={teamBName} onChange={(e) => setTeamBName(e.target.value)} placeholder="e.g. Galaxy XI" />
          </div>
        </div>

        <div className="gc-form-row">
          <PlayerListEditor label={teamAName || 'Team A'} players={teamAPlayers} setPlayers={setTeamAPlayers} />
          <PlayerListEditor label={teamBName || 'Team B'} players={teamBPlayers} setPlayers={setTeamBPlayers} />
        </div>

        <div className="gc-form-field">
          <label className="gc-field-label">Match format (overs)</label>
          <div className="gc-overs-presets">
            {OVERS_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                className={`gc-preset-btn ${!customOvers && overs === n ? 'active' : ''}`}
                onClick={() => {
                  setOvers(n);
                  setCustomOvers('');
                }}
              >
                {n} overs
              </button>
            ))}
            <input
              type="number"
              min="1"
              max="50"
              placeholder="Custom"
              value={customOvers}
              onChange={(e) => setCustomOvers(e.target.value)}
              className="gc-custom-overs-input"
            />
          </div>
        </div>

        <div className="gc-toss-section">
          <p className="gc-field-label">Toss</p>
          <div className="gc-form-field">
            <label className="gc-field-label" style={{ textTransform: 'none', fontWeight: 600 }}>Who won the toss?</label>
            <div className="gc-toss-options">
              <button
                type="button"
                className={`gc-toss-card ${tossWonBy === 'teamA' ? 'active' : ''}`}
                onClick={() => setTossWonBy('teamA')}
              >
                {teamAName || 'Team A'}
              </button>
              <button
                type="button"
                className={`gc-toss-card ${tossWonBy === 'teamB' ? 'active' : ''}`}
                onClick={() => setTossWonBy('teamB')}
              >
                {teamBName || 'Team B'}
              </button>
            </div>
          </div>
          <div className="gc-form-field">
            <label className="gc-field-label" style={{ textTransform: 'none', fontWeight: 600 }}>Chose to</label>
            <div className="gc-toss-options">
              <button
                type="button"
                className={`gc-toss-card ${tossDecision === 'bat' ? 'active' : ''}`}
                onClick={() => setTossDecision('bat')}
              >
                🏏 Bat first
              </button>
              <button
                type="button"
                className={`gc-toss-card ${tossDecision === 'bowl' ? 'active' : ''}`}
                onClick={() => setTossDecision('bowl')}
              >
                🎯 Bowl first
              </button>
            </div>
          </div>
        </div>

        {error && <p className="gc-error">⚠️ {error}</p>}

        <button type="submit" className="gc-submit-btn" disabled={submitting}>
          {submitting ? 'Creating match...' : '🏏 Create Match'}
        </button>
      </form>
    </div>
  );
}

export default CreateMatchPage;