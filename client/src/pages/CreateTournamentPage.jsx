import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import '../styles/GullyCricket.css';
import '../styles/Tournament.css';

const API_URL = process.env.REACT_APP_API_URL || '';

// Default marquee star players for immediate auction action
const DEFAULT_AUCTION_PLAYERS = [
  { name: 'Virat Kohli', role: 'Batsman', category: 'Grade A', basePrice: 2.0, country: 'India', stats: { mat: 115, runs: 4008, avg: 52.7, sr: 138.0, hs: 122 } },
  { name: 'Rohit Sharma', role: 'Batsman', category: 'Grade A', basePrice: 2.0, country: 'India', stats: { mat: 151, runs: 3974, avg: 31.3, sr: 140.9, hs: 121 } },
  { name: 'Jasprit Bumrah', role: 'Bowler', category: 'Grade A', basePrice: 2.0, country: 'India', stats: { mat: 62, runs: 45, avg: 19.6, sr: 6.55, wkt: 74, hs: '3/11' } },
  { name: 'Hardik Pandya', role: 'All-Rounder', category: 'Grade A', basePrice: 2.0, country: 'India', stats: { mat: 92, runs: 1348, avg: 32.5, sr: 139.8, hs: 71, wkt: 73 } },
  { name: 'Suryakumar Yadav', role: 'Batsman', category: 'Grade A', basePrice: 2.0, country: 'India', stats: { mat: 60, runs: 2141, avg: 45.5, sr: 171.6, hs: 117 } },
  { name: 'Rishabh Pant', role: 'Wicketkeeper', category: 'Grade A', basePrice: 2.0, country: 'India', stats: { mat: 66, runs: 987, avg: 26.2, sr: 126.4, hs: 65, wkt: 32 } },
  { name: 'Ravindra Jadeja', role: 'All-Rounder', category: 'Grade A', basePrice: 1.5, country: 'India', stats: { mat: 66, runs: 480, avg: 28.0, sr: 125.3, hs: 46, wkt: 53 } },
  { name: 'Shubman Gill', role: 'Batsman', category: 'Grade B', basePrice: 1.5, country: 'India', stats: { mat: 44, runs: 1040, avg: 30.5, sr: 139.6, hs: 126 } },
  { name: 'Mohammed Siraj', role: 'Bowler', category: 'Grade B', basePrice: 1.5, country: 'India', stats: { mat: 36, runs: 22, avg: 22.8, sr: 7.8, wkt: 42, hs: '4/17' } },
  { name: 'Kuldeep Yadav', role: 'Bowler', category: 'Grade B', basePrice: 1.5, country: 'India', stats: { mat: 35, runs: 18, avg: 14.1, sr: 6.74, wkt: 59, hs: '5/24' } },
  { name: 'Ram Sharma', role: 'Batsman', category: 'Grade B', basePrice: 1.0, country: 'India', stats: { mat: 28, runs: 850, avg: 38.0, sr: 142.0, hs: 88 } },
  { name: 'Shyam Yadav', role: 'Bowler', category: 'Grade B', basePrice: 1.0, country: 'India', stats: { mat: 25, runs: 40, avg: 18.2, sr: 7.2, wkt: 38, hs: '4/20' } },
  { name: 'Rahul Tripathi', role: 'Batsman', category: 'Grade B', basePrice: 1.0, country: 'India', stats: { mat: 32, runs: 790, avg: 31.0, sr: 144.5, hs: 74 } },
  { name: 'Aman Verma', role: 'All-Rounder', category: 'Grade B', basePrice: 1.0, country: 'India', stats: { mat: 30, runs: 620, avg: 29.5, sr: 148.0, hs: 68, wkt: 24 } },
  { name: 'Mohit Kumar', role: 'Bowler', category: 'Grade C', basePrice: 0.5, country: 'India', stats: { mat: 20, runs: 15, avg: 20.4, sr: 8.1, wkt: 26, hs: '3/18' } },
  { name: 'Arjun Singh', role: 'All-Rounder', category: 'Grade C', basePrice: 0.5, country: 'India', stats: { mat: 18, runs: 340, avg: 24.2, sr: 135.0, hs: 54, wkt: 14 } },
];

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function getNextWeekString() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

