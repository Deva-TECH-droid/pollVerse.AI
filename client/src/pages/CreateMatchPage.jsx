import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import '../styles/GullyCricket.css';

const API_URL = process.env.REACT_APP_API_URL || '';
const OVERS_PRESETS = [5, 10, 20];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB limit
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

function PlayerListEditor({
  label,
  players,
  setPlayers,
  playerPhotos,
  setPlayerPhotos,
  getToken,
}) {
  const [draft, setDraft] = useState('');
  const [uploadingPlayer, setUploadingPlayer] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const addPlayer = async () => {
    const name = draft.trim();
    if (!name) return;
    if (players.includes(name)) {
      setDraft('');
      return;
    }
    const updated = [...players, name];
    setPlayers(updated);
    setDraft('');

    // Check if player has an existing profile photo saved in DB
    try {
      const res = await fetch(`${API_URL}/api/gully-cricket/profiles/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerNames: [name] }),
      });
      if (res.ok) {
        const data = await res.json();
        const existingPhoto = data.players?.[name.toLowerCase()];
        if (existingPhoto && !playerPhotos[name]) {
          setPlayerPhotos((prev) => ({ ...prev, [name]: existingPhoto }));
        }
      }
    } catch (err) {
      console.warn('Profile lookup error:', err);
    }
  };

  const removePlayer = (index) => {
    const removedName = players[index];
    setPlayers(players.filter((_, i) => i !== index));
    if (removedName) {
      setPlayerPhotos((prev) => {
        const copy = { ...prev };
        delete copy[removedName];
        return copy;
      });
    }
  };

  const handleFileUpload = async (playerName, file) => {
    setUploadError(null);
    if (!file) return;

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadError('Invalid format. Only JPG, JPEG, PNG, and WebP are supported.');
      return;
    }

    // Validate 2MB size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`Image exceeds 2MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller image.`);
      return;
    }

    setUploadingPlayer(playerName);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'players');

      const res = await fetch(`${API_URL}/api/gully-cricket/upload?type=players`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Image upload failed');
      }

      const data = await res.json();
      setPlayerPhotos((prev) => ({
        ...prev,
        [playerName]: data.url,
      }));
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadingPlayer(null);
    }
  };

  return (
    <div className="gc-player-editor">
      <p className="gc-field-label">
        {label} ({players.length} players)
      </p>

      <div className="gc-player-input-row">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Player name (e.g. Suni, Rohit)..."
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPlayer())}
        />
        <button type="button" onClick={addPlayer}>
          + Add
        </button>
      </div>

      {uploadError && <p className="gc-error" style={{ fontSize: '0.8rem', marginTop: 4 }}>⚠️ {uploadError}</p>}

      <div className="gc-player-chips">
        {players.map((p, i) => {
          const photoUrl = playerPhotos[p];
          const isUploading = uploadingPlayer === p;

          return (
            <div key={i} className="gc-player-chip-enhanced">
              <label
                className="gc-player-avatar-thumb"
                title={`Click to upload or replace photo for ${p} (Max 2MB)`}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl.startsWith('http') ? photoUrl : `${API_URL}${photoUrl}`}
                    alt={p}
                  />
                ) : (
                  <span>{p.slice(0, 2).toUpperCase()}</span>
                )}
                <span className="gc-avatar-camera-overlay">📷</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  style={{ display: 'none' }}
                  disabled={isUploading}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(p, e.target.files[0]);
                    }
                  }}
                />
              </label>

              <span className="gc-player-name-text">
                {p}
                {isUploading && <small style={{ color: '#fbbf24', marginLeft: 4 }}>(uploading...)</small>}
              </span>

              <button
                type="button"
                className="gc-player-remove-btn"
                onClick={() => removePlayer(i)}
                title="Remove player"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CreateMatchPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [teamAName, setTeamAName] = useState('');
  const [teamBName, setTeamBName] = useState('');
  const [teamALogo, setTeamALogo] = useState('');
  const [teamBLogo, setTeamBLogo] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(null); // 'teamA' | 'teamB' | null

  const [teamAPlayers, setTeamAPlayers] = useState([]);
  const [teamBPlayers, setTeamBPlayers] = useState([]);
  const [teamAPlayerPhotos, setTeamAPlayerPhotos] = useState({});
  const [teamBPlayerPhotos, setTeamBPlayerPhotos] = useState({});

  const [overs, setOvers] = useState(10);
  const [customOvers, setCustomOvers] = useState('');
  const [tossWonBy, setTossWonBy] = useState('teamA');
  const [tossDecision, setTossDecision] = useState('bat');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [createdMatch, setCreatedMatch] = useState(null);
  const [showStreamPrompt, setShowStreamPrompt] = useState(false);

  const fileInputRefA = useRef(null);
  const fileInputRefB = useRef(null);

  const effectiveOvers = customOvers ? Number(customOvers) : overs;

  // Auto-fetch existing permanent team logo when team name changes
  const checkTeamLogo = async (teamName, setLogoFunc, currentLogo) => {
    if (!teamName?.trim() || currentLogo) return;
    try {
      const res = await fetch(`${API_URL}/api/gully-cricket/profiles/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamNames: [teamName.trim()] }),
      });
      if (res.ok) {
        const data = await res.json();
        const existing = data.teams?.[teamName.trim().toLowerCase()];
        if (existing) {
          setLogoFunc(existing);
        }
      }
    } catch (err) {
      console.warn('Failed to lookup team logo:', err);
    }
  };

  const handleLogoUpload = async (teamKey, file) => {
    setError(null);
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError('Invalid format. Team logo must be JPG, JPEG, PNG, or WebP.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`Team logo exceeds 2MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller file.`);
      return;
    }

    setUploadingLogo(teamKey);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'teams');

      const res = await fetch(`${API_URL}/api/gully-cricket/upload?type=teams`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Logo upload failed');
      }

      const data = await res.json();
      if (teamKey === 'teamA') setTeamALogo(data.url);
      else setTeamBLogo(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingLogo(null);
    }
  };

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
          teamALogo,
          teamBLogo,
          teamAPlayerPhotos,
          teamBPlayerPhotos,
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
      setCreatedMatch(match);
      setShowStreamPrompt(true);
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
        <p className="gc-subtitle">
          Configure teams, upload logos and player pictures, pick overs, and toss.
        </p>
      </div>

      <form className="gc-form" onSubmit={handleSubmit}>
        {/* Team Names and Logos */}
        <div className="gc-form-row">
          {/* Team A Card */}
          <div className="gc-form-field">
            <label className="gc-field-label">Team A Name & Logo</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={teamAName}
                onChange={(e) => setTeamAName(e.target.value)}
                onBlur={() => checkTeamLogo(teamAName, setTeamALogo, teamALogo)}
                placeholder="e.g. Sector 12 Strikers"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="gc-preset-btn"
                style={{ padding: '8px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                onClick={() => fileInputRefA.current?.click()}
                disabled={uploadingLogo === 'teamA'}
              >
                {uploadingLogo === 'teamA' ? '⏳...' : '📷 Logo'}
              </button>
              <input
                ref={fileInputRefA}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleLogoUpload('teamA', e.target.files[0]);
                }}
              />
            </div>
            {teamALogo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <img
                  src={teamALogo.startsWith('http') ? teamALogo : `${API_URL}${teamALogo}`}
                  alt="Team A Logo"
                  style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }}
                />
                <span style={{ fontSize: '0.78rem', color: '#86efac' }}>✓ Logo linked (Permanent Profile)</span>
                <button
                  type="button"
                  onClick={() => setTeamALogo('')}
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  ✕ Remove
                </button>
              </div>
            )}
          </div>

          {/* Team B Card */}
          <div className="gc-form-field">
            <label className="gc-field-label">Team B Name & Logo</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={teamBName}
                onChange={(e) => setTeamBName(e.target.value)}
                onBlur={() => checkTeamLogo(teamBName, setTeamBLogo, teamBLogo)}
                placeholder="e.g. Galaxy XI"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="gc-preset-btn"
                style={{ padding: '8px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                onClick={() => fileInputRefB.current?.click()}
                disabled={uploadingLogo === 'teamB'}
              >
                {uploadingLogo === 'teamB' ? '⏳...' : '📷 Logo'}
              </button>
              <input
                ref={fileInputRefB}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleLogoUpload('teamB', e.target.files[0]);
                }}
              />
            </div>
            {teamBLogo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <img
                  src={teamBLogo.startsWith('http') ? teamBLogo : `${API_URL}${teamBLogo}`}
                  alt="Team B Logo"
                  style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }}
                />
                <span style={{ fontSize: '0.78rem', color: '#86efac' }}>✓ Logo linked (Permanent Profile)</span>
                <button
                  type="button"
                  onClick={() => setTeamBLogo('')}
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  ✕ Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Players with Profile Photos */}
        <div className="gc-form-row">
          <PlayerListEditor
            label={teamAName || 'Team A'}
            players={teamAPlayers}
            setPlayers={setTeamAPlayers}
            playerPhotos={teamAPlayerPhotos}
            setPlayerPhotos={setTeamAPlayerPhotos}
            getToken={getToken}
          />
          <PlayerListEditor
            label={teamBName || 'Team B'}
            players={teamBPlayers}
            setPlayers={setTeamBPlayers}
            playerPhotos={teamBPlayerPhotos}
            setPlayerPhotos={setTeamBPlayerPhotos}
            getToken={getToken}
          />
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

      {/* Post Match Creation Live Stream Option Prompt Modal */}
      {showStreamPrompt && createdMatch && (
        <div className="gc-modal-overlay">
          <div className="gc-modal-box gc-stream-choice-modal">
            <div className="gc-stream-choice-badge">MATCH READY 🏏</div>
            <h2 className="gc-stream-choice-title">Do you want to live stream this match?</h2>
            <p className="gc-stream-choice-desc">
              Broadcast live video feed to spectators with an interactive broadcast scorecard, live chat, and instant micro-poll predictions.
            </p>

            <div className="gc-stream-choice-actions">
              <button
                type="button"
                className="gc-choice-btn gc-choice-yes"
                onClick={() => navigate(`/gully-cricket/match/${createdMatch._id}/stream`)}
              >
                <span className="gc-choice-icon">🎥</span>
                <div>
                  <strong>Yes, Live Stream</strong>
                  <small>Open broadcast setup & camera</small>
                </div>
              </button>

              <button
                type="button"
                className="gc-choice-btn gc-choice-no"
                onClick={() => navigate(`/gully-cricket/match/${createdMatch._id}/score`)}
              >
                <span className="gc-choice-icon">📊</span>
                <div>
                  <strong>No, Skip to Scoring</strong>
                  <small>Directly open scoring console</small>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateMatchPage;