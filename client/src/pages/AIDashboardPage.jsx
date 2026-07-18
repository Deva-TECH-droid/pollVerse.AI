import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/AIDashboardPage.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function AIDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/api/polls/ai/dashboard-stats`);
        if (!res.ok) throw new Error('Failed to fetch AI Performance statistics.');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="ai-dashboard-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading AI Performance Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-dashboard-container">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const { totalPredictions, correctPredictions, accuracy, avgConfidence, history } = stats;

  return (
    <div className="ai-dashboard-container">
      <div className="ai-dashboard-header">
        <div className="ai-dashboard-badge">
          <span className="ai-pulse-dot"></span>
          AI INSIGHTS ENGINE
        </div>
        <h1 className="ai-dashboard-title">
          🤖 AI <span className="accent">Performance</span> Dashboard
        </h1>
        <p className="ai-dashboard-subtitle">
          Real-time tracking of Gemini AI prediction success rates and statistical confidence metrics.
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card total-predictions-card">
          <div className="stat-icon-wrapper">📊</div>
          <div>
            <h3 className="stat-label">Total Predictions</h3>
            <p className="stat-number">{totalPredictions}</p>
          </div>
        </div>

        <div className="stat-card correct-predictions-card">
          <div className="stat-icon-wrapper">✅</div>
          <div>
            <h3 className="stat-label">Correct Predictions</h3>
            <p className="stat-number">{correctPredictions}</p>
          </div>
        </div>

        <div className="stat-card accuracy-card">
          <div className="stat-icon-wrapper">🎯</div>
          <div>
            <h3 className="stat-label">AI Accuracy</h3>
            <p className="stat-number">{accuracy}%</p>
            <div className="mini-progress-track">
              <div className="mini-progress-bar" style={{ width: `${accuracy}%` }}></div>
            </div>
          </div>
        </div>

        <div className="stat-card confidence-card">
          <div className="stat-icon-wrapper">⚡</div>
          <div>
            <h3 className="stat-label">Avg. Confidence</h3>
            <p className="stat-number">{avgConfidence}%</p>
            <div className="mini-progress-track">
              <div className="mini-progress-bar confidence-bar" style={{ width: `${avgConfidence}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="history-section">
        <h2 className="history-title">Prediction History</h2>
        
        {history.length === 0 ? (
          <div className="empty-history-state">
            <div className="empty-history-icon">📈</div>
            <h3>No predictions recorded yet</h3>
            <p>Once polls containing AI predictions close, accuracy tracking statistics will populate here.</p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((poll) => {
              const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);

              return (
                <div key={poll._id} className="history-card">
                  <div className="history-card-header">
                    <Link to={`/poll/${poll._id}`} className="history-question">
                      {poll.question}
                    </Link>
                    <div className={`accuracy-badge ${poll.isCorrect ? 'correct' : 'incorrect'}`}>
                      {poll.isCorrect ? '✅ Correct' : '❌ Incorrect'}
                    </div>
                  </div>

                  <div className="history-card-body">
                    <div className="history-details-col">
                      <p className="detail-title">AI Prediction</p>
                      <p className="detail-value">
                        Predicted Option: <strong>{poll.predictedWinner}</strong>
                      </p>
                      <p className="detail-value">
                        Confidence: <span className="detail-confidence-tag">{poll.confidenceLevel} ({poll.confidenceScore || 0}%)</span>
                      </p>
                    </div>

                    <div className="history-details-col">
                      <p className="detail-title">Community Vote Outcome</p>
                      <p className="detail-value">
                        Winner Option: <strong>{poll.actualWinner}</strong>
                      </p>
                      <p className="detail-value text-muted">
                        Total Cast: {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                      </p>
                    </div>
                  </div>

                  <div className="options-votes-distribution">
                    {poll.options.map((opt, optIdx) => {
                      const votePct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                      const aiProb = poll.probabilities[optIdx] || 0;
                      const isAIChosen = poll.predictedOptionIndex === optIdx;
                      const isActualWinner = poll.winningOptionIndex === optIdx;

                      return (
                        <div key={optIdx} className="distribution-row">
                          <div className="distribution-label">
                            <span className="dist-opt-text">
                              {opt.text}
                              {isAIChosen && ' (AI Choice 🤖)'}
                              {isActualWinner && ' (Winner 🏆)'}
                            </span>
                            <span className="dist-pct-text">
                              AI: {aiProb}% | Comm: {votePct}%
                            </span>
                          </div>
                          <div className="distribution-bar-comparison">
                            <div className="dist-bar ai-bar" style={{ width: `${aiProb}%` }} title={`AI: ${aiProb}%`}></div>
                            <div className="dist-bar comm-bar" style={{ width: `${votePct}%` }} title={`Community: ${votePct}%`}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AIDashboardPage;
