import React, { useState, useEffect } from 'react';
import '../styles/PlayerAIComparisonModal.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function PlayerAIComparisonModal({
  isOpen,
  onClose,
  initialPlayerA = '',
  initialPlayerB = '',
  availablePlayers = [],
}) {
  const [playerA, setPlayerA] = useState(initialPlayerA);
  const [playerB, setPlayerB] = useState(initialPlayerB);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (initialPlayerA) setPlayerA(initialPlayerA);
    if (initialPlayerB) setPlayerB(initialPlayerB);
  }, [initialPlayerA, initialPlayerB]);

  // Automatically trigger comparison if both initial players are provided
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (isOpen && initialPlayerA && initialPlayerB && !result) {
      handleCompare(initialPlayerA, initialPlayerB);
    }
  }, [isOpen, initialPlayerA, initialPlayerB]);
  /* eslint-enable react-hooks/exhaustive-deps */

  if (!isOpen) return null;

  const handleCompare = async (pA = playerA, pB = playerB) => {
    if (!pA?.trim() || !pB?.trim()) {
      setError('Please enter or select both player names.');
      return;
    }
    if (pA.trim().toLowerCase() === pB.trim().toLowerCase()) {
      setError('Please select two different players to compare.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/api/cricket/compare-players?playerA=${encodeURIComponent(
          pA.trim()
        )}&playerB=${encodeURIComponent(pB.trim())}`
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to compare players');
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFormClass = (form) => {
    const f = (form || '').toLowerCase();
    if (f === 'strong') return 'pac-form-strong';
    if (f === 'moderate') return 'pac-form-moderate';
    if (f === 'dip') return 'pac-form-dip';
    return 'pac-form-emerging';
  };

  return (
    <div className="pac-modal-backdrop" onClick={onClose}>
      <div className="pac-modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="pac-modal-header">
          <div className="pac-header-title-wrap">
            <span className="pac-ai-chip">🤖 AI HEAD-TO-HEAD</span>
            <h2>Cricket Player Performance & AI Prediction</h2>
            <p>
              Data-driven statistical comparison grounded on verified match records and form analytics.
            </p>
          </div>
          <button type="button" className="pac-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Player Selector Bar */}
        <div className="pac-selector-bar">
          <div className="pac-input-col">
            <label className="pac-col-label">Player A</label>
            {availablePlayers.length > 0 ? (
              <input
                type="text"
                list="pac-players-list-a"
                value={playerA}
                onChange={(e) => setPlayerA(e.target.value)}
                placeholder="e.g. Arun, Virat, Rohit..."
              />
            ) : (
              <input
                type="text"
                value={playerA}
                onChange={(e) => setPlayerA(e.target.value)}
                placeholder="Enter player name (e.g. Arun)..."
              />
            )}
            <datalist id="pac-players-list-a">
              {availablePlayers.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <div className="pac-vs-badge">VS</div>

          <div className="pac-input-col">
            <label className="pac-col-label">Player B</label>
            {availablePlayers.length > 0 ? (
              <input
                type="text"
                list="pac-players-list-b"
                value={playerB}
                onChange={(e) => setPlayerB(e.target.value)}
                placeholder="e.g. Finn, Bumrah, Shami..."
              />
            ) : (
              <input
                type="text"
                value={playerB}
                onChange={(e) => setPlayerB(e.target.value)}
                placeholder="Enter player name (e.g. Finn)..."
              />
            )}
            <datalist id="pac-players-list-b">
              {availablePlayers.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <button
            type="button"
            className="pac-analyze-btn"
            disabled={loading || !playerA.trim() || !playerB.trim()}
            onClick={() => handleCompare(playerA, playerB)}
          >
            {loading ? 'Analyzing Data...' : '⚡ Run AI Comparison'}
          </button>
        </div>

        {error && <div className="pac-error-banner">⚠️ {error}</div>}

        {loading && (
          <div className="pac-loading-state">
            <div className="spinner"></div>
            <p>Scanning career match records, extracting ball logs & generating evidence-based AI prediction...</p>
          </div>
        )}

        {result && !loading && (
          <div className="pac-results-container">
            {/* Top Head-to-Head Cards */}
            <div className="pac-h2h-cards">
              {/* Player A Card */}
              <div className="pac-player-card">
                <div className="pac-card-avatar-row">
                  {result.playerA.photoUrl ? (
                    <img
                      src={
                        result.playerA.photoUrl.startsWith('http')
                          ? result.playerA.photoUrl
                          : `${API_URL}${result.playerA.photoUrl}`
                      }
                      alt={result.playerA.name}
                      className="pac-player-photo"
                    />
                  ) : (
                    <div className="pac-player-initials">
                      {result.playerA.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="pac-player-title-block">
                    <h3>{result.playerA.name}</h3>
                    <p className="pac-player-meta">
                      {result.playerA.team} · {result.playerA.role}
                    </p>
                  </div>
                </div>

                <div className="pac-card-quick-stats">
                  <div className="pac-quick-stat">
                    <span className="pac-qs-val">{result.playerA.runs}</span>
                    <span className="pac-qs-lbl">Runs</span>
                  </div>
                  <div className="pac-quick-stat">
                    <span className="pac-qs-val">{result.playerA.wickets}</span>
                    <span className="pac-qs-lbl">Wickets</span>
                  </div>
                  <div className="pac-quick-stat">
                    <span className="pac-qs-val">{result.playerA.catches}</span>
                    <span className="pac-qs-lbl">Catches</span>
                  </div>
                  <div className="pac-quick-stat">
                    <span className="pac-qs-val">{result.playerA.mvpPoints}</span>
                    <span className="pac-qs-lbl">MVP Pts</span>
                  </div>
                </div>

                <div className="pac-card-form-row">
                  <span>Recent Form:</span>
                  <span className={`pac-form-badge ${getFormClass(result.playerA.recentForm)}`}>
                    {result.playerA.recentForm}
                  </span>
                  {!result.playerA.isAvailable && (
                    <span className="pac-unavail-badge">⚠️ Limited Match History</span>
                  )}
                </div>
              </div>

              {/* Dynamic Win Probability Gauge */}
              <div className="pac-prediction-gauge">
                <div className="pac-gauge-header">
                  <span className="pac-pred-label">AI PREDICTED EDGE</span>
                  <span className="pac-favored-tag">
                    ⭐ Favors <strong>{result.prediction.favoredPlayer}</strong>
                  </span>
                </div>

                <div className="pac-prob-bar-wrapper">
                  <div
                    className="pac-prob-fill pac-prob-a"
                    style={{ width: `${result.prediction.playerAProbability}%` }}
                  >
                    <span>{result.prediction.playerAProbability}%</span>
                  </div>
                  <div
                    className="pac-prob-fill pac-prob-b"
                    style={{ width: `${result.prediction.playerBProbability}%` }}
                  >
                    <span>{result.prediction.playerBProbability}%</span>
                  </div>
                </div>

                <div className="pac-prob-labels">
                  <span>{result.playerA.name}</span>
                  <span>{result.playerB.name}</span>
                </div>

                <div className="pac-confidence-chip">
                  <span>Confidence: <strong>{result.prediction.confidenceLevel}</strong> ({result.prediction.confidenceScore}%)</span>
                  <span>•</span>
                  <span>Source: {result.prediction.dataSource}</span>
                </div>
              </div>

              {/* Player B Card */}
              <div className="pac-player-card">
                <div className="pac-card-avatar-row">
                  {result.playerB.photoUrl ? (
                    <img
                      src={
                        result.playerB.photoUrl.startsWith('http')
                          ? result.playerB.photoUrl
                          : `${API_URL}${result.playerB.photoUrl}`
                      }
                      alt={result.playerB.name}
                      className="pac-player-photo"
                    />
                  ) : (
                    <div className="pac-player-initials">
                      {result.playerB.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="pac-player-title-block">
                    <h3>{result.playerB.name}</h3>
                    <p className="pac-player-meta">
                      {result.playerB.team} · {result.playerB.role}
                    </p>
                  </div>
                </div>

                <div className="pac-card-quick-stats">
                  <div className="pac-quick-stat">
                    <span className="pac-qs-val">{result.playerB.runs}</span>
                    <span className="pac-qs-lbl">Runs</span>
                  </div>
                  <div className="pac-quick-stat">
                    <span className="pac-qs-val">{result.playerB.wickets}</span>
                    <span className="pac-qs-lbl">Wickets</span>
                  </div>
                  <div className="pac-quick-stat">
                    <span className="pac-qs-val">{result.playerB.catches}</span>
                    <span className="pac-qs-lbl">Catches</span>
                  </div>
                  <div className="pac-quick-stat">
                    <span className="pac-qs-val">{result.playerB.mvpPoints}</span>
                    <span className="pac-qs-lbl">MVP Pts</span>
                  </div>
                </div>

                <div className="pac-card-form-row">
                  <span>Recent Form:</span>
                  <span className={`pac-form-badge ${getFormClass(result.playerB.recentForm)}`}>
                    {result.playerB.recentForm}
                  </span>
                  {!result.playerB.isAvailable && (
                    <span className="pac-unavail-badge">⚠️ Limited Match History</span>
                  )}
                </div>
              </div>
            </div>

            {/* Key Factors & AI Analysis Grid */}
            <div className="pac-insight-grid">
              <div className="pac-factors-card">
                <h4>🎯 Key Deciding Factors</h4>
                <ul className="pac-factors-list">
                  {result.prediction.keyFactors?.map((factor, idx) => (
                    <li key={idx}>{factor}</li>
                  ))}
                </ul>
                {result.prediction.tacticalEdge && (
                  <div className="pac-tactical-banner">
                    💡 <strong>Tactical Edge:</strong> {result.prediction.tacticalEdge}
                  </div>
                )}
              </div>

              <div className="pac-narrative-card">
                <h4>🧠 AI Performance Analysis</h4>
                <div className="pac-narrative-text">
                  {result.prediction.aiAnalysis.split('\n\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed Side-by-Side Statistics Table */}
            <div className="pac-table-section">
              <h4>📊 Verified Statistical Breakdown</h4>
              <div className="pac-table-scroll">
                <table className="pac-metrics-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Metric</th>
                      <th>{result.playerA.name}</th>
                      <th>{result.playerB.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Matches Played</td>
                      <td>{result.playerA.matchesPlayed}</td>
                      <td>{result.playerB.matchesPlayed}</td>
                    </tr>
                    <tr>
                      <td>Total Runs Scored</td>
                      <td className={result.playerA.runs > result.playerB.runs ? 'pac-win' : ''}>
                        {result.playerA.runs}
                      </td>
                      <td className={result.playerB.runs > result.playerA.runs ? 'pac-win' : ''}>
                        {result.playerB.runs}
                      </td>
                    </tr>
                    <tr>
                      <td>Batting Average</td>
                      <td className={result.playerA.battingAverage > result.playerB.battingAverage ? 'pac-win' : ''}>
                        {result.playerA.battingAverage}
                      </td>
                      <td className={result.playerB.battingAverage > result.playerA.battingAverage ? 'pac-win' : ''}>
                        {result.playerB.battingAverage}
                      </td>
                    </tr>
                    <tr>
                      <td>Strike Rate</td>
                      <td className={result.playerA.strikeRate > result.playerB.strikeRate ? 'pac-win' : ''}>
                        {result.playerA.strikeRate}
                      </td>
                      <td className={result.playerB.strikeRate > result.playerA.strikeRate ? 'pac-win' : ''}>
                        {result.playerB.strikeRate}
                      </td>
                    </tr>
                    <tr>
                      <td>Boundaries (4s / 6s)</td>
                      <td>{result.playerA.fours} / {result.playerA.sixes}</td>
                      <td>{result.playerB.fours} / {result.playerB.sixes}</td>
                    </tr>
                    <tr>
                      <td>Highest Score</td>
                      <td>{result.playerA.highestScore}</td>
                      <td>{result.playerB.highestScore}</td>
                    </tr>
                    <tr>
                      <td>Total Wickets Taken</td>
                      <td className={result.playerA.wickets > result.playerB.wickets ? 'pac-win' : ''}>
                        {result.playerA.wickets}
                      </td>
                      <td className={result.playerB.wickets > result.playerA.wickets ? 'pac-win' : ''}>
                        {result.playerB.wickets}
                      </td>
                    </tr>
                    <tr>
                      <td>Bowling Economy</td>
                      <td className={result.playerA.bowlingEconomy > 0 && (result.playerB.bowlingEconomy === 0 || result.playerA.bowlingEconomy < result.playerB.bowlingEconomy) ? 'pac-win' : ''}>
                        {result.playerA.bowlingEconomy > 0 ? result.playerA.bowlingEconomy : '—'}
                      </td>
                      <td className={result.playerB.bowlingEconomy > 0 && (result.playerA.bowlingEconomy === 0 || result.playerB.bowlingEconomy < result.playerA.bowlingEconomy) ? 'pac-win' : ''}>
                        {result.playerB.bowlingEconomy > 0 ? result.playerB.bowlingEconomy : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td>Catches Taken</td>
                      <td>{result.playerA.catches}</td>
                      <td>{result.playerB.catches}</td>
                    </tr>
                    <tr>
                      <td>MVP Points</td>
                      <td className={result.playerA.mvpPoints > result.playerB.mvpPoints ? 'pac-win' : ''}>
                        <strong>{result.playerA.mvpPoints}</strong>
                      </td>
                      <td className={result.playerB.mvpPoints > result.playerA.mvpPoints ? 'pac-win' : ''}>
                        <strong>{result.playerB.mvpPoints}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td>Player of the Match Awards</td>
                      <td>{result.playerA.motmAwards}</td>
                      <td>{result.playerB.motmAwards}</td>
                    </tr>
                    <tr>
                      <td>Recent Form Status</td>
                      <td><span className={`pac-form-badge ${getFormClass(result.playerA.recentForm)}`}>{result.playerA.recentForm}</span></td>
                      <td><span className={`pac-form-badge ${getFormClass(result.playerB.recentForm)}`}>{result.playerB.recentForm}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerAIComparisonModal;
