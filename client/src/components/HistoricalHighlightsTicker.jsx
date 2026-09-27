import React, { useState, useEffect, useRef } from 'react';
import '../styles/HistoricalHighlightsTicker.css';

const API_URL = process.env.REACT_APP_API_URL || '';
const ROTATION_DURATION_MS = 4000; // 4 seconds per highlight as required

function HistoricalHighlightsTicker({ matchId }) {
  const [highlights, setHighlights] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchHighlights = async () => {
      if (!matchId) return;
      try {
        const res = await fetch(`${API_URL}/api/gully-cricket/matches/${matchId}/historical-highlights`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && Array.isArray(data.highlights) && data.highlights.length > 0) {
          setHighlights(data.highlights);
        }
      } catch (err) {
        console.warn('Could not load historical highlights:', err.message);
      }
    };

    fetchHighlights();
    return () => {
      isMounted = false;
    };
  }, [matchId]);

  // Handle continuous 4-second rotation
  useEffect(() => {
    if (highlights.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % highlights.length);
        setIsAnimating(false);
      }, 350); // Match fade-out duration
    }, ROTATION_DURATION_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [highlights.length, isPaused]);

  if (!highlights || highlights.length === 0) {
    return null;
  }

  const current = highlights[currentIndex];

  const handleNext = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % highlights.length);
      setIsAnimating(false);
    }, 200);
  };

  const handlePrev = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + highlights.length) % highlights.length);
      setIsAnimating(false);
    }, 200);
  };

  return (
    <div
      className="hht-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      title="Live Rotating Match Records & Historical Highlights (Pauses on hover)"
    >
      <div className="hht-top-bar">
        <div className="hht-badge-group">
          <span className="hht-live-indicator">
            <span className="hht-pulse-dot"></span>
            LIVE RECORD FEED
          </span>
          <span className="hht-category-badge">{current.badge || '🏆 Record'}</span>
        </div>

        <div className="hht-controls">
          <span className="hht-counter">
            {currentIndex + 1} / {highlights.length}
          </span>
          <button
            type="button"
            className="hht-nav-btn"
            onClick={handlePrev}
            aria-label="Previous Highlight"
          >
            ‹
          </button>
          <button
            type="button"
            className="hht-nav-btn"
            onClick={handleNext}
            aria-label="Next Highlight"
          >
            ›
          </button>
        </div>
      </div>

      <div className={`hht-content-wrapper ${isAnimating ? 'hht-fade-out' : 'hht-fade-in'}`}>
        <div className="hht-text-content">
          <p className="hht-title">{current.title}</p>
          <p className="hht-text">{current.text}</p>
        </div>
        {current.stat && (
          <div className="hht-stat-pill">
            <span className="hht-stat-value">{current.stat}</span>
          </div>
        )}
      </div>

      {/* Progress animation timer track */}
      {!isPaused && (
        <div key={currentIndex} className="hht-timer-track">
          <div className="hht-timer-fill" style={{ animationDuration: `${ROTATION_DURATION_MS}ms` }}></div>
        </div>
      )}
    </div>
  );
}

export default HistoricalHighlightsTicker;
