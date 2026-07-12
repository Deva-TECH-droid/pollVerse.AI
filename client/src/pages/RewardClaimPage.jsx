import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { AuthContext } from '../context/AuthContext';
import '../styles/RewardClaimPage.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function RewardClaimPage() {
  const { user, loading: authLoading, refreshUser } = useContext(AuthContext);
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [status, setStatus] = useState('checking'); // checking | eligible | not-eligible | claimed | error
  const [milestone, setMilestone] = useState(200);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }

    const checkStatus = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/rewards/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setMilestone(data.milestone);

        if (data.claimed) setStatus('claimed');
        else if (data.eligible) setStatus('eligible');
        else setStatus('not-eligible');
      } catch (err) {
        console.error('Failed to check reward status:', err);
        setStatus('error');
      }
    };
    checkStatus();
  }, [user, authLoading, navigate, location, getToken]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/rewards/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setStatus('claimed');
      refreshUser();
    } catch (err) {
      console.error('Claim failed:', err);
      setStatus('error');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="reward-container">
      <div className="reward-bg-orb orb-a" />
      <div className="reward-bg-orb orb-b" />

      <div className="reward-card">
        {status === 'checking' && (
          <div className="reward-loading">
            <div className="spinner"></div>
            <p>Checking your rewards...</p>
          </div>
        )}

        {status === 'not-eligible' && (
          <>
            <span className="reward-icon">🔒</span>
            <h1>Not quite there yet</h1>
            <p>You need {milestone} credits to unlock this reward. Keep predicting correctly to earn more!</p>
            <Link to="/polls" className="reward-btn">Browse Live Polls</Link>
          </>
        )}

        {status === 'eligible' && (
          <>
            <span className="reward-icon">🎉</span>
            <h1>Congratulations!</h1>
            <p className="reward-sub">
              You have successfully unlocked the {milestone} Credit Reward.
            </p>
            <div className="reward-prize">
              <div className="reward-avatar">👤</div>
              <p>You have earned an opportunity to meet</p>
              <strong>Devansh Upadhyay</strong>
            </div>
            <p className="reward-thanks">Thank you for being an active member of PollVerse.</p>
            <button className="reward-btn" onClick={handleClaim} disabled={claiming}>
              {claiming ? 'Claiming...' : 'Claim Reward'}
            </button>
          </>
        )}

        {status === 'claimed' && (
          <>
            <span className="reward-icon">✅</span>
            <h1>Reward Claimed!</h1>
            <p>You've already claimed your {milestone}-credit reward. Thanks for being part of PollVerse!</p>
            <Link to="/polls" className="reward-btn">Browse More Polls</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <span className="reward-icon">⚠️</span>
            <h1>Something went wrong</h1>
            <p>Please try again in a moment.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default RewardClaimPage;
