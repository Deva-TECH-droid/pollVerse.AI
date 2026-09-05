import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Cricket.css';

const API_URL = process.env.REACT_APP_API_URL || '';

const TABS = [
  { key: 'all', label: '🌐 All Matches', endpoint: 'all' },
  { key: 'live', label: '🔴 Live Matches', endpoint: 'live' },
  { key: 'upcoming', label: '📅 Upcoming', endpoint: 'upcoming' },
  { key: 'recent', label: '✅ Results / Completed', endpoint: 'recent' },
];

const FORMAT_FILTERS = [
  { key: 'all', label: 'All Formats' },
  { key: 'test', label: '🏏 Test' },
  { key: 'odi', label: '🏆 ODI' },
  { key: 't20', label: '⚡ T20I' },
  { key: 'league', label: '🌟 Global Leagues' },
];

function TickerMatchCard({ match }) {
  return (
    <Link to={`/cricket/match/${match.id}`} className="ck-ticker-card">
      <div className="ck-ticker-header">
        <span className="ck-ticker-series">{match.series}</span>
        {match.isLive && <span className="ck-ticker-live-badge">🔴 LIVE</span>}
      </div>
      <div className="ck-ticker-teams">
        <div className="ck-ticker-team-row">
          <span>{match.team1.flag || '🏏'} {match.team1.shortName || match.team1.name}</span>
          <strong className="ck-ticker-score">{match.team1.score || '—'}</strong>
        </div>
        <div className="ck-ticker-team-row">
          <span>{match.team2.flag || '🏏'} {match.team2.shortName || match.team2.name}</span>
          <strong className="ck-ticker-score">{match.team2.score || '—'}</strong>
        </div>
      </div>
      <div className="ck-ticker-status">{match.status}</div>
    </Link>
  );
}

function BallChip({ outcome }) {
  let extraClass = '';
  if (outcome === 'W') extraClass = 'ball-wicket';
  else if (outcome === '4' || outcome === 4) extraClass = 'ball-four';
  else if (outcome === '6' || outcome === 6) extraClass = 'ball-six';
  else if (outcome === '0' || outcome === 0) extraClass = 'ball-dot';

  return <span className={`ck-delivery-chip ${extraClass}`}>{outcome}</span>;
}

