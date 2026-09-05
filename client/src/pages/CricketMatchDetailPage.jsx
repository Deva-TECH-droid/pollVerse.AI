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

function BallChip({ outcome }) {
  let extraClass = '';
  if (outcome === 'W') extraClass = 'ball-wicket';
  else if (outcome === '4' || outcome === 4) extraClass = 'ball-four';
  else if (outcome === '6' || outcome === 6) extraClass = 'ball-six';
  else if (outcome === '0' || outcome === 0) extraClass = 'ball-dot';

  return <span className={`ck-delivery-chip ${extraClass}`}>{outcome}</span>;
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
  const [tab, setTab] = useState('live');
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
    const interval = setInterval(fetchMatch, 15000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="ck-container">
        <div className="ck-loading-box">
          <div className="ck-spinner"></div>
          <p className="ck-empty">Loading Cricbuzz live match scorecard & ball-by-ball...</p>
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
          {match.format && <span className="ck-card-type-badge">{match.format}</span>}
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

      {/* 🔴 Cricbuzz Live Match Experience Component (Batters, Bowlers, Ball-by-Ball) */}
      {match.isLive && (
        <div className="ck-live-experience-card">
          <div className="ck-live-exp-header">
            <div className="ck-exp-rates">
              {match.crr && <span className="ck-exp-badge">CRR: <strong>{match.crr}</strong></span>}
              {match.rrr && <span className="ck-exp-badge">RRR: <strong>{match.rrr}</strong></span>}
              {match.target && <span className="ck-exp-badge target">Target: <strong>{match.target}</strong></span>}
            </div>
          </div>

          {/* Current On-Field Batters & Bowler Statistics Grid */}
          <div className="ck-onpitch-detail-grid">
            {/* Batters */}
            <div className="ck-batters-detail-col">
              <h4 className="ck-col-heading">🏏 CURRENT BATTERS</h4>
              <div className="ck-batters-table-wrap">
                <table className="ck-mini-table">
                  <thead>
                    <tr>
                      <th>Batter</th>
                      <th className="ck-num">R</th>
                      <th className="ck-num">B</th>
                      <th className="ck-num">4s</th>
                      <th className="ck-num">6s</th>
                      <th className="ck-num">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(match.currentBatters || []).map((b, i) => (
                      <tr key={i} className={b.onStrike ? 'row-onstrike' : ''}>
                        <td className="batter-name-cell">
                          <strong>{b.name}</strong> {b.onStrike && <span className="strike-marker">★</span>}
                        </td>
                        <td className="ck-num highlight-runs">{b.runs}</td>
                        <td className="ck-num">{b.balls}</td>
                        <td className="ck-num">{b.fours || 0}</td>
                        <td className="ck-num">{b.sixes || 0}</td>
                        <td className="ck-num">{b.strikeRate || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bowler */}
            {match.currentBowler && (
              <div className="ck-bowler-detail-col">
                <h4 className="ck-col-heading">⚾ CURRENT BOWLER</h4>
                <div className="ck-bowler-card-box">
                  <div className="ck-bowler-name-title">{match.currentBowler.name}</div>
                  <div className="ck-bowler-stat-row">
                    <div className="ck-bowler-stat">
                      <span className="stat-num">{match.currentBowler.overs}</span>
                      <span className="stat-label">Overs</span>
                    </div>
                    <div className="ck-bowler-stat">
                      <span className="stat-num">{match.currentBowler.maidens}</span>
                      <span className="stat-label">Maidens</span>
                    </div>
                    <div className="ck-bowler-stat">
                      <span className="stat-num">{match.currentBowler.runs}</span>
                      <span className="stat-label">Runs</span>
                    </div>
                    <div className="ck-bowler-stat">
                      <span className="stat-num highlight-wickets">{match.currentBowler.wickets}</span>
                      <span className="stat-label">Wickets</span>
                    </div>
                    <div className="ck-bowler-stat">
                      <span className="stat-num">{match.currentBowler.economy}</span>
                      <span className="stat-label">Econ</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ball-by-Ball Delivery Strip */}
          <div className="ck-ballbyball-detailed-section">
            <h4 className="ck-col-heading">⚡ REAL-TIME BALL BY BALL</h4>
            {match.currentOver?.balls?.length > 0 ? (
              <div className="ck-over-deliveries-row">
                <span className="ck-over-tag">Over {match.currentOver.overNumber}:</span>
                <div className="ck-delivery-chips-group">
                  {match.currentOver.balls.map((b, i) => (
                    <BallChip key={i} outcome={b} />
                  ))}
                </div>
              </div>
            ) : null}

            {/* Recent overs summary */}
            {match.recentOvers && match.recentOvers.length > 1 && (
              <div className="ck-recent-overs-history">
                {match.recentOvers.slice(1).map((ro, idx) => (
                  <div key={idx} className="ck-recent-over-subrow">
                    <span className="ck-subover-tag">Over {ro.overNumber}:</span>
                    <div className="ck-delivery-chips-group">
                      {ro.balls.map((b, bIdx) => (
                        <BallChip key={bIdx} outcome={b} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="ck-tabs detail-tabs">
        {[
          { key: 'live', label: '🔴 Live Hub' },
          { key: 'scorecard', label: '📋 Full Scorecard' },
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
              <p className="ck-empty">Full scorecard details will be refreshed live as innings progress.</p>
            </div>
          )}
        </div>
      )}

      {/* Live Commentary Tab */}
      {tab === 'commentary' && (
        <div className="ck-tab-content">
          <div className="ck-comm-filter-bar">
            <span className="ck-comm-label">Filter:</span>
            {['all', 'wickets', 'boundaries'].map((f) => (
              <button
                key={f}
                className={`ck-comm-pill ${commFilter === f ? 'active' : ''}`}
                onClick={() => setCommFilter(f)}
              >
                {f === 'all' ? 'All Commentary' : f === 'wickets' ? '🔴 Wickets' : '🔥 Boundaries'}
              </button>
            ))}
          </div>

          <div className="ck-commentary-list">
            {commentaryList.length > 0 ? (
              commentaryList.map((c, i) => (
                <div key={i} className={`ck-comm-item ${c.event ? `comm-${c.event}` : ''}`}>
                  <div className="ck-comm-over">{c.over}</div>
                  <div className="ck-comm-text">
                    {c.event === 'six' && <span className="ck-comm-badge six">SIX</span>}
                    {c.event === 'four' && <span className="ck-comm-badge four">FOUR</span>}
                    {c.event === 'wicket' && <span className="ck-comm-badge wicket">WICKET</span>}
                    {c.text}
                  </div>
                </div>
              ))
            ) : (
              <p className="ck-empty">No commentary matching current filter.</p>
            )}
          </div>
        </div>
      )}

      {/* Match Info & Squads Tab */}
      {tab === 'info' && (
        <div className="ck-tab-content">
          <div className="ck-info-card">
            <h3 className="ck-section-title">ℹ️ Match Information</h3>
            <div className="ck-info-grid">
              <div className="ck-info-item">
                <span className="ck-info-key">Tournament / Series</span>
                <span className="ck-info-val">{match.series}</span>
              </div>
              <div className="ck-info-item">
                <span className="ck-info-key">Match Format</span>
                <span className="ck-info-val">{match.format || match.matchType?.toUpperCase()}</span>
              </div>
              <div className="ck-info-item">
                <span className="ck-info-key">Venue</span>
                <span className="ck-info-val">{match.venue || 'TBD'}</span>
              </div>
              <div className="ck-info-item">
                <span className="ck-info-key">Toss</span>
                <span className="ck-info-val">{match.toss || 'Toss yet to take place'}</span>
              </div>
              {match.umpires && (
                <div className="ck-info-item">
                  <span className="ck-info-key">Umpires</span>
                  <span className="ck-info-val">{match.umpires}</span>
                </div>
              )}
              {match.referee && (
                <div className="ck-info-item">
                  <span className="ck-info-key">Match Referee</span>
                  <span className="ck-info-val">{match.referee}</span>
                </div>
              )}
            </div>
          </div>

          {match.squads && (match.squads.team1?.length > 0 || match.squads.team2?.length > 0) && (
            <div className="ck-squads-container">
              <div className="ck-squad-column">
                <h4 className="ck-squad-title">{match.team1.flag} {match.team1.name} Squad</h4>
                <div className="ck-squad-list">
                  {match.squads.team1.map((p, i) => (
                    <div key={i} className="ck-squad-player">{p}</div>
                  ))}
                </div>
              </div>

              <div className="ck-squad-column">
                <h4 className="ck-squad-title">{match.team2.flag} {match.team2.name} Squad</h4>
                <div className="ck-squad-list">
                  {match.squads.team2.map((p, i) => (
                    <div key={i} className="ck-squad-player">{p}</div>
                  ))}
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