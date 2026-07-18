import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/TrendingPolls.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function useCountdown(closesAt) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = new Date(closesAt) - new Date();
      if (diff <= 0) {
        setLabel('Closing...');
        return;
      }
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setLabel(`${h}:${m}:${s}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [closesAt]);

  return label;
}

function MostVotedCard({ poll, onClick }) {
  return (
    <div className="trend-card" onClick={onClick}>
      <p className="trend-card-question">{poll.question}</p>
      <span className="trend-card-metric">🔥 {poll.totalVotes.toLocaleString()} Votes</span>
    </div>
  );
}

function EndingSoonCard({ poll, onClick }) {
  const countdown = useCountdown(poll.closesAt);
  return (
    <div className="trend-card" onClick={onClick}>
      <p className="trend-card-question">{poll.question}</p>
      <span className="trend-card-metric trend-card-urgent">⏳ Ends in {countdown}</span>
    </div>
  );
}

function TrendingTodayCard({ poll, onClick }) {
  return (
    <div className="trend-card" onClick={onClick}>
      <p className="trend-card-question">{poll.question}</p>
      <span className="trend-card-metric trend-card-up">↑ +{poll.votesToday.toLocaleString()} Votes Today</span>
    </div>
  );
}

function TrendingRow({ title, items, renderCard }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="trending-row">
      <h2 className="trending-row-title">{title}</h2>
      <div className="trending-row-scroll">
        {items.map((poll) => (
          <React.Fragment key={poll._id}>{renderCard(poll)}</React.Fragment>
        ))}
      </div>
    </div>
  );
}

function TrendingPolls() {
  const navigate = useNavigate();
  const [data, setData] = useState({ mostVoted: [], endingSoon: [], trendingToday: [] });
  const [loading, setLoading] = useState(true);

  const fetchTrending = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/polls/trending`);
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to load trending polls:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending();
    // Refresh periodically so vote counts / countdowns / scores stay fresh
    // without the user having to reload the page.
    const interval = setInterval(fetchTrending, 60000);
    return () => clearInterval(interval);
  }, [fetchTrending]);

  const goToPoll = (id) => navigate(`/poll/${id}`);

  if (loading) return null;

  const hasAnyTrending = data.mostVoted.length || data.endingSoon.length || data.trendingToday.length;
  if (!hasAnyTrending) return null;

  return (
    <div className="trending-polls-section">
      <TrendingRow
        title="🔥 Most Voted"
        items={data.mostVoted}
        renderCard={(poll) => <MostVotedCard poll={poll} onClick={() => goToPoll(poll._id)} />}
      />
      <TrendingRow
        title="📈 Trending Today"
        items={data.trendingToday}
        renderCard={(poll) => <TrendingTodayCard poll={poll} onClick={() => goToPoll(poll._id)} />}
      />
      <TrendingRow
        title="⏳ Ending Soon"
        items={data.endingSoon}
        renderCard={(poll) => <EndingSoonCard poll={poll} onClick={() => goToPoll(poll._id)} />}
      />
    </div>
  );
}

export default TrendingPolls;