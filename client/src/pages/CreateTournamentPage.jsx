import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import '../styles/GullyCricket.css';
import '../styles/Tournament.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function CreateTournamentPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [form, setForm] = useState({
    name: '', startDate: '', endDate: '', numberOfTeams: 8, oversPerMatch: 10,
    venue: '', ballType: 'Tennis Ball', playersPerTeam: 8,
    organizerName: '', description: '', rules: '', registrationDeadline: '',
  });
  const [showOptional, setShowOptional] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      setError('Tournament name and both dates are required.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/gully-cricket/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, format: 'league_playoffs' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create tournament');
      }
      const tournament = await res.json();
      navigate(`/gully-cricket/tournament/${tournament._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="gc-container">
      <div className="gc-hero">
        <h1 className="gc-title">🏆 Create a <span className="gc-accent">Tournament</span></h1>
        <p className="gc-subtitle">League + Playoffs, IPL-style. Add teams and generate fixtures next.</p>
      </div>

      <form className="gc-form" onSubmit={handleSubmit }>
        <div className="gc-form-field">
          <label className="gc-field-label">Tournament Name</label>
          <input type="text" value={form.name} onChange={update('name')} placeholder="e.g. Gully Premier League" />
        </div>

        <div className="gc-form-row">
          <div className="gc-form-field">
            <label className="gc-field-label">Start Date</label>
            <input type="date" value={form.startDate} onChange={update('startDate')} />
          </div>
          <div className="gc-form-field">
            <label className="gc-field-label">End Date</label>
            <input type="date" value={form.endDate} onChange={update('endDate')} />
          </div>
        </div>

        <div className="gc-form-row">
          <div className="gc-form-field">
            <label className="gc-field-label">Number of Teams</label>
            <input type="number" min="2" max="32" value={form.numberOfTeams} onChange={update('numberOfTeams')} />
          </div>
          <div className="gc-form-field">
            <label className="gc-field-label">Overs Per Match</label>
            <input type="number" min="1" max="50" value={form.oversPerMatch} onChange={update('oversPerMatch')} />
          </div>
        </div>

        <div className="gc-form-field">
          <label className="gc-field-label">Tournament Format</label>
          <div className="gc-toss-card active" style={{ cursor: 'default', textAlign: 'left', padding: '12px 16px' }}>
            League + Playoffs (Top 4 → Qualifier 1, Eliminator, Qualifier 2, Final)
          </div>
        </div>

        <div className="gc-form-row">
          <div className="gc-form-field">
            <label className="gc-field-label">Venue</label>
            <input type="text" value={form.venue} onChange={update('venue')} placeholder="e.g. SRMU Ground" />
          </div>
          <div className="gc-form-field">
            <label className="gc-field-label">Ball Type</label>
            <select value={form.ballType} onChange={update('ballType')}>
              <option>Tennis Ball</option>
              <option>Leather Ball</option>
              <option>Rubber Ball</option>
            </select>
          </div>
        </div>

        <div className="gc-form-field">
          <label className="gc-field-label">Players Per Team</label>
          <input type="number" min="2" max="15" value={form.playersPerTeam} onChange={update('playersPerTeam')} style={{ maxWidth: 140 }} />
        </div>

        <button type="button" className="tr-optional-toggle" onClick={() => setShowOptional((s) => !s)}>
          {showOptional ? '− Hide' : '+ Add'} optional details
        </button>

        {showOptional && (
          <>
            <div className="gc-form-field">
              <label className="gc-field-label">Organizer Name</label>
              <input type="text" value={form.organizerName} onChange={update('organizerName')} />
            </div>
            <div className="gc-form-field">
              <label className="gc-field-label">Description</label>
              <input type="text" value={form.description} onChange={update('description')} />
            </div>
            <div className="gc-form-field">
              <label className="gc-field-label">Rules</label>
              <input type="text" value={form.rules} onChange={update('rules')} />
            </div>
            <div className="gc-form-field">
              <label className="gc-field-label">Registration Deadline</label>
              <input type="date" value={form.registrationDeadline} onChange={update('registrationDeadline')} />
            </div>
          </>
        )}

        {error && <p className="gc-error">⚠️ {error}</p>}

        <button type="submit" className="gc-submit-btn" disabled={submitting}>
          {submitting ? 'Creating...' : '🏆 Create Tournament'}
        </button>
      </form>
    </div>
  );
}

export default CreateTournamentPage;