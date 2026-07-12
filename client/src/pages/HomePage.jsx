import React, { useEffect, useState } from 'react';
import PollCard from '../components/PollCard';
import '../styles/HomePage.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function HomePage() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const res = await fetch(`${API_URL}/api/polls`);
        if (!res.ok) throw new Error('Failed to fetch polls');
        const data = await res.json();
        setPolls(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPolls();
  }, []);

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading polls...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-container">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="home-hero">
        <h1 className="home-title">
          Real-Time <span className="accent">Polls</span>
        </h1>
        <p className="home-subtitle">
          Vote on live polls and watch results update instantly
        </p>
      </div>

      {polls.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🗳️</div>
          <h2>No polls yet</h2>
          <p>Be the first to create a poll!</p>
        </div>
      ) : (
        <div className="polls-grid">
          {polls.map((poll) => (
            <PollCard key={poll._id} poll={poll} />
          ))}
        </div>
      )}
    </div>
  );
}

export default HomePage;
