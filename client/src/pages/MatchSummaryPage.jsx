import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../styles/GullyCricket.css';
import '../styles/LiveScoring.css';
import '../styles/MatchSummary.css';

const API_URL = process.env.REACT_APP_API_URL || '';

const AWARD_META = {
  motm: { icon: '⭐', label: 'Player of the Match' },
  mvp: { icon: '🏅', label: 'Most Valuable Player' },
  bestBatter: { icon: '🏏', label: 'Best Batter' },
  bestBowler: { icon: '🎯', label: 'Best Bowler' },
  highestStrikeRate: { icon: '⚡', label: 'Highest Strike Rate' },
  bestEconomy: { icon: '💪', label: 'Best Economy' },
  bestFielder: { icon: '🧤', label: 'Best Fielder' },
};

function RunRateGraph({ data }) {
  if (!data || data.length === 0) return null;
  const width = 600;
  const height = 120;
  const padding = 16;
  const max = Math.max(...data.map((d) => d.cumulativeRuns), 1);
  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (d.cumulativeRuns / max) * (height - padding * 2);
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="ms-run-rate-chart">
      <polyline points={points.join(' ')} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => {
        const [x, y] = p.split(',');
        return <circle key={i} cx={x} cy={y} r="3" fill="#22c55e" />;
      })}
    </svg>
  );
}

function WagonWheel({ wagonWheel }) {
  if (!wagonWheel) return null;
  const size = 260;
  const center = size / 2;
  const radius = center - 20;
  const total = wagonWheel.directions.reduce((sum, d) => sum + d.runs, 0);

  let angle = -90; // start at top
  const colors = ['#22c55e', '#6c63ff', '#f59e0b', '#ef4444', '#3b82f6', '#a78bfa', '#f472b6', '#14b8a6', '#eab308', '#fb923c'];

  const wedges = wagonWheel.directions.map((d, i) => {
    const sweep = (d.runs / total) * 360;
    const startAngle = (angle * Math.PI) / 180;
    angle += sweep;
    const endAngle = (angle * Math.PI) / 180;
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const largeArc = sweep > 180 ? 1 : 0;
    const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { path, color: colors[i % colors.length], direction: d.direction, runs: d.runs, pct: d.pct };
  });

  return (
    <div className="ms-wagon-wheel-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} className="ms-wagon-wheel-svg">
        <circle cx={center} cy={center} r={radius + 6} fill="none" stroke="var(--border)" strokeWidth="1" />
        {wedges.map((w, i) => (
          <path key={i} d={w.path} fill={w.color} opacity="0.85" stroke="#0f0f1e" strokeWidth="1" />
        ))}
        <circle cx={center} cy={center} r={3} fill="#fff" />
      </svg>
      <div className="ms-wagon-legend">
        <div className="ms-wagon-side-split">
          <span>Off Side: <strong>{wagonWheel.offSidePct}%</strong></span>
          <span>Leg Side: <strong>{wagonWheel.legSidePct}%</strong></span>
        </div>
        {wedges.map((w, i) => (
          <div key={i} className="ms-wagon-legend-item">
            <span className="ms-wagon-swatch" style={{ background: w.color }} />
            {w.direction}: {w.runs} runs ({w.pct}%)
          </div>
        ))}
      </div>
    </div>
  );
}

function WormGraph({ innings }) {
  const width = 600;
  const height = 180;
  const padding = 24;
  const colors = ['#22c55e', '#6c63ff'];

  const maxOver = Math.max(...innings.flatMap((inn) => inn.runRate.map((d) => d.over)), 1);
  const maxRuns = Math.max(...innings.flatMap((inn) => inn.runRate.map((d) => d.cumulativeRuns)), 1);

  return (
    <div className="ms-worm-graph-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="ms-worm-graph-svg">
        {innings.map((inn, idx) => {
          if (!inn.runRate.length) return null;
          const points = inn.runRate.map((d) => {
            const x = padding + (d.over / maxOver) * (width - padding * 2);
            const y = height - padding - (d.cumulativeRuns / maxRuns) * (height - padding * 2);
            return `${x},${y}`;
          });
          return (
            <polyline
              key={idx}
              points={points.join(' ')}
              fill="none"
              stroke={colors[idx % colors.length]}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="ms-worm-legend">
        {innings.map((inn, idx) => (
          <span key={idx} className="ms-worm-legend-item">
            <span className="ms-wagon-swatch" style={{ background: colors[idx % colors.length] }} />
            {inn.teamName}
          </span>
        ))}
      </div>
    </div>
  );
}

function InningsSummary({ innings, matchOvers }) {
  const highestPartnership = innings.partnerships.length
    ? innings.partnerships.reduce((a, b) => (b.runs > a.runs ? b : a))
    : null;

  return (
    <div className="ms-innings-block">
      <div className="ms-innings-header">
        <h2>{innings.teamName}</h2>
        <p className="ms-innings-score">{innings.totalRuns}/{innings.totalWickets} <span>({innings.oversDisplay}/{matchOvers} ov)</span></p>
      </div>

      <div className="ms-table-wrap">
        <table className="ms-table">
          <thead>
            <tr><th>Batter</th><th>Runs</th><th>Balls</th><th>4s</th><th>6s</th><th>SR</th></tr>
          </thead>
          <tbody>
            {innings.battingCard.map((b) => (
              <tr key={b.name}>
                <td>
                  <div className="ms-batter-name">{b.name}</div>
                  <div className="ms-out-type">{b.isOut ? b.outType : (b.ballsFaced > 0 ? 'not out' : 'did not bat')}</div>
                </td>
                <td className="ms-num">{b.runs}</td>
                <td className="ms-num">{b.ballsFaced}</td>
                <td className="ms-num">{b.fours}</td>
                <td className="ms-num">{b.sixes}</td>
                <td className="ms-num">{b.strikeRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="ms-extras-line">
        Extras: {innings.extrasTotal} (wd {innings.extras.wide || 0}, nb {innings.extras.noball || 0}, b {innings.extras.bye || 0}, lb {innings.extras.legbye || 0})
      </p>

      {innings.bowlingCard.length > 0 && (
        <>
          <p className="ms-section-label">Bowling</p>
          <div className="ms-table-wrap">
            <table className="ms-table">
              <thead>
                <tr><th>Bowler</th><th>Overs</th><th>Maidens</th><th>Runs</th><th>Wkts</th><th>Econ</th></tr>
              </thead>
              <tbody>
                {innings.bowlingCard.map((b) => (
                  <tr key={b.name}>
                    <td>{b.name}</td>
                    <td className="ms-num">{b.overs}</td>
                    <td className="ms-num">{b.maidens}</td>
                    <td className="ms-num">{b.runsConceded}</td>
                    <td className="ms-num">{b.wickets}</td>
                    <td className="ms-num">{b.economy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {innings.fallOfWickets.length > 0 && (
        <>
          <p className="ms-section-label">Fall of Wickets</p>
          <p className="ms-fow-line">
            {innings.fallOfWickets.map((f) => `${f.score}-${f.wicketNumber} (${f.batsmanOut}, ${f.over} ov)`).join(', ')}
          </p>
        </>
      )}

      {innings.partnerships.length > 0 && (
        <>
          <p className="ms-section-label">Partnerships</p>
          <div className="ms-partnerships">
            {innings.partnerships.map((p) => (
              <div
                key={p.partnershipNumber}
                className={`ms-partnership-row ${highestPartnership && p.partnershipNumber === highestPartnership.partnershipNumber ? 'ms-partnership-highest' : ''}`}
              >
                <span>
                  Partnership {p.partnershipNumber}: {p.batsmen.join(' & ')}
                  {highestPartnership && p.partnershipNumber === highestPartnership.partnershipNumber && ' 🏆 Highest'}
                </span>
                <span className="ms-partnership-runs">{p.runs} ({p.balls})</span>
              </div>
            ))}
          </div>
        </>
      )}

      {innings.wagonWheel && (
        <>
          <p className="ms-section-label">🎯 Wagon Wheel</p>
          <WagonWheel wagonWheel={innings.wagonWheel} />
        </>
      )}

      <p className="ms-section-label">Run Rate</p>
      <RunRateGraph data={innings.runRate} />

      {innings.commentary.length > 0 && (
        <>
          <p className="ms-section-label">🎙️ Ball-by-Ball Commentary</p>
          <div className="ms-commentary-feed">
            {[...innings.commentary].reverse().map((c, i) => (
              <div key={i} className="ms-commentary-row">
                <span className="ms-commentary-label">{c.label}</span>
                <span>{c.text}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MatchSummaryPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch(`${API_URL}/api/gully-cricket/matches/${id}/summary`);
        if (!res.ok) throw new Error('Match not found');
        setData(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [id]);

  if (loading) {
    return <div className="gc-container"><div className="loading-state"><div className="spinner"></div><p>Loading scorecard...</p></div></div>;
  }
  if (error || !data) {
    return (
      <div className="gc-container">
        <p className="gc-error">⚠️ {error || 'Match not found'}</p>
        <Link to="/gully-cricket" className="gc-back-link">← Back to Gully Cricket</Link>
      </div>
    );
  }

  const { match, innings, awards } = data;

  return (
    <div className="gc-container">
      <Link to="/gully-cricket" className="gc-back-link">← Back</Link>

      <div className="gc-hero" style={{ padding: '28px' }}>
        <h1 className="gc-title" style={{ fontSize: '1.6rem' }}>{match.teamA.name} <span className="gc-accent">vs</span> {match.teamB.name}</h1>
        <p className="gc-subtitle">
          {match.overs}-over match · {match[match.tossWonBy].name} has won the toss and elected to {match.tossDecision === 'bat' ? 'bat first' : 'bowl first'}
        </p>
        {match.status === 'completed' && <div className="ls-result-banner" style={{ marginTop: 12 }}>🏆 {match.result}</div>}
      </div>

      {awards && (
        <div className="ms-awards-section">
          <h2 className="ms-awards-title">🏆 Match Awards</h2>
          <div className="ms-awards-grid">
            {Object.entries(AWARD_META).map(([key, meta]) => {
              const award = awards[key];
              if (!award) return null;
              return (
                <div key={key} className="ms-award-card">
                  <span className="ms-award-icon">{meta.icon}</span>
                  <p className="ms-award-label">{meta.label}</p>
                  <p className="ms-award-name">{award.name}</p>
                  <p className="ms-award-stat">{award.statLine}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {innings.length === 2 && (
        <div className="ms-innings-block">
          <p className="ms-section-label" style={{ marginTop: 0 }}>📈 Worm Graph — Score Progression</p>
          <WormGraph innings={innings} />
        </div>
      )}

      {innings.map((inn, i) => (
        <InningsSummary key={i} innings={inn} matchOvers={match.overs} />
      ))}
    </div>
  );
}

export default MatchSummaryPage;