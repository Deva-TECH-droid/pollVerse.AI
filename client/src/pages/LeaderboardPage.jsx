import React, { useEffect, useState, useContext } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { AuthContext } from '../context/AuthContext';
import '../styles/LeaderboardPage.css';

const API_URL = process.env.REACT_APP_API_URL || '';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

function CircularProgress({ value, size = 64, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} className="circ-svg">
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none"
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke="url(#grad)" strokeWidth={stroke} fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease', transformOrigin: 'center', transform: 'rotate(-90deg)' }}
      />
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
        fill="#fff" fontSize={size * 0.22} fontWeight="700">
        {value}%
      </text>
    </svg>
  );
}

function StatPill({ icon, label, value }) {
  return (
    <div className="stat-pill">
      <span className="pill-icon">{icon}</span>
      <div className="pill-body">
        <span className="pill-label">{label}</span>
        <span className="pill-value">{value}</span>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const { getToken } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'my-stats'

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Always get a fresh token from Clerk — never use a stale cached value
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load leaderboard.');
        const data = await res.json();
        setLeaderboard(data.leaderboard);
        setMyStats(data.myStats);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      if (user) fetchLeaderboard();
      else {
        setLoading(false);
        setError('Please log in to view the leaderboard.');
      }
    }
  }, [user, authLoading, getToken]);

  if (loading) {
    return (
      <div className="lb-container">
        <div className="lb-loading">
          <div className="lb-spinner" />
          <p>Loading Leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lb-container">
        <div className="lb-error">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="lb-container">
      {/* ── Header ── */}
      <div className="lb-header">
        <div className="lb-badge">
          <span className="lb-pulse" />
          LIVE RANKINGS
        </div>
        <h1 className="lb-title">🏆 <span className="lb-accent">Live</span> Leaderboard</h1>
        <p className="lb-subtitle">
          Compete with the community — predict smarter, rank higher, earn more credits.
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="lb-tabs">
        <button
          className={`lb-tab ${activeTab === 'leaderboard' ? 'lb-tab-active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Global Rankings
        </button>
        <button
          className={`lb-tab ${activeTab === 'my-stats' ? 'lb-tab-active' : ''}`}
          onClick={() => setActiveTab('my-stats')}
        >
          📊 Your Statistics
        </button>
      </div>

      {/* ── LEADERBOARD TAB ── */}
      {activeTab === 'leaderboard' && (
        <div className="lb-content">
          {/* Podium for top 3 */}
          {top3.length > 0 && (
            <div className="lb-podium">
              {/* 2nd place */}
              {top3[1] && (
                <div className="podium-slot podium-2nd">
                  <div className={`podium-card ${top3[1].isMe ? 'podium-me' : ''}`}>
                    <div className="podium-avatar">{top3[1].name[0].toUpperCase()}</div>
                    <span className="podium-medal">🥈</span>
                    <p className="podium-name">{top3[1].name}{top3[1].isMe && ' (You)'}</p>
                    <p className="podium-acc">{top3[1].accuracy}%</p>
                    <p className="podium-credits">🪙 {top3[1].credits}</p>
                  </div>
                  <div className="podium-block podium-block-2nd" />
                </div>
              )}
              {/* 1st place */}
              {top3[0] && (
                <div className="podium-slot podium-1st">
                  <div className="podium-crown">👑</div>
                  <div className={`podium-card ${top3[0].isMe ? 'podium-me' : ''}`}>
                    <div className="podium-avatar podium-avatar-1st">{top3[0].name[0].toUpperCase()}</div>
                    <span className="podium-medal">🥇</span>
                    <p className="podium-name">{top3[0].name}{top3[0].isMe && ' (You)'}</p>
                    <p className="podium-acc">{top3[0].accuracy}%</p>
                    <p className="podium-credits">🪙 {top3[0].credits}</p>
                  </div>
                  <div className="podium-block podium-block-1st" />
                </div>
              )}
              {/* 3rd place */}
              {top3[2] && (
                <div className="podium-slot podium-3rd">
                  <div className={`podium-card ${top3[2].isMe ? 'podium-me' : ''}`}>
                    <div className="podium-avatar">{top3[2].name[0].toUpperCase()}</div>
                    <span className="podium-medal">🥉</span>
                    <p className="podium-name">{top3[2].name}{top3[2].isMe && ' (You)'}</p>
                    <p className="podium-acc">{top3[2].accuracy}%</p>
                    <p className="podium-credits">🪙 {top3[2].credits}</p>
                  </div>
                  <div className="podium-block podium-block-3rd" />
                </div>
              )}
            </div>
          )}

          {/* Full table */}
          <div className="lb-table-wrapper">
            <table className="lb-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Accuracy</th>
                  <th>Correct</th>
                  <th>Credits</th>
                  <th>Participated</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((user) => (
                  <tr
                    key={user.rank}
                    className={`lb-row ${user.isMe ? 'lb-row-me' : ''}`}
                  >
                    <td className="lb-rank-cell">
                      {MEDAL[user.rank] || (
                        <span className="lb-rank-num">#{user.rank}</span>
                      )}
                    </td>
                    <td className="lb-name-cell">
                      <span className="lb-avatar">{user.name[0].toUpperCase()}</span>
                      {user.name}
                      {user.isMe && <span className="lb-you-tag">You</span>}
                    </td>
                    <td>
                      <div className="lb-acc-bar-wrap">
                        <div className="lb-acc-bar">
                          <div
                            className="lb-acc-fill"
                            style={{ width: `${user.accuracy}%` }}
                          />
                        </div>
                        <span className="lb-acc-text">{user.accuracy}%</span>
                      </div>
                    </td>
                    <td className="lb-stat-cell">
                      <span className="correct-tag">✅ {user.correctPredictions}</span>
                    </td>
                    <td className="lb-stat-cell">
                      <span className="credits-tag">🪙 {user.credits}</span>
                    </td>
                    <td className="lb-stat-cell">{user.totalPredictions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leaderboard.length === 0 && (
              <div className="lb-empty">
                <p>🏁 No rankings yet. Be the first to predict!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MY STATS TAB ── */}
      {activeTab === 'my-stats' && myStats && (
        <div className="my-stats-container">
          <div className="my-stats-hero">
            <div className="my-stats-avatar">{myStats.name[0].toUpperCase()}</div>
            <div>
              <h2 className="my-stats-name">{myStats.name}</h2>
              <p className="my-stats-rank">
                Global Rank: <strong className="rank-highlight">#{myStats.rank}</strong>
                &nbsp;of {myStats.totalUsers} users
              </p>
            </div>
            <div className="my-stats-circ">
              <CircularProgress value={myStats.accuracy} size={80} stroke={7} />
              <p className="circ-label">Accuracy</p>
            </div>
          </div>

          <div className="my-stats-grid">
            <StatPill icon="✅" label="Correct Predictions" value={myStats.correctPredictions} />
            <StatPill icon="❌" label="Incorrect Predictions" value={myStats.incorrectPredictions} />
            <StatPill icon="🪙" label="Credits Earned" value={myStats.credits} />
            <StatPill icon="📊" label="Polls Participated" value={myStats.totalPredictions} />
          </div>

          <div className="my-stats-tip">
            <span className="tip-icon">💡</span>
            <span>
              Every correct prediction earns you <strong>20 credits</strong>.
              Stay consistent and climb the leaderboard!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