export default function CreateTournamentPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();

  // Auction choice: null (unselected) | true (Auction Flow) | false (Normal Flow)
  const [conductAuctionChoice, setConductAuctionChoice] = useState(true);

  // Tournament standard details
  const [name, setName] = useState('IPL Gully Premier League 2026');
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getNextWeekString());
  const [oversPerMatch, setOversPerMatch] = useState(10);
  const [venue, setVenue] = useState('SRMU Stadium / Local Ground');
  const ballType = 'Tennis Ball';

  // Auction-specific team configuration (User's team + Computer AI teams)
  const [userTeamName, setUserTeamName] = useState('Mumbai Indians');
  const [numTeams, setNumTeams] = useState(4);
  const [teamBudgets, setTeamBudgets] = useState(100);

  // Computer AI teams (fixed pool — user picks count, not names)
  const cpuTeams = [
    'Chennai Super Kings',
    'Royal Challengers',
    'Kolkata Knight Riders',
    'Gujarat Titans',
    'Rajasthan Royals',
    'Sunrisers Hyderabad',
    'Delhi Capitals',
  ];

  // Player pool for auction
  const [auctionPlayers, setAuctionPlayers] = useState(DEFAULT_AUCTION_PLAYERS);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState('Batsman');
  const [newPlayerPrice, setNewPlayerPrice] = useState(1.0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Add individual custom player
  const handleAddCustomPlayer = (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    setAuctionPlayers((prev) => [
      ...prev,
      {
        name: newPlayerName.trim(),
        role: newPlayerRole,
        category: 'Grade B',
        country: 'India',
        basePrice: Number(newPlayerPrice) || 1.0,
        stats: { mat: 20, runs: 450, avg: 30.0, sr: 135.0 },
      },
    ]);
    setNewPlayerName('');
  };

  // Remove player from pool
  const handleRemovePlayer = (idx) => {
    setAuctionPlayers((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit and create tournament
  const handleCreateTournament = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!name.trim()) return setError('Tournament name is required.');
    if (!startDate || !endDate) return setError('Start and end dates are required.');

    setSubmitting(true);

    try {
      const token = await getToken();

      let finalTeams = [];
      if (conductAuctionChoice) {
        // Construct User Team + Computer AI Teams
        const activeCpuCount = Math.max(1, numTeams - 1);
        const selectedCpuNames = cpuTeams.slice(0, activeCpuCount);

        finalTeams = [
          {
            name: userTeamName.trim() || 'My Franchise',
            captain: 'You',
            budget: teamBudgets,
            isUserTeam: true,
            players: [],
          },
          ...selectedCpuNames.map((cName) => ({
            name: cName,
            captain: 'CPU Captain',
            budget: teamBudgets,
            isUserTeam: false,
            players: [],
          })),
        ];
      }

      const res = await fetch(`${API_URL}/api/gully-cricket/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          startDate,
          endDate,
          numberOfTeams: conductAuctionChoice ? numTeams : 8,
          oversPerMatch,
          format: 'league_playoffs',
          venue: venue.trim(),
          ballType,
          playersPerTeam: 8,
          hasAuction: Boolean(conductAuctionChoice),
          auctionConfig: {
            budgetPerTeam: teamBudgets,
            bidIncrement: 0.25,
            status: conductAuctionChoice ? 'in_progress' : 'setup',
          },
          auctionPool: conductAuctionChoice ? auctionPlayers : [],
          teams: finalTeams,
        }),
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
        <h1 className="gc-title">🏆 Tournament <span className="gc-accent">Setup</span></h1>
        <p className="gc-subtitle">
          Start an IPL-style 3D Player Auction where you bid for your franchise and the computer bids for the others!
        </p>
      </div>

      {/* ── STEP 1: TOURNAMENT STYLE CHOICE (SHOWN FIRST) ────────────────── */}
      <div style={{
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        borderRadius: 16,
        padding: '24px 20px',
        marginBottom: 28,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.4rem', marginBottom: 4 }}>🔨 vs 🏆</div>
        <h2 style={{ fontSize: '1.45rem', color: '#fff', margin: '0 0 8px 0' }}>
          Do you want to conduct a Player Auction?
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.92rem', maxWidth: 560, margin: '0 auto 20px auto' }}>
          Select <strong>Yes</strong> to get your own franchise team, bid in a 3D live auction against AI computer teams, and build your dream squad!
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          textAlign: 'left',
        }}>
          {/* YES: IPL Auction Flow */}
          <div
            onClick={() => setConductAuctionChoice(true)}
            style={{
              padding: '18px',
              borderRadius: 12,
              cursor: 'pointer',
              border: conductAuctionChoice === true ? '2px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.12)',
              background: conductAuctionChoice === true ? 'linear-gradient(145deg, rgba(245, 158, 11, 0.22), rgba(217, 119, 6, 0.1))' : 'rgba(255, 255, 255, 0.03)',
              boxShadow: conductAuctionChoice === true ? '0 0 24px rgba(245, 158, 11, 0.4)' : 'none',
              transition: 'all 0.25s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '1.6rem' }}>🔨</span>
              <span style={{
                background: conductAuctionChoice === true ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                color: conductAuctionChoice === true ? '#000' : '#cbd5e1',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 800,
              }}>
                {conductAuctionChoice === true ? '✓ SELECTED' : 'SELECT'}
              </span>
            </div>
            <h3 style={{ margin: '0 0 6px 0', color: '#fbbf24', fontSize: '1.15rem' }}>
              Yes → Start 3D Auction Flow
            </h3>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#cbd5e1', lineHeight: '1.45' }}>
              You control <strong>Your Team</strong>! Computer AI bids for the other teams. Live 3D auction stage, real-time bidding, AI fixtures, and IPL points table!
            </p>
          </div>

          {/* NO: Normal Tournament */}
          <div
            onClick={() => setConductAuctionChoice(false)}
            style={{
              padding: '18px',
              borderRadius: 12,
              cursor: 'pointer',
              border: conductAuctionChoice === false ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',
              background: conductAuctionChoice === false ? 'linear-gradient(145deg, rgba(56, 189, 248, 0.22), rgba(2, 132, 199, 0.1))' : 'rgba(255, 255, 255, 0.03)',
              boxShadow: conductAuctionChoice === false ? '0 0 24px rgba(56, 189, 248, 0.4)' : 'none',
              transition: 'all 0.25s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '1.6rem' }}>🏆</span>
              <span style={{
                background: conductAuctionChoice === false ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                color: conductAuctionChoice === false ? '#000' : '#cbd5e1',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 800,
              }}>
                {conductAuctionChoice === false ? '✓ SELECTED' : 'SELECT'}
              </span>
            </div>
            <h3 style={{ margin: '0 0 6px 0', color: '#38bdf8', fontSize: '1.15rem' }}>
              No → Continue Normal Tournament
            </h3>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#cbd5e1', lineHeight: '1.45' }}>
              Direct team & squad roster creation. Round-robin fixtures, live match scoring, and IPL points table without auction bidding.
            </p>
          </div>
        </div>
      </div>

      {/* ── AUCTION SETUP FORM (DIRECT & STREAMLINED) ────────────────────── */}
      <form onSubmit={handleCreateTournament} className="gc-form">
        <div className="gc-form-field">
          <label className="gc-field-label">Tournament Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. IPL Gully Premier League 2026"
          />
        </div>

        <div className="gc-form-row">
          <div className="gc-form-field">
            <label className="gc-field-label">Start Date</label>
            <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="gc-form-field">
            <label className="gc-field-label">End Date</label>
            <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="gc-form-row">
          <div className="gc-form-field">
            <label className="gc-field-label">Overs Per Match</label>
            <input
              type="number"
              min="1"
              max="50"
              value={oversPerMatch}
              onChange={(e) => setOversPerMatch(Number(e.target.value))}
            />
          </div>
          <div className="gc-form-field">
            <label className="gc-field-label">Venue / Ground</label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Wankhede / Local Ground"
            />
          </div>
        </div>

        {conductAuctionChoice ? (
          <>
            {/* ── FRANCHISE TEAMS & YOUR TEAM SELECTION ────────────────── */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 12,
              padding: '16px',
              marginTop: 10,
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#fbbf24', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🛡️</span> Franchise Teams & Your Team Selection
              </h3>
              <p style={{ margin: '0 0 14px 0', fontSize: '0.84rem', color: '#cbd5e1' }}>
                You control and bid for <strong>Your Team</strong>. The Computer AI controls the other franchise teams and competes against you in the live auction!
              </p>

              <div className="gc-form-row">
                <div className="gc-form-field" style={{ flex: 1.5 }}>
                  <label className="gc-field-label" style={{ color: '#fbbf24', fontWeight: 800 }}>
                    👑 Your Team Name (You control this team!)
                  </label>
                  <input
                    type="text"
                    required
                    value={userTeamName}
                    onChange={(e) => setUserTeamName(e.target.value)}
                    placeholder="e.g. Mumbai Indians"
                    style={{ borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', color: '#fff', fontWeight: 700 }}
                  />
                </div>

                <div className="gc-form-field">
                  <label className="gc-field-label">Total Teams</label>
                  <select value={numTeams} onChange={(e) => setNumTeams(Number(e.target.value))}>
                    <option value={4}>4 Teams (1 You + 3 Computer)</option>
                    <option value={6}>6 Teams (1 You + 5 Computer)</option>
                    <option value={8}>8 Teams (1 You + 7 Computer)</option>
                  </select>
                </div>

                <div className="gc-form-field">
                  <label className="gc-field-label">Purse Per Team (Cr)</label>
                  <input
                    type="number"
                    min="20"
                    max="500"
                    value={teamBudgets}
                    onChange={(e) => setTeamBudgets(Number(e.target.value))}
                    style={{ maxWidth: 110 }}
                  />
                </div>
              </div>

              {/* Show the computer teams */}
              <div style={{ marginTop: 10 }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🤖 Computer Competitor Teams:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {cpuTeams.slice(0, numTeams - 1).map((cName, idx) => (
                    <span key={idx} style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      padding: '4px 10px',
                      borderRadius: 14,
                      fontSize: '0.8rem',
                      color: '#93c5fd',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      <span>🤖</span> {cName}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── REGISTERED PLAYER POOL (READY TO AUCTION) ────────────── */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: '16px',
              marginTop: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>👥</span> Auction Player Pool ({auctionPlayers.length} Players Ready)
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>
                  ⚡ Pre-loaded with 16 Marquee Stars
                </span>
              </div>

              {/* Quick Add Custom Player Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.2fr 1fr auto',
                gap: 8,
                marginBottom: 14,
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '10px',
                borderRadius: 8,
              }}>
                <input
                  type="text"
                  placeholder="Add custom player (e.g. Aman, Mohit...)"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                />
                <select value={newPlayerRole} onChange={(e) => setNewPlayerRole(e.target.value)}>
                  <option>Batsman</option>
                  <option>Bowler</option>
                  <option>All-Rounder</option>
                  <option>Wicketkeeper</option>
                </select>
                <input
                  type="number"
                  step="0.25"
                  min="0.2"
                  value={newPlayerPrice}
                  onChange={(e) => setNewPlayerPrice(e.target.value)}
                  placeholder="Base Cr"
                />
                <button
                  type="button"
                  className="gc-submit-btn"
                  style={{ padding: '0 16px', fontSize: '0.88rem' }}
                  onClick={handleAddCustomPlayer}
                >
                  + Add
                </button>
              </div>

              {/* Players chips */}
              <div style={{
                maxHeight: '190px',
                overflowY: 'auto',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                padding: '4px',
              }}>
                {auctionPlayers.map((p, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      padding: '4px 10px',
                      borderRadius: 16,
                      fontSize: '0.82rem',
                    }}
                  >
                    <strong style={{ color: '#fff' }}>{p.name}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({p.role})</span>
                    <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 800 }}>₹{Number(p.basePrice).toFixed(2)}Cr</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePlayer(idx)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0 2px' }}
                      title="Remove player"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="gc-form-field">
            <label className="gc-field-label">Tournament Format</label>
            <div className="gc-toss-card active" style={{ cursor: 'default', textAlign: 'left', padding: '12px 16px' }}>
              League + Playoffs (Top 4 → Qualifier 1, Eliminator, Qualifier 2, Final)
            </div>
          </div>
        )}

        {error && <p className="gc-error" style={{ margin: '14px 0 0 0' }}>⚠️ {error}</p>}

        <button
          type="submit"
          className="gc-submit-btn"
          disabled={submitting}
          style={{
            marginTop: 20,
            background: conductAuctionChoice
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#000',
            fontWeight: 900,
            fontSize: '1.1rem',
            padding: '16px',
            boxShadow: conductAuctionChoice ? '0 0 25px rgba(245, 158, 11, 0.5)' : 'none',
          }}
        >
          {submitting
            ? 'Creating Tournament...'
            : conductAuctionChoice
            ? '🚀 Start Live 3D Auction Now!'
            : '🏆 Continue with Normal Tournament'}
        </button>
      </form>
    </div>
  );
}