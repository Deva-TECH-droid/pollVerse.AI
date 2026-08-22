import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../styles/Cricket.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function WinPredictorBar({ probability, team1Name, team2Name, team1Flag, team2Flag }) {
  const p1 = probability?.team1 || 50;
  const p2 = probability?.team2 || 50;

  return (
    <div className="ck-win-predictor-box">
      <h3 className="ck-section-title">📊 Live Match Win Probability</h3>
      <div className="ck-win-labels">
        <span>{team1Flag} {team1Name} {p1}%</span>
        <span>{p2}% {team2Name} {team2Flag}</span>
      </div>
      <div className="ck-win-bar-bg">
        <div className="ck-win-bar-fill" style={{ width: `${p1}%` }}></div>
      </div>
    </div>
  );
}

function ScorecardInnings({ inning }) {
  return (
    <div className="ck-innings-block">
      <div className="ck-innings-header">
        <h3 className="ck-innings-title">{inning.inningName}</h3>
        <span className="ck-innings-total">{inning.runs}/{inning.wickets} ({inning.overs} Ov)</span>
      </div>

      {inning.batting?.length > 0 && (
        <div className="ck-table-section">
          <h4 className="ck-table-heading">Batting</h4>
          <div className="ck-table-wrap">
            <table className="ck-table">
              <thead>
                <tr>
                  <th>Batter</th>
                  <th>Dismissal</th>
                  <th className="ck-num">R</th>
                  <th className="ck-num">B</th>
                  <th className="ck-num">4s</th>
                  <th className="ck-num">6s</th>
                  <th className="ck-num">SR</th>
                </tr>
              </thead>
              <tbody>
                {inning.batting.map((b, i) => (
                  <tr key={i}>
                    <td>
                      <div className="ck-player-name">{b.name}</div>
                    </td>
                    <td className="ck-dismissal">{b.dismissal}</td>
                    <td className="ck-num highlight-runs">{b.runs}</td>
                    <td className="ck-num">{b.balls}</td>
                    <td className="ck-num">{b.fours}</td>
                    <td className="ck-num">{b.sixes}</td>
                    <td className="ck-num">{b.strikeRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {inning.bowling?.length > 0 && (
        <div className="ck-table-section">
          <h4 className="ck-table-heading">Bowling</h4>
          <div className="ck-table-wrap">
            <table className="ck-table">
              <thead>
                <tr>
                  <th>Bowler</th>
                  <th className="ck-num">O</th>
                  <th className="ck-num">M</th>
                  <th className="ck-num">R</th>
                  <th className="ck-num">W</th>
                  <th className="ck-num">Econ</th>
                </tr>
              </thead>
              <tbody>
                {inning.bowling.map((b, i) => (
                  <tr key={i}>
                    <td>
                      <div className="ck-player-name">{b.name}</div>
                    </td>
                    <td className="ck-num">{b.overs}</td>
                    <td className="ck-num">{b.maidens}</td>
                    <td className="ck-num">{b.runs}</td>
                    <td className="ck-num highlight-wickets">{b.wickets}</td>
                    <td className="ck-num">{b.economy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CricketMatchDetailPage() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('scorecard');
  const [selectedInningIdx, setSelectedInningIdx] = useState(0);
  const [commFilter, setCommFilter] = useState('all'); // all, wickets, boundaries

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res = await fetch(`${API_URL}/api/cricket/matches/${id}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to load match details');
        }
        const data = await res.json();
        setMatch(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
    const interval = setInterval(fetchMatch, 25000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="ck-container">
        <div className="ck-loading-box">
          <div className="ck-spinner"></div>
          <p className="ck-empty">Loading match details & scorecard...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="ck-container">
        <Link to="/cricket" className="ck-back-link">← Back to Cricket Hub</Link>
        <div className="ck-error-box">
          <p className="ck-error">⚠️ {error || 'Match details not found'}</p>
        </div>
      </div>
    );
  }

  const commentaryList = (match.commentary || []).filter((item) => {
    if (commFilter === 'wickets') return item.event === 'wicket';
    if (commFilter === 'boundaries') return item.event === 'four' || item.event === 'six';
    return true;
  });

  return (
    <div className="ck-container">
      <Link to="/cricket" className="ck-back-link">← Back to Cricket Hub</Link>

      {/* Match Header Hero Card */}
      <div className="ck-detail-hero">
        <div className="ck-hero-meta">
          <span className="ck-hero-series">{match.series}</span>
          {match.isLive ? (
            <span className="ck-live-badge"><span className="ck-pulse-dot"></span> 🔴 LIVE</span>
          ) : (
            <span className="ck-status-pill">{match.isCompleted ? 'COMPLETED' : 'UPCOMING'}</span>
          )}
        </div>

        <h1 className="ck-detail-title">{match.name}</h1>
        <p className="ck-detail-venue">📍 {match.venue}</p>

        {/* Score Summary Box */}
        <div className="ck-score-summary-grid">
          <div className="ck-team-score-card">
            <div className="ck-team-flag-name">
              <span className="ck-large-flag">{match.team1.flag || '🏏'}</span>
              <span className="ck-team-title">{match.team1.name}</span>
            </div>
            <div className="ck-score-display">{match.team1.score || 'Yet to bat'}</div>
            {match.team1.details && <div className="ck-score-detail">{match.team1.details}</div>}
          </div>

          <div className="ck-vs-badge">VS</div>

          <div className="ck-team-score-card">
            <div className="ck-team-flag-name">
              <span className="ck-large-flag">{match.team2.flag || '🏏'}</span>
              <span className="ck-team-title">{match.team2.name}</span>
            </div>
            <div className="ck-score-display">{match.team2.score || 'Yet to bat'}</div>
            {match.team2.details && <div className="ck-score-detail">{match.team2.details}</div>}
          </div>
        </div>

        <div className="ck-hero-status-bar">
          <p className="ck-status-text">📣 {match.status}</p>
          {match.toss && <p className="ck-toss-text">🪙 {match.toss}</p>}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="ck-tabs detail-tabs">
        {[
          { key: 'scorecard', label: '📋 Scorecard' },
          { key: 'commentary', label: '💬 Commentary' },
          { key: 'info', label: 'ℹ️ Match Info & Squads' },
          { key: 'predictor', label: '📊 Win Predictor' },
        ].map((t) => (
          <button
            key={t.key}
            className={`ck-tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Scorecard Tab */}
      {tab === 'scorecard' && (
        <div className="ck-tab-content">
          {match.scorecard?.length > 0 ? (
            <>
              {/* Multi-Innings Selector Tabs (e.g. Test matches with 4 innings) */}
              <div className="ck-innings-selector">
                {match.scorecard.map((inn, idx) => (
                  <button
                    key={idx}
                    className={`ck-innings-pill ${selectedInningIdx === idx ? 'active' : ''}`}
                    onClick={() => setSelectedInningIdx(idx)}
                  >
                    {inn.inningName}
                  </button>
                ))}
              </div>

              {/* Active Selected Innings Scorecard */}
              <ScorecardInnings inning={match.scorecard[selectedInningIdx]} />
            </>
          ) : (
            <div className="ck-empty-block">
              <p className="ck-empty">Scorecard details will be available once play starts.</p>
            </div>
          )}
        </div>
      )}

      {/* Live Commentary Tab */}
      {tab === 'commentary' && (
        <div className="ck-tab-content">
          <div className="ck-comm-filter-bar">
            <button className={`ck-comm-filter ${commFilter === 'all' ? 'active' : ''}`} onClick={() => setCommFilter('all')}>
              All Balls
            </button>
            <button className={`ck-comm-filter ${commFilter === 'boundaries' ? 'active' : ''}`} onClick={() => setCommFilter('boundaries')}>
              Boundaries (4s/6s)
            </button>
            <button className={`ck-comm-filter ${commFilter === 'wickets' ? 'active' : ''}`} onClick={() => setCommFilter('wickets')}>
              Wickets
            </button>
          </div>

          {commentaryList.length > 0 ? (
            <div className="ck-commentary-feed">
              {commentaryList.map((item, index) => (
                <div key={index} className={`ck-comm-item ${item.event}`}>
                  <div className="ck-comm-over">{item.over}</div>
                  <div className="ck-comm-body">
                    {item.event === 'four' && <span className="ck-badge-4">4 FOUR</span>}
                    {item.event === 'six' && <span className="ck-badge-6">6 SIX</span>}
                    {item.event === 'wicket' && <span className="ck-badge-w">W WICKET</span>}
                    <p className="ck-comm-text">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ck-empty-block">
              <p className="ck-empty">No commentary updates matching this filter.</p>
            </div>
          )}
        </div>
      )}

      {/* Info & Playing XI Squads Tab */}
      {tab === 'info' && (
        <div className="ck-tab-content">
          <div className="ck-info-block">
            <h3 className="ck-section-title">ℹ️ Match Summary & Details</h3>
            <div className="ck-info-grid">
              <div className="ck-info-item">
                <span className="ck-label">Series:</span>
                <span className="ck-val">{match.series}</span>
              </div>
              <div className="ck-info-item">
                <span className="ck-label">Format:</span>
                <span className="ck-val">{match.matchType?.toUpperCase()}</span>
              </div>
              <div className="ck-info-item">
                <span className="ck-label">Venue:</span>
                <span className="ck-val">{match.venue}</span>
              </div>
              <div className="ck-info-item">
                <span className="ck-label">Toss:</span>
                <span className="ck-val">{match.toss || 'TBD'}</span>
              </div>
              <div className="ck-info-item">
                <span className="ck-label">Umpires:</span>
                <span className="ck-val">{match.umpires || 'TBD'}</span>
              </div>
              <div className="ck-info-item">
                <span className="ck-label">Match Referee:</span>
                <span className="ck-val">{match.referee || 'TBD'}</span>
              </div>
            </div>
          </div>

          {/* Playing XIs / Squads */}
          {match.squads && (
            <div className="ck-squads-container">
              <h3 className="ck-section-title">👥 Playing XI / Squad Rosters</h3>
              <div className="ck-squads-grid">
                <div className="ck-squad-card">
                  <h4>{match.team1.flag} {match.team1.name}</h4>
                  <ul>
                    {(match.squads.team1 || []).map((player, i) => (
                      <li key={i}><span className="ck-player-icon">👤</span> {player}</li>
                    ))}
                  </ul>
                </div>

                <div className="ck-squad-card">
                  <h4>{match.team2.flag} {match.team2.name}</h4>
                  <ul>
                    {(match.squads.team2 || []).map((player, i) => (
                      <li key={i}><span className="ck-player-icon">👤</span> {player}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Win Predictor Tab */}
      {tab === 'predictor' && (
        <div className="ck-tab-content">
          <WinPredictorBar
            probability={match.winProbability}
            team1Name={match.team1.name}
            team2Name={match.team2.name}
            team1Flag={match.team1.flag}
            team2Flag={match.team2.flag}
          />
        </div>
      )}
    </div>
  );
}

export default CricketMatchDetailPage;