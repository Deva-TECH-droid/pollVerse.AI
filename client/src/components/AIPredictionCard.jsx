import React, { useEffect, useState, useRef } from 'react';
import '../styles/AIPredictionCard.css';

// Animates a number counting up from 0 to `value` whenever it changes/mounts.
function AnimatedPercent({ value }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    const from = 0;

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  return <>{display}%</>;
}

// Best-effort icon for a "why" factor based on its wording, so the reasons
// underneath the prediction read as tagged chips rather than a plain list.
function factorIcon(text) {
  const t = text.toLowerCase();
  if (t.includes('goal')) return '⚽';
  if (t.includes('assist')) return '🎯';
  if (t.includes('form')) return '📈';
  if (t.includes('histor') || t.includes('past') || t.includes('career')) return '🏆';
  if (t.includes('vote') || t.includes('trend')) return '📊';
  if (t.includes('fan') || t.includes('popular')) return '🔥';
  return '✓';
}

function AIPredictionCard({ poll }) {
  if (!poll?.aiPrediction) return null;
  const { aiPrediction, options } = poll;

  const predictedIndex = aiPrediction.predictedOptionIndex;
  const probabilities = options.map((_, i) => aiPrediction.probabilities?.[i] || 0);
  const topTwo = [...probabilities].sort((a, b) => b - a).slice(0, 2);
  const meterLeftPct = probabilities[0] || 0;

  return (
    <div className="aiv-card">
      <div className="aiv-header">
        <span className="aiv-robot">🤖</span>
        <div className="aiv-header-text">
          <p className="aiv-title">AI Poll Insights</p>
          <p className="aiv-subtitle">Prediction based on stats and historical data</p>
        </div>
        <span className={`aiv-confidence aiv-confidence-${(aiPrediction.confidenceLevel || 'medium').toLowerCase()}`}>
          {aiPrediction.confidenceLevel || 'Medium'} Confidence
        </span>
      </div>

      {/* Head-to-head meter — only really reads well for 2-option polls,
          which is the common case (e.g. Messi vs Ronaldo). */}
      {options.length === 2 && (
        <div className="aiv-meter-wrap">
          <div className="aiv-meter-labels">
            <span>{options[0].text}</span>
            <span>{options[1].text}</span>
          </div>
          <div className="aiv-meter-track">
            <div className="aiv-meter-fill-left" style={{ width: `${meterLeftPct}%` }} />
          </div>
          <div className="aiv-meter-values">
            <span className={predictedIndex === 0 ? 'aiv-meter-winner' : ''}>
              <AnimatedPercent value={probabilities[0]} /> {predictedIndex === 0 && '👑'}
            </span>
            <span className={predictedIndex === 1 ? 'aiv-meter-winner' : ''}>
              {predictedIndex === 1 && '👑'} <AnimatedPercent value={probabilities[1]} />
            </span>
          </div>
        </div>
      )}

      {/* Full probability breakdown — always shown, useful beyond 2 options too. */}
      <div className="aiv-prob-list">
        {options.map((option, index) => {
          const isWinner = predictedIndex === index;
          return (
            <div key={index} className={`aiv-prob-row ${isWinner ? 'aiv-prob-row-winner' : ''}`}>
              <div className="aiv-prob-top">
                <span className="aiv-prob-name">
                  {option.text} {isWinner && '👑'}
                </span>
                <span className="aiv-prob-pct">
                  <AnimatedPercent value={probabilities[index]} />
                </span>
              </div>
              <div className="aiv-prob-track">
                <div
                  className={`aiv-prob-fill ${isWinner ? 'aiv-prob-fill-winner' : ''}`}
                  style={{ width: `${probabilities[index]}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* "Based on" factor chips */}
      {aiPrediction.explainableAI?.length > 0 && (
        <div className="aiv-factors">
          <p className="aiv-factors-label">
            Based on why AI favors {options[predictedIndex]?.text || 'this option'}
          </p>
          <div className="aiv-factor-chips">
            {aiPrediction.explainableAI.map((point, i) => {
              const clean = point.replace(/^✓\s*/, '');
              return (
                <span key={i} className="aiv-factor-chip">
                  <span className="aiv-factor-icon">{factorIcon(clean)}</span> {clean}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison dashboard, kept from the original but restyled */}
      {aiPrediction.comparisonStats?.length > 0 && (
        <div className="aiv-comparison">
          <p className="aiv-factors-label">📊 Live Comparison Dashboard</p>
          <div className="aiv-table-wrap">
            <table className="aiv-table">
              <thead>
                <tr>
                  <th>Statistic</th>
                  {options.map((option, index) => (
                    <th key={index}>{option.text}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aiPrediction.comparisonStats.map((stat, i) => (
                  <tr key={i}>
                    <td className="aiv-stat-name">{stat.metric}</td>
                    {stat.values.map((val, vi) => (
                      <td key={vi}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {poll.isClosed && aiPrediction.isCorrect !== null && aiPrediction.isCorrect !== undefined && (
        <div className={`aiv-outcome ${aiPrediction.isCorrect ? 'aiv-outcome-correct' : 'aiv-outcome-incorrect'}`}>
          🎯 AI predicted <strong>{options[predictedIndex]?.text}</strong> —{' '}
          {aiPrediction.isCorrect ? '✅ Correct' : '❌ Incorrect'}
        </div>
      )}

      <div className="aiv-disclaimer">
        This is only a recommendation — it doesn't decide the outcome. Vote for whoever you actually think will win.
      </div>
    </div>
  );
}

export default AIPredictionCard;