function MatchCard({ match }) {
  return (
    <div className={`ck-match-card ${match.isLive ? 'is-live-card' : ''}`}>
      <div className="ck-card-header">
        <div className="ck-card-meta">
          <span className="ck-card-series">{match.series}</span>
          {match.format && <span className="ck-card-type-badge">{match.format}</span>}
        </div>
        {match.isLive ? (
          <span className="ck-live-badge"><span className="ck-pulse-dot"></span> 🔴 LIVE</span>
        ) : match.isCompleted ? (
          <span className="ck-completed-badge">COMPLETED</span>
        ) : (
          <span className="ck-upcoming-badge">UPCOMING</span>
        )}
      </div>

      <h3 className="ck-match-title">{match.name}</h3>

      {/* Teams and Scores */}
      <div className="ck-teams-section">
        <div className="ck-team-block">
          <div className="ck-team-info">
            <span className="ck-flag">{match.team1.flag || '🏏'}</span>
            <span className="ck-team-name">{match.team1.name}</span>
          </div>
          <div className="ck-score-wrap">
            <span className="ck-main-score">{match.team1.score || 'Yet to Bat'}</span>
            {match.team1.details && <span className="ck-sub-score">{match.team1.details}</span>}
          </div>
        </div>

        <div className="ck-vs-divider">VS</div>

        <div className="ck-team-block">
          <div className="ck-team-info">
            <span className="ck-flag">{match.team2.flag || '🏏'}</span>
            <span className="ck-team-name">{match.team2.name}</span>
          </div>
          <div className="ck-score-wrap">
            <span className="ck-main-score">{match.team2.score || 'Yet to Bat'}</span>
            {match.team2.details && <span className="ck-sub-score">{match.team2.details}</span>}
          </div>
        </div>
      </div>

      {/* Cricbuzz Live Micro-Hub Section for Live Matches */}
      {match.isLive && (
        <div className="ck-live-micro-box">
          {/* CRR & Target Bar */}
          <div className="ck-live-rates-bar">
            {match.crr && <span className="ck-rate-item">CRR: <strong>{match.crr}</strong></span>}
            {match.rrr && <span className="ck-rate-item">RRR: <strong>{match.rrr}</strong></span>}
            {match.target && <span className="ck-rate-item target">Target: <strong>{match.target}</strong></span>}
          </div>

          {/* Current Batters */}
          {match.currentBatters && match.currentBatters.length > 0 && (
            <div className="ck-onpitch-batters">
              {match.currentBatters.map((b, i) => (
                <div key={i} className={`ck-onpitch-player ${b.onStrike ? 'on-strike' : ''}`}>
                  <span className="ck-player-title">
                    {b.name} {b.onStrike ? '★' : ''}
                  </span>
                  <span className="ck-player-digits">{b.runs} ({b.balls})</span>
                </div>
              ))}
            </div>
          )}

          {/* Current Bowler */}
          {match.currentBowler && (
            <div className="ck-onpitch-bowler">
              <span className="ck-bowler-label">Bowler:</span>
              <span className="ck-bowler-name">{match.currentBowler.name}</span>
              <span className="ck-bowler-figures">
                {match.currentBowler.overs} - {match.currentBowler.maidens} - {match.currentBowler.runs} - {match.currentBowler.wickets}
              </span>
            </div>
          )}

          {/* Ball by Ball Delivery Strip */}
          {match.currentOver?.balls?.length > 0 && (
            <div className="ck-ballbyball-strip">
              <span className="ck-bbb-over-label">Over {match.currentOver.overNumber}:</span>
              <div className="ck-bbb-balls">
                {match.currentOver.balls.map((ball, idx) => (
                  <BallChip key={idx} outcome={ball} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="ck-card-status-bar">
        <p className="ck-match-status">📣 {match.status}</p>
        {match.venue && <p className="ck-match-venue">📍 {match.venue}</p>}
      </div>

      <div className="ck-card-actions">
        <Link to={`/cricket/match/${match.id}`} className="ck-btn-primary">
          📋 Full Cricbuzz Scorecard & Commentary ➔
        </Link>
      </div>
    </div>
  );
}

function CricketHomePage() {
  const [activeTab, setActiveTab] = useState('all');
  const [activeFormat, setActiveFormat] = useState('all');
  const [activeLeague, setActiveLeague] = useState('all');
  const [leagues, setLeagues] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [tickerMatches, setTickerMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const timerRef = useRef(null);

  // Fetch leagues registry
  useEffect(() => {
    fetch(`${API_URL}/api/cricket/leagues`)
      .then((r) => r.json())
      .then((data) => setLeagues(data))
      .catch((e) => console.warn('Leagues fetch error:', e));
  }, []);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tabObj = TABS.find((t) => t.key === activeTab) || TABS[0];
      const params = new URLSearchParams({
        tab: tabObj.key,
        type: activeFormat,
        league: activeLeague,
        search: searchQuery,
      });

      const res = await fetch(`${API_URL}/api/cricket/all?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load matches');
      }
      const data = await res.json();
      setMatches(data);
      setLastRefreshed(new Date());

      // Fetch top ticker matches (strictly ONLY live ongoing matches)
      const tickerRes = await fetch(`${API_URL}/api/cricket/live`);
      if (tickerRes.ok) {
        const liveData = await tickerRes.json();
        setTickerMatches(liveData.filter((m) => m.isLive));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeFormat, activeLeague, searchQuery]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Auto-refresh interval (every 15s)
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => {
        fetchMatches();
      }, 15000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, fetchMatches]);

  return (
    <div className="ck-container">
      {/* Cricbuzz Top Live Match Ticker (Ongoing Live Matches Only) */}
      <div className="ck-ticker-wrapper">
        <div className="ck-ticker-title">🔴 LIVE SCORES TICKER</div>
        {tickerMatches.length > 0 ? (
          <div className="ck-ticker-scroll">
            {tickerMatches.map((m) => (
              <TickerMatchCard key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <p className="ck-ticker-empty">Live matches automatically appear here with real-time updates.</p>
        )}
      </div>

      {/* Hero Header */}
      <div className="ck-hero">
        <div className="ck-hero-badge">🏏 GLOBAL CRICKET LIVE SCORES</div>
        <h1 className="ck-title">Cricbuzz <span className="ck-accent">Cricket Universe</span></h1>
        <p className="ck-subtitle">
          Real-time international cricket (IND, AUS, ENG, SA, NZ, PAK, SL, BAN, AFG, WI, IRE, ZIM) & premier franchise leagues worldwide (IPL, CPL, MLC, BBL, PSL, SA20, The Hundred).
        </p>

        <div className="ck-live-controls">
          <button className="ck-refresh-btn" onClick={fetchMatches}>
            🔄 Refresh Scores
          </button>
          <label className="ck-toggle-wrap">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-Sync Live {autoRefresh && <span className="ck-pulse-dot"></span>}</span>
          </label>
          <span className="ck-time-tag">Updated: {lastRefreshed.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="ck-search-filter-wrap">
        <div className="ck-search-box">
          <span className="ck-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search teams (e.g. India, Australia, CSK, MI), series, or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="ck-clear-search" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      </div>

      {/* Categories / Status Tabs */}
      <div className="ck-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`ck-tab-btn ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Extensible Leagues Selector Row */}
      {leagues.length > 0 && (
        <div className="ck-leagues-carousel">
          {leagues.map((lg) => (
            <button
              key={lg.id}
              className={`ck-league-pill ${activeLeague === lg.id ? 'active' : ''}`}
              onClick={() => setActiveLeague(lg.id)}
            >
              <span>{lg.icon}</span> {lg.name}
            </button>
          ))}
        </div>
      )}

      {/* Format Filter Pills */}
      <div className="ck-format-filters">
        {FORMAT_FILTERS.map((f) => (
          <button
            key={f.key}
            className={`ck-format-pill ${activeFormat === f.key ? 'active' : ''}`}
            onClick={() => setActiveFormat(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Matches Grid */}
      {loading && (
        <div className="ck-loading-box">
          <div className="ck-spinner"></div>
          <p className="ck-empty">Fetching live cricket scores from around the world...</p>
        </div>
      )}

      {error && <p className="ck-error">⚠️ {error}</p>}

      {!loading && !error && matches.length === 0 && (
        <div className="ck-empty-state">
          <span className="ck-empty-icon">🏏</span>
          <h3>No matches found in this category</h3>
          <p>Try switching categories, clearing search filters, or selecting "All Matches".</p>
        </div>
      )}

      {!loading && !error && matches.length > 0 && (
        <div className="ck-match-grid">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}

export default CricketHomePage;