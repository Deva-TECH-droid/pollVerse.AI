import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import '../styles/GullyCricket.css';
import '../styles/Tournament.css';
import '../styles/MatchSummary.css';
import '../styles/LiveScoring.css';
import TournamentCelebration from '../components/TournamentCelebration';
import PlayoffBracket from '../components/PlayoffBracket';

const API_URL = process.env.REACT_APP_API_URL || '';

function TeamBadge({ team, size = 28, variant = 'a' }) {
  const logo = team?.logo;
  const name = team?.name || '?';
  if (logo) {
    return <img src={logo} alt={name} className="tr-team-badge-img" style={{ width: size, height: size }} />;
  }
  return (
    <span className={`gc-team-badge ${variant === 'b' ? 'gc-team-badge-b' : ''}`} style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function TeamPlayerEditor({ players, setPlayers }) {
  const [draft, setDraft] = useState('');
  const addPlayer = () => {
    const name = draft.trim();
    if (!name) return;
    setPlayers([...players, name]);
    setDraft('');
  };
  return (
    <div className="gc-player-editor">
      <p className="gc-field-label">Players ({players.length})</p>
      <div className="gc-player-input-row">
        <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Player name"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPlayer())} />
        <button type="button" onClick={addPlayer}>+ Add</button>
      </div>
      <div className="gc-player-chips">
        {players.map((p, i) => (
          <span key={i} className="gc-player-chip">
            {p}
            <button type="button" onClick={() => setPlayers(players.filter((_, idx) => idx !== i))}>✕</button>
          </span>
        ))}
      </div>
    </div>
  );
}

function AddTeamForm({ tournamentId, onAdded, getToken }) {
  const [name, setName] = useState('');
  const [captain, setCaptain] = useState('');
  const [viceCaptain, setViceCaptain] = useState('');
  const [players, setPlayers] = useState([]);
  const [logo, setLogo] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setError('Logo image should be under 1MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAdd = async () => {
    setError(null);
    if (!name.trim()) return setError('Team name is required.');
    if (players.length < 2) return setError('Add at least 2 players.');
    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/gully-cricket/tournaments/${tournamentId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, captain, viceCaptain, players, logo }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to add team');
      }
      const tournament = await res.json();
      onAdded(tournament);
      setName(''); setCaptain(''); setViceCaptain(''); setPlayers([]); setLogo('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="gc-form">
      <p className="gc-field-label" style={{ fontSize: '0.95rem' }}>Add a team</p>

      <div className="gc-form-field">
        <label className="gc-field-label">Team Logo (optional)</label>
        <div className="tr-logo-upload-row">
          {logo ? (
            <img src={logo} alt="Team logo preview" className="tr-logo-preview" />
          ) : (
            <div className="tr-logo-preview tr-logo-preview-empty">🏏</div>
          )}
          <label className="tr-logo-upload-btn">
            📷 Upload Logo
            <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
          </label>
          {logo && (
            <button type="button" className="tr-logo-remove-btn" onClick={() => setLogo('')}>Remove</button>
          )}
        </div>
      </div>

      <div className="gc-form-field">
        <label className="gc-field-label">Team Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Warriors" />
      </div>
      <div className="gc-form-row">
        <div className="gc-form-field">
          <label className="gc-field-label">Captain</label>
          <input type="text" value={captain} onChange={(e) => setCaptain(e.target.value)} />
        </div>
        <div className="gc-form-field">
          <label className="gc-field-label">Vice Captain</label>
          <input type="text" value={viceCaptain} onChange={(e) => setViceCaptain(e.target.value)} />
        </div>
      </div>
      <TeamPlayerEditor players={players} setPlayers={setPlayers} />
      {error && <p className="gc-error">⚠️ {error}</p>}
      <button type="button" className="gc-submit-btn" onClick={handleAdd} disabled={submitting}>
        {submitting ? 'Adding...' : '+ Add Team'}
      </button>
    </div>
  );
}

function StartFixtureModal({ fixture, onConfirm, onCancel }) {
  const [tossWonBy, setTossWonBy] = useState('teamA');
  const [tossDecision, setTossDecision] = useState('bat');
  return (
    <div className="ls-modal-overlay">
      <div className="ls-modal">
        <h3>🪙 Toss — {fixture.teamAName} vs {fixture.teamBName}</h3>
        <div className="gc-form-field">
          <label className="gc-field-label">Who won the toss?</label>
          <select value={tossWonBy} onChange={(e) => setTossWonBy(e.target.value)}>
            <option value="teamA">{fixture.teamAName}</option>
            <option value="teamB">{fixture.teamBName}</option>
          </select>
        </div>
        <div className="gc-form-field">
          <label className="gc-field-label">Chose to</label>
          <select value={tossDecision} onChange={(e) => setTossDecision(e.target.value)}>
            <option value="bat">Bat first</option>
            <option value="bowl">Bowl first</option>
          </select>
        </div>
        <div className="ls-modal-actions">
          <button className="ls-btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="gc-submit-btn" onClick={() => onConfirm(tossWonBy, tossDecision)}>Start Match</button>
        </div>
      </div>
    </div>
  );
}

function TournamentDashboardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatingPlayoffs, setGeneratingPlayoffs] = useState(false);
  const [startingFixture, setStartingFixture] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [celebrationStats, setCelebrationStats] = useState(null);
  const [showPlayerStats, setShowPlayerStats] = useState(false);

  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/gully-cricket/tournaments/${id}`);
      if (!res.ok) throw new Error('Tournament not found');
      const data = await res.json();
      setTournament(data);

      if (data.status === 'completed') {
        const [statsRes, celebrationRes] = await Promise.all([
          fetch(`${API_URL}/api/gully-cricket/tournaments/${id}/player-stats`),
          fetch(`${API_URL}/api/gully-cricket/tournaments/${id}/celebration-stats`),
        ]);
        if (statsRes.ok) setPlayerStats(await statsRes.json());
        if (celebrationRes.ok) setCelebrationStats(await celebrationRes.json());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  const handleGenerateFixtures = async () => {
    setGenerating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/gully-cricket/tournaments/${id}/generate-fixtures`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to generate fixtures');
      }
      setTournament(await res.json());
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleStartFixtureConfirm = async (tossWonBy, tossDecision) => {
    const fixture = startingFixture;
    setStartingFixture(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/gully-cricket/tournaments/${id}/fixtures/${fixture.matchNumber}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tossWonBy, tossDecision }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to start fixture');
      }
      const data = await res.json();
      navigate(`/gully-cricket/match/${data.matchId}/score`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGeneratePlayoffs = async () => {
    setGeneratingPlayoffs(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/gully-cricket/tournaments/${id}/generate-playoffs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to generate playoffs');
      }
      setTournament(await res.json());
    } catch (err) {
      alert(err.message);
    } finally {
      setGeneratingPlayoffs(false);
    }
  };

  const handleForceRematch = async (fixture) => {
    if (!window.confirm(`Schedule a rematch for ${fixture.teamAName} vs ${fixture.teamBName}?`)) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/gully-cricket/tournaments/${id}/fixtures/${fixture.matchNumber}/rematch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to schedule rematch');
      }
      setTournament(await res.json());
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleFixtureFor = (fixture) => {
    if (fixture.matchId) {
      navigate(fixture.status === 'completed' ? `/gully-cricket/match/${fixture.matchId}/summary` : `/gully-cricket/match/${fixture.matchId}/score`);
    } else if (!fixture.teamAName.startsWith('TBD') && !fixture.teamBName.startsWith('TBD')) {
      setStartingFixture(fixture);
    }
  };

  const handleTogglePlayerStats = async () => {
    if (showPlayerStats) {
      setShowPlayerStats(false);
      return;
    }
    setShowPlayerStats(true);
    if (playerStats) return;
    try {
      const res = await fetch(`${API_URL}/api/gully-cricket/tournaments/${id}/player-stats`);
      if (res.ok) setPlayerStats(await res.json());
    } catch (err) {
      console.error('Failed to load player stats:', err);
    }
  };

  if (loading) return <div className="gc-container"><div className="loading-state"><div className="spinner"></div><p>Loading tournament...</p></div></div>;
  if (error || !tournament) {
    return (
      <div className="gc-container">
        <p className="gc-error">⚠️ {error || 'Tournament not found'}</p>
        <Link to="/gully-cricket" className="gc-back-link">← Back to Gully Cricket</Link>
      </div>
    );
  }

  const teamsRemaining = tournament.numberOfTeams - tournament.teams.length;

  return (
    <div className="gc-container">
      <Link to="/gully-cricket" className="gc-back-link">← Back</Link>

      <div className="gc-hero">
        <h1 className="gc-title">🏆 {tournament.name}</h1>
        <p className="gc-subtitle">
          {tournament.numberOfTeams} teams · {tournament.oversPerMatch} overs · League + Playoffs
          {tournament.venue ? ` · ${tournament.venue}` : ''}
        </p>
        <span className={`tr-status-badge tr-status-${tournament.status}`}>{tournament.status}</span>
      </div>

      {tournament.status === 'setup' && (
        <>
          <div className="tr-teams-progress">
            <p>Teams added: <strong>{tournament.teams.length} / {tournament.numberOfTeams}</strong></p>
          </div>

          {tournament.teams.length > 0 && (
            <div className="tr-teams-grid">
              {tournament.teams.map((t) => (
                <div key={t.name} className="tr-team-card">
                  <div className="tr-team-card-header">
                    <TeamBadge team={t} size={36} />
                    <p className="tr-team-name">{t.name}</p>
                  </div>
                  {t.captain && <p className="tr-team-meta">👑 {t.captain}{t.viceCaptain ? ` · 🥈 ${t.viceCaptain}` : ''}</p>}
                  <p className="tr-team-meta">{t.players.length} players</p>
                </div>
              ))}
            </div>
          )}

          {teamsRemaining > 0 ? (
            <AddTeamForm tournamentId={id} onAdded={setTournament} getToken={getToken} />
          ) : (
            <div className="gc-placeholder" style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: 14 }}>All {tournament.numberOfTeams} teams are in! Ready to generate the schedule.</p>
              <button className="gc-submit-btn" onClick={handleGenerateFixtures} disabled={generating}>
                {generating ? 'Generating...' : '📅 Generate Fixtures'}
              </button>
            </div>
          )}
        </>
      )}

      {tournament.status === 'completed' && tournament.winningTeam && (
        <TournamentCelebration tournament={tournament} playerStats={playerStats} celebrationStats={celebrationStats} />
      )}

      {tournament.status !== 'setup' && tournament.pointsTable?.length > 0 && (
        <>
          <h2 className="ms-section-label" style={{ fontSize: '1rem', marginTop: 0 }}>📊 Points Table</h2>
          <div className="tr-points-table-wrap">
            <table className="ms-table tr-points-table">
              <thead>
                <tr><th>Team</th><th>P</th><th>W</th><th>L</th><th>Pts</th><th>NRR</th></tr>
              </thead>
              <tbody>
                {tournament.pointsTable.map((t, i) => (
                  <tr key={t.name} className={i < 4 && tournament.status === 'league' ? 'tr-qualified-row' : ''}>
                    <td>{t.name}</td>
                    <td className="ms-num">{t.played}</td>
                    <td className="ms-num">{t.won}</td>
                    <td className="ms-num">{t.lost}</td>
                    <td className="ms-num">{t.points}</td>
                    <td className="ms-num">{t.nrr > 0 ? '+' : ''}{t.nrr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tournament.status === 'league' && tournament.fixtures.filter((f) => f.stage === 'league').every((f) => f.status === 'completed') && (
            <div className="gc-placeholder" style={{ textAlign: 'center', margin: '16px 0' }}>
              <p style={{ marginBottom: 14 }}>League stage complete! Top 4 teams qualify for the playoffs.</p>
              <button className="gc-submit-btn" onClick={handleGeneratePlayoffs} disabled={generatingPlayoffs}>
                {generatingPlayoffs ? 'Generating...' : '🏆 Generate Playoffs'}
              </button>
            </div>
          )}
        </>
      )}

      {tournament.status !== 'setup' && tournament.fixtures.length > 0 && (
        <>
          <h2 className="ms-section-label" style={{ fontSize: '1rem' }}>📅 League Matches</h2>
          <div className="tr-fixture-list">
            {tournament.fixtures.filter((f) => f.stage === 'league').map((f) => (
              <div key={f.matchNumber} className="tr-fixture-card tr-fixture-clickable" onClick={() => toggleFixtureFor(f)}>
                <span className="tr-fixture-number">Match {f.matchNumber}</span>
                <span className="tr-fixture-teams">{f.teamAName} vs {f.teamBName}</span>
                <span className="tr-fixture-date">{new Date(f.scheduledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                <span className={`tr-fixture-status tr-fixture-status-${f.status}`}>{f.status === 'scheduled' ? 'Tap to start' : f.status}</span>
              </div>
            ))}
          </div>

          {tournament.fixtures.some((f) => f.stage !== 'league') && (
            <>
              <h2 className="ms-section-label" style={{ fontSize: '1rem' }}>🏆 Playoffs</h2>
              <PlayoffBracket
                fixtures={tournament.fixtures.filter((f) => f.stage !== 'league')}
                teams={tournament.teams}
                onStart={toggleFixtureFor}
                onRematch={handleForceRematch}
              />
            </>
          )}
        </>
      )}

      {tournament.status !== 'setup' && (
        <div style={{ marginTop: 24 }}>
          <button className="tr-optional-toggle" onClick={handleTogglePlayerStats}>
            {showPlayerStats ? '− Hide' : '📊 Show'} Player Stats
          </button>

          {showPlayerStats && playerStats && (
            <div className="tr-player-stats-grid">
              <div className="tr-stat-block">
                <p className="tr-stat-block-title">🏏 Most Runs</p>
                {playerStats.mostRuns.map((p) => <p key={p.name} className="tr-stat-row"><span>{p.name}</span><span>{p.runs}</span></p>)}
              </div>
              <div className="tr-stat-block">
                <p className="tr-stat-block-title">🎯 Most Wickets</p>
                {playerStats.mostWickets.map((p) => <p key={p.name} className="tr-stat-row"><span>{p.name}</span><span>{p.wickets}</span></p>)}
              </div>
              <div className="tr-stat-block">
                <p className="tr-stat-block-title">⚡ Best Strike Rate</p>
                {playerStats.bestStrikeRate.map((p) => <p key={p.name} className="tr-stat-row"><span>{p.name}</span><span>{p.strikeRate}</span></p>)}
              </div>
              <div className="tr-stat-block">
                <p className="tr-stat-block-title">💪 Best Economy</p>
                {playerStats.bestEconomy.map((p) => <p key={p.name} className="tr-stat-row"><span>{p.name}</span><span>{p.economy}</span></p>)}
              </div>
              <div className="tr-stat-block">
                <p className="tr-stat-block-title">🔥 Most Sixes</p>
                {playerStats.mostSixes.map((p) => <p key={p.name} className="tr-stat-row"><span>{p.name}</span><span>{p.sixes}</span></p>)}
              </div>
              <div className="tr-stat-block">
                <p className="tr-stat-block-title">🧤 Most Catches</p>
                {playerStats.mostCatches.map((p) => <p key={p.name} className="tr-stat-row"><span>{p.name}</span><span>{p.count}</span></p>)}
              </div>
            </div>
          )}
        </div>
      )}

      {startingFixture && (
        <StartFixtureModal
          fixture={startingFixture}
          onConfirm={handleStartFixtureConfirm}
          onCancel={() => setStartingFixture(null)}
        />
      )}
    </div>
  );
}

export default TournamentDashboardPage;