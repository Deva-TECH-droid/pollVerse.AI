import React, { useContext, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/AdminDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function MetricCard({ label, value, icon, onClick }) {
  return (
    <div
      className={`admin-metric-card ${onClick ? 'admin-metric-card-clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && e.key === 'Enter' && onClick()}
    >
      <span className="admin-metric-icon">{icon}</span>
      <div>
        <p className="admin-metric-value">{value}</p>
        <p className="admin-metric-label">{label}</p>
      </div>
      {onClick && <span className="admin-metric-arrow">→</span>}
    </div>
  );
}

function UsersModal({ onClose, getToken }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load users');
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [getToken]);

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>👥 All Users ({users.length})</h2>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>

        {loading && <p className="admin-chart-empty">Loading users...</p>}
        {error && <p className="admin-chart-empty">{error}</p>}

        {!loading && !error && (
          <div className="admin-users-list">
            {users.map((u) => (
              <div key={u._id} className="admin-user-row">
                {u.imageUrl ? (
                  <img src={u.imageUrl} alt={u.name || u.email} className="admin-user-avatar" />
                ) : (
                  <div className="admin-user-avatar admin-user-avatar-fallback">
                    {(u.name || u.email || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="admin-user-info">
                  <p className="admin-user-name">{u.name || 'No name set'}</p>
                  <p className="admin-user-email">{u.email}</p>
                </div>
                <span className="admin-user-credits">🪙 {u.credits}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Tiny dependency-free SVG line chart.
function LineChart({ data, valueKey = 'count', color = '#6c63ff' }) {
  if (!data || data.length === 0) {
    return <p className="admin-chart-empty">No data for this period yet.</p>;
  }
  const width = 600;
  const height = 160;
  const padding = 20;
  const max = Math.max(...data.map((d) => d[valueKey]), 1);

  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (d[valueKey] / max) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="admin-linechart">
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => {
        const [x, y] = p.split(',');
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
    </svg>
  );
}

// Tiny dependency-free SVG horizontal bar chart.
function BarChart({ data, labelKey, valueKey, color = '#6c63ff' }) {
  if (!data || data.length === 0) {
    return <p className="admin-chart-empty">No data yet.</p>;
  }
  const max = Math.max(...data.map((d) => d[valueKey]), 1);

  return (
    <div className="admin-barchart">
      {data.map((d, i) => (
        <div key={i} className="admin-barchart-row">
          <span className="admin-barchart-label">{d[labelKey]}</span>
          <div className="admin-barchart-track">
            <div
              className="admin-barchart-fill"
              style={{ width: `${(d[valueKey] / max) * 100}%`, background: color }}
            />
          </div>
          <span className="admin-barchart-value">{Number(d[valueKey]).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function AdminDashboard() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voteFilter, setVoteFilter] = useState('allTime');
  const [showUsersModal, setShowUsersModal] = useState(false);

  useEffect(() => {
    if (!user?.isAdmin) return;

    const fetchAnalytics = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/admin/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to load analytics');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user, getToken]);

  // Wait for auth to resolve before deciding to redirect, so a logged-in
  // admin doesn't get bounced during the initial load flicker.
  if (authLoading) return null;
  if (!user?.isAdmin) return <Navigate to="/" replace />;

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard-container">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const voteFilterLabels = { today: 'Today', thisWeek: 'This Week', thisMonth: 'This Month', allTime: 'All Time' };

  return (
    <div className="admin-dashboard-container">
      <div className="admin-dashboard-hero">
        <h1 className="admin-dashboard-title">📊 LivePoll Admin Dashboard</h1>
        <p className="admin-dashboard-subtitle">Platform health, engagement, and poll performance at a glance</p>
      </div>

      <div className="admin-metrics-grid">
        <MetricCard
          label="Total Users"
          value={data.totalUsers.toLocaleString()}
          icon="👥"
          onClick={() => setShowUsersModal(true)}
        />
        <MetricCard label="Total Polls" value={data.totalPolls.total.toLocaleString()} icon="🗳️" />
        <MetricCard label="Active Users Today" value={data.activeUsersToday.toLocaleString()} icon="🟢" />
        <MetricCard label={`Total Votes (${voteFilterLabels[voteFilter]})`} value={data.totalVotes[voteFilter].toLocaleString()} icon="📊" />
      </div>

      {showUsersModal && <UsersModal onClose={() => setShowUsersModal(false)} getToken={getToken} />}

      <div className="admin-vote-filter">
        {Object.entries(voteFilterLabels).map(([key, label]) => (
          <button
            key={key}
            className={`admin-filter-btn ${voteFilter === key ? 'active' : ''}`}
            onClick={() => setVoteFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="admin-polls-breakdown">
        <span>🟢 Active: {data.totalPolls.active}</span>
        <span>✅ Completed: {data.totalPolls.completed}</span>
        <span className="admin-muted">🕒 Upcoming: coming soon</span>
      </div>

      <div className="admin-highlight-grid">
        {data.mostPopularPoll && (
          <div className="admin-highlight-card">
            <p className="admin-highlight-title">🔥 Most Popular Poll</p>
            <p className="admin-highlight-main">{data.mostPopularPoll.question}</p>
            <div className="admin-highlight-stats">
              <span>🗳️ {data.mostPopularPoll.totalVotes.toLocaleString()} votes</span>
              <span>💬 {data.mostPopularPoll.comments.toLocaleString()} comments</span>
              <span>🔗 {data.mostPopularPoll.shares.toLocaleString()} shares</span>
            </div>
          </div>
        )}

        {data.mostActiveUser && (
          <div className="admin-highlight-card">
            <p className="admin-highlight-title">🏆 Most Active User</p>
            <p className="admin-highlight-main">{data.mostActiveUser.name}</p>
            <div className="admin-highlight-stats">
              <span>🗳️ {data.mostActiveUser.pollsParticipated} polls</span>
              <span>🎯 {data.mostActiveUser.accuracy !== null ? `${data.mostActiveUser.accuracy}% accuracy` : 'Accuracy pending'}</span>
              <span>🪙 {data.mostActiveUser.credits.toLocaleString()} credits</span>
            </div>
          </div>
        )}
      </div>

      <div className="admin-chart-section">
        <h2 className="admin-section-title">📈 User Growth (last 30 days)</h2>
        <LineChart data={data.userGrowth} valueKey="count" color="#22c55e" />
      </div>

      <div className="admin-chart-section">
        <h2 className="admin-section-title">📊 Poll Participation (votes per day, last 30 days)</h2>
        <LineChart data={data.pollParticipation} valueKey="count" color="#6c63ff" />
      </div>

      <div className="admin-chart-section">
        <h2 className="admin-section-title">🏆 Top 5 Trending Polls</h2>
        <BarChart data={data.topTrendingPolls} labelKey="question" valueKey="score" color="#f59e0b" />
      </div>

      <div className="admin-chart-section">
        <h2 className="admin-section-title">🎁 Credit Distribution (top 10)</h2>
        <BarChart data={data.creditDistribution} labelKey="name" valueKey="credits" color="#22c55e" />
      </div>

      <div className="admin-chart-section admin-future-note">
        <h2 className="admin-section-title">🔮 Coming soon</h2>
        <p>Category distribution (needs poll categories), PDF/Excel export, date-range comparisons, email open/click rates, AI prediction accuracy over time, and Gully Cricket module analytics.</p>
      </div>
    </div>
  );
}

export default AdminDashboard;