import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import '../styles/GullyCricket.css';
import '../styles/LiveScoring.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function StartInningsForm({ match, previousInnings, onStarted, getToken }) {
  const inningsCount = match.innings.length;
  const battingKey = inningsCount === 0 ? match.battingTeam : match.bowlingTeam;
  const bowlingKey = battingKey === 'teamA' ? 'teamB' : 'teamA';
  const battingTeam = match[battingKey];
  const bowlingTeam = match[bowlingKey];
  const isSecondInnings = inningsCount === 1;

  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [bowler, setBowler] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleStart = async () => {
    setError(null);
    if (!striker || !nonStriker || !bowler) {
      setError('Pick both opening batsmen and the opening bowler.');
      return;
    }
    if (striker === nonStriker) {
      setError('Striker and non-striker must be different players.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/gully-cricket/matches/${match._id}/start-innings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ strikerName: striker, nonStrikerName: nonStriker, bowlerName: bowler }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to start innings');
      }
      const data = await res.json();
      onStarted(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const target = match.firstInningsScore !== null ? match.firstInningsScore + 1 : null;
  const battedPlayers = previousInnings?.battingCard?.filter((b) => b.ballsFaced > 0 || b.isOut) || [];

  return (
    <div>
      {isSecondInnings && target !== null && (
        <div className="ls-marquee-banner">
          <div className="ls-marquee-track">
            <span>🎯 TARGET: {target} RUNS TO WIN&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;{battingTeam.name} need {target} runs in {match.overs} overs&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;🎯 TARGET: {target} RUNS TO WIN&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;{battingTeam.name} need {target} runs in {match.overs} overs&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;</span>
          </div>
        </div>
      )}

      {isSecondInnings && previousInnings && (
        <div className="ls-prev-innings-card">
          <p className="ls-prev-innings-title">
            📋 {bowlingTeam.name} · 1st Innings: {previousInnings.totalRuns}/{previousInnings.totalWickets} ({previousInnings.oversDisplay} ov)
          </p>
          <div className="ls-prev-innings-table">
            {battedPlayers.map((b) => (
              <div key={b.name} className="ls-prev-innings-row">
                <span className="ls-prev-innings-name">{b.name}{b.isOut ? '' : ' *'}</span>
                <span className="ls-prev-innings-score">{b.runs} <span className="ls-prev-innings-balls">({b.ballsFaced})</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="gc-form ls-start-form">
        <p className="gc-field-label" style={{ fontSize: '0.95rem' }}>
          {isSecondInnings ? '2nd Innings' : '1st Innings'}: {battingTeam.name} batting, {bowlingTeam.name} bowling
        </p>

        <div className="gc-form-row">
          <div className="gc-form-field">
            <label className="gc-field-label">Striker (on strike)</label>
            <select value={striker} onChange={(e) => setStriker(e.target.value)}>
              <option value="">Select player</option>
              {battingTeam.players.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="gc-form-field">
            <label className="gc-field-label">Non-striker</label>
            <select value={nonStriker} onChange={(e) => setNonStriker(e.target.value)}>
              <option value="">Select player</option>
              {battingTeam.players.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="gc-form-field">
          <label className="gc-field-label">Opening bowler</label>
          <select value={bowler} onChange={(e) => setBowler(e.target.value)}>
            <option value="">Select player</option>
            {bowlingTeam.players.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {error && <p className="gc-error">⚠️ {error}</p>}

        <button className="gc-submit-btn" onClick={handleStart} disabled={submitting}>
          {submitting ? 'Starting...' : '🏏 Start Innings'}
        </button>
      </div>
    </div>
  );
}

function WicketModal({ battingPlayers, bowlingPlayers, currentBattersOnField, onConfirm, onCancel }) {
  const [wicketType, setWicketType] = useState('bowled');
  const [outBatsman, setOutBatsman] = useState(currentBattersOnField.striker);
  const [fielder, setFielder] = useState('');
  const [newBatsman, setNewBatsman] = useState('');
  const availableNew = battingPlayers.filter(
    (p) => p !== currentBattersOnField.striker && p !== currentBattersOnField.nonStriker
  );
  const needsNewBatsman = availableNew.length > 0;
  const needsFielder = ['caught', 'run out', 'stumped'].includes(wicketType);

  return (
    <div className="ls-modal-overlay">
      <div className="ls-modal">
        <h3>🏏 Wicket!</h3>
        <div className="gc-form-field">
          <label className="gc-field-label">How out?</label>
          <select value={wicketType} onChange={(e) => { setWicketType(e.target.value); setFielder(''); }}>
            <option value="bowled">Bowled</option>
            <option value="caught">Caught</option>
            <option value="lbw">LBW</option>
            <option value="run out">Run Out</option>
            <option value="stumped">Stumped</option>
            <option value="hit wicket">Hit Wicket</option>
          </select>
        </div>
        <div className="gc-form-field">
          <label className="gc-field-label">Who's out?</label>
          <select value={outBatsman} onChange={(e) => setOutBatsman(e.target.value)}>
            <option value={currentBattersOnField.striker}>{currentBattersOnField.striker} (striker)</option>
            <option value={currentBattersOnField.nonStriker}>{currentBattersOnField.nonStriker} (non-striker)</option>
          </select>
        </div>
        {needsFielder && (
          <div className="gc-form-field">
            <label className="gc-field-label">
              {wicketType === 'stumped' ? 'Wicketkeeper' : wicketType === 'run out' ? 'Fielder who ran them out' : 'Caught by'}
            </label>
            <select value={fielder} onChange={(e) => setFielder(e.target.value)}>
              <option value="">Select player (optional)</option>
              {bowlingPlayers.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
        {needsNewBatsman && (
          <div className="gc-form-field">
            <label className="gc-field-label">New batsman</label>
            <select value={newBatsman} onChange={(e) => setNewBatsman(e.target.value)}>
              <option value="">Select player</option>
              {availableNew.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
        <div className="ls-modal-actions">
          <button className="ls-btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            className="gc-submit-btn"
            disabled={needsNewBatsman && !newBatsman}
            onClick={() => onConfirm({ wicketType, outBatsman, fielderName: fielder || null, newBatsman: newBatsman || null })}
          >
            Confirm Out
          </button>
        </div>
      </div>
    </div>
  );
}

const SHOT_DIRECTIONS = [
  'Cover Drive', 'Point', 'Third Man', 'Mid Off', 'Long Off',
  'Mid On', 'Mid Wicket', 'Square Leg', 'Fine Leg', 'Long On',
];

function ShotDirectionModal({ runs, onConfirm, onSkip }) {
  return (
    <div className="ls-modal-overlay">
      <div className="ls-modal">
        <h3>🧭 Where did that {runs} go?</h3>
        <p className="gc-field-label" style={{ textTransform: 'none', fontWeight: 500 }}>Optional — for the Wagon Wheel.</p>
        <div className="ls-shot-direction-grid">
          {SHOT_DIRECTIONS.map((d) => (
            <button key={d} className="ls-shot-direction-btn" onClick={() => onConfirm(d)}>
              {d}
            </button>
          ))}
        </div>
        <div className="ls-modal-actions">
          <button className="ls-btn-secondary" onClick={onSkip}>Skip</button>
        </div>
      </div>
    </div>
  );
}

function ExtraRunsModal({ extraType, onConfirm, onCancel }) {
  const labels = { wide: 'Wide', noball: 'No Ball', bye: 'Bye', legbye: 'Leg Bye' };
  const helpText = {
    wide: 'Base 1 run is automatic. Add extra runs if they ran or it went to the boundary.',
    noball: 'Base 1 run is automatic. Add runs the batsman actually scored off the bat.',
    bye: 'How many runs did they run/get for the bye?',
    legbye: 'How many runs did they run/get for the leg bye?',
  };

  return (
    <div className="ls-modal-overlay">
      <div className="ls-modal">
        <h3>{labels[extraType]}</h3>
        <p className="gc-field-label" style={{ textTransform: 'none', fontWeight: 500 }}>{helpText[extraType]}</p>
        <div className="ls-extra-runs-grid">
          {[0, 1, 2, 3, 4, 6].map((r) => (
            <button key={r} className="ls-extra-run-option" onClick={() => onConfirm(r)}>
              +{r}
            </button>
          ))}
        </div>
        <div className="ls-modal-actions">
          <button className="ls-btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function NewBowlerModal({ bowlingPlayers, lastBowler, onConfirm }) {
  const [bowler, setBowler] = useState('');
  const options = bowlingPlayers.filter((p) => p !== lastBowler);

  return (
    <div className="ls-modal-overlay">
      <div className="ls-modal">
        <h3>🎯 Over complete — new bowler</h3>
        <div className="gc-form-field">
          <select value={bowler} onChange={(e) => setBowler(e.target.value)}>
            <option value="">Select bowler</option>
            {options.map((p) => <option key={p} value={p}>{p}</option>)}
            {lastBowler && <option value={lastBowler}>{lastBowler} (bowl again)</option>}
          </select>
        </div>
        <div className="ls-modal-actions">
          <button className="gc-submit-btn" disabled={!bowler} onClick={() => onConfirm(bowler)}>
            Confirm Bowler
          </button>
        </div>
      </div>
    </div>
  );
}

function LiveScoringPage() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const [match, setMatch] = useState(null);
  const [inningsSummaries, setInningsSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [pendingExtraType, setPendingExtraType] = useState(null);
  const [pendingRunTap, setPendingRunTap] = useState(null); // run value awaiting an optional shot direction
  const [pendingBowlerPick, setPendingBowlerPick] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [stashedBowler, setStashedBowler] = useState(null);

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/gully-cricket/matches/${id}`);
      if (!res.ok) throw new Error('Match not found');
      const data = await res.json();
      setMatch(data.match);
      setInningsSummaries(data.innings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  const applyResponse = (data) => {
    setMatch(data.match);
    setInningsSummaries(data.innings);
  };

  const submitBall = async (payload) => {
    setScoring(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/gully-cricket/matches/${id}/ball`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // Server is telling us it needs a bowler pick before this ball counts.
        if (err.message?.includes('bowler')) {
          setPendingBowlerPick(true);
          setScoring(false);
          return;
        }
        throw new Error(err.message || 'Failed to record ball');
      }
      const data = await res.json();
      applyResponse(data);

      const currentInnings = data.innings[data.innings.length - 1];
      if (!currentInnings.isComplete && currentInnings.current.legalBallsThisOver === 0 && !currentInnings.current.bowler) {
        setPendingBowlerPick(true);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setScoring(false);
    }
  };

  const handleScoreTap = (runs) => {
    if (runs === 0) {
      stashedBowler ? scoreWithStashedBowler({ runs }) : submitBall({ runs });
      return;
    }
    setPendingRunTap(runs);
  };
  const handleShotDirectionConfirm = (shotDirection) => {
    const runs = pendingRunTap;
    setPendingRunTap(null);
    const payload = { runs, shotDirection };
    if (stashedBowler) scoreWithStashedBowler(payload);
    else submitBall(payload);
  };
  const handleShotDirectionSkip = () => {
    const runs = pendingRunTap;
    setPendingRunTap(null);
    const payload = { runs };
    if (stashedBowler) scoreWithStashedBowler(payload);
    else submitBall(payload);
  };
  const handleExtraConfirm = (extraRuns) => {
    const extraType = pendingExtraType;
    setPendingExtraType(null);
    const payload = { runs: extraRuns, extraType };
    if (stashedBowler) scoreWithStashedBowler(payload);
    else submitBall(payload);
  };
  const handleWicketConfirm = ({ wicketType, outBatsman, fielderName, newBatsman }) => {
    setShowWicketModal(false);
    submitBall({ runs: 0, isWicket: true, wicketType, outBatsmanName: outBatsman, fielderName, newBatsmanName: newBatsman });
  };
  const handleBowlerConfirm = (bowlerName) => {
    setPendingBowlerPick(false);
    // Bowler alone doesn't record a ball — stash it, next tap includes it.
    setStashedBowler(bowlerName);
  };

  const scoreWithStashedBowler = (extra) => {
    const payload = { ...extra, newBowlerName: stashedBowler };
    setStashedBowler(null);
    submitBall(payload);
  };

  if (loading) {
    return (
      <div className="gc-container">
        <div className="loading-state"><div className="spinner"></div><p>Loading match...</p></div>
      </div>
    );
  }
  if (error || !match) {
    return (
      <div className="gc-container">
        <p className="gc-error">⚠️ {error || 'Match not found'}</p>
        <Link to="/gully-cricket" className="gc-back-link">← Back to Gully Cricket</Link>
      </div>
    );
  }

  const lastInnings = inningsSummaries[inningsSummaries.length - 1];
  const needsInningsStart = match.innings.length === 0 || (lastInnings && lastInnings.isComplete && match.status !== 'completed');

  return (
    <div className="gc-container">
      <Link to="/gully-cricket" className="gc-back-link">← Back</Link>

      <div className="gc-hero" style={{ padding: '24px' }}>
        <h1 className="gc-title" style={{ fontSize: '1.5rem' }}>{match.teamA.name} <span className="gc-accent">vs</span> {match.teamB.name}</h1>
        <p className="gc-subtitle">
          {match.overs}-over match · {match[match.tossWonBy].name} has won the toss and elected to {match.tossDecision === 'bat' ? 'bat first' : 'bowl first'}
        </p>
      </div>

      {match.status === 'completed' && (
        <>
          <div className="ls-result-banner">🏆 {match.result}</div>
          <Link to={`/gully-cricket/match/${match._id}/summary`} className="gc-submit-btn gc-cta-link" style={{ marginBottom: 20 }}>
            📊 View Full Scorecard & Awards
          </Link>
        </>
      )}

      {needsInningsStart ? (
        <StartInningsForm
          match={match}
          previousInnings={match.innings.length === 1 ? inningsSummaries[0] : null}
          onStarted={applyResponse}
          getToken={getToken}
        />
      ) : (
        lastInnings && (
          <>
            <div className="ls-scoreboard">
              <p className="ls-score-team">{match[lastInnings.battingTeam].name}</p>
              <p className="ls-score-main">{lastInnings.totalRuns}/{lastInnings.totalWickets}
                <span className="ls-score-overs"> ({lastInnings.oversDisplay} ov)</span>
              </p>
              {lastInnings.requiredRunRate && (
                <div className="ls-rrr-block">
                  <p className="ls-target-line">
                    Target: {lastInnings.target} · Need {lastInnings.requiredRunRate.runsNeeded} runs off {lastInnings.requiredRunRate.ballsRemaining} balls
                  </p>
                  <div className="ls-rrr-stats">
                    <span>CRR: <strong>{lastInnings.requiredRunRate.currentRunRate}</strong></span>
                    <span className="ls-rrr-required">
                      RRR: <strong>{lastInnings.requiredRunRate.requiredRunRate ?? '—'}</strong>
                    </span>
                  </div>
                </div>
              )}
              <div className="ls-recent-balls">
                {lastInnings.recentBalls.map((b, i) => (
                  <span key={i} className={`ls-ball-chip ${b.isWicket ? 'ls-ball-wicket' : b.isBoundary ? 'ls-ball-boundary' : ''}`}>
                    {b.display}
                  </span>
                ))}
              </div>
            </div>

            {lastInnings.latestCommentary && !lastInnings.isComplete && (
              <div className="ls-commentary-line">🎙️ {lastInnings.latestCommentary}</div>
            )}

            {lastInnings.currentPartnership && !lastInnings.isComplete && (
              <div className="ls-partnership-line">
                🤝 {lastInnings.currentPartnership.batsmen.join(' & ')}: <strong>{lastInnings.currentPartnership.runs}</strong> runs ({lastInnings.currentPartnership.balls} balls)
              </div>
            )}

            {!lastInnings.isComplete && match.status !== 'completed' && (
              <>
                <div className="ls-batters-row">
                  <div className="ls-batter-card">
                    <p className="ls-batter-name">⭐ {lastInnings.current.striker}</p>
                    <p className="ls-batter-stats">
                      {lastInnings.battingCard.find((b) => b.name === lastInnings.current.striker)?.runs || 0} (
                      {lastInnings.battingCard.find((b) => b.name === lastInnings.current.striker)?.ballsFaced || 0})
                    </p>
                  </div>
                  <div className="ls-batter-card">
                    <p className="ls-batter-name">{lastInnings.current.nonStriker}</p>
                    <p className="ls-batter-stats">
                      {lastInnings.battingCard.find((b) => b.name === lastInnings.current.nonStriker)?.runs || 0} (
                      {lastInnings.battingCard.find((b) => b.name === lastInnings.current.nonStriker)?.ballsFaced || 0})
                    </p>
                  </div>
                  <div className="ls-batter-card ls-bowler-card">
                    <p className="ls-batter-name">🎯 {lastInnings.current.bowler || stashedBowler || '—'}</p>
                    <p className="ls-batter-stats">
                      {lastInnings.bowlingCard.find((b) => b.name === lastInnings.current.bowler)?.overs || '0.0'} ov ·{' '}
                      {lastInnings.bowlingCard.find((b) => b.name === lastInnings.current.bowler)?.wickets || 0}/
                      {lastInnings.bowlingCard.find((b) => b.name === lastInnings.current.bowler)?.runsConceded || 0}
                    </p>
                  </div>
                </div>

                <div className="ls-scoring-pad">
                  {[0, 1, 2, 3, 4, 6].map((r) => (
                    <button
                      key={r}
                      className={`ls-run-btn ${r === 4 || r === 6 ? 'ls-run-btn-boundary' : ''}`}
                      disabled={scoring}
                      onClick={() => handleScoreTap(r)}
                    >
                      {r}
                    </button>
                  ))}
                  <button className="ls-extra-btn" disabled={scoring} onClick={() => setPendingExtraType('wide')}>Wide</button>
                  <button className="ls-extra-btn" disabled={scoring} onClick={() => setPendingExtraType('noball')}>No Ball</button>
                  <button className="ls-extra-btn" disabled={scoring} onClick={() => setPendingExtraType('bye')}>Bye</button>
                  <button className="ls-extra-btn" disabled={scoring} onClick={() => setPendingExtraType('legbye')}>Leg Bye</button>
                  <button className="ls-wicket-btn" disabled={scoring} onClick={() => setShowWicketModal(true)}>🏏 WICKET</button>
                </div>
              </>
            )}

            {lastInnings.isComplete && match.status !== 'completed' && (
              <div className="gc-placeholder">
                Innings complete: {lastInnings.totalRuns}/{lastInnings.totalWickets}. Start the 2nd innings below.
              </div>
            )}
          </>
        )
      )}

      {showWicketModal && lastInnings && (
        <WicketModal
          battingPlayers={match[lastInnings.battingTeam].players}
          bowlingPlayers={match[lastInnings.bowlingTeam].players}
          currentBattersOnField={{ striker: lastInnings.current.striker, nonStriker: lastInnings.current.nonStriker }}
          onConfirm={handleWicketConfirm}
          onCancel={() => setShowWicketModal(false)}
        />
      )}

      {pendingRunTap !== null && (
        <ShotDirectionModal runs={pendingRunTap} onConfirm={handleShotDirectionConfirm} onSkip={handleShotDirectionSkip} />
      )}

      {pendingExtraType && (
        <ExtraRunsModal
          extraType={pendingExtraType}
          onConfirm={handleExtraConfirm}
          onCancel={() => setPendingExtraType(null)}
        />
      )}

      {pendingBowlerPick && lastInnings && (
        <NewBowlerModal
          bowlingPlayers={match[lastInnings.bowlingTeam].players}
          lastBowler={lastInnings.current.bowler}
          onConfirm={handleBowlerConfirm}
        />
      )}
    </div>
  );
}

export default LiveScoringPage;