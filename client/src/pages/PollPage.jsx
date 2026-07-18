import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import socket from '../socket';
import { AuthContext } from '../context/AuthContext';
import Confetti from '../components/Confetti';
import Discussion from '../components/Discussion';
import AIPredictionCard from '../components/AIPredictionCard';
import '../styles/PollPage.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function PollPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { getToken } = useAuth();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voted, setVoted] = useState(false);
  const [votedIndex, setVotedIndex] = useState(null);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState(null);
  const [barsAnimated, setBarsAnimated] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const hasCelebratedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    const checkMyVote = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/polls/${id}/my-vote`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.voted) {
          setVoted(true);
          setVotedIndex(data.optionIndex);
        }
      } catch (err) {
        console.error('Failed to check vote status:', err);
      }
    };
    checkMyVote();
  }, [id, user, getToken]);

  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/polls/${id}`);
        if (!res.ok) throw new Error('Poll not found');
        const data = await res.json();
        setPoll(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPoll();
  }, [id]);

  useEffect(() => {
    socket.emit('joinPoll', id);

    socket.on('pollUpdated', (updatedPoll) => {
      setPoll(updatedPoll);
      setVoting(false);
    });

    socket.on('voteError', ({ message }) => {
      setVoteError(message);
      setVoting(false);
    });

    return () => {
      socket.off('pollUpdated');
      socket.off('voteError');
    };
  }, [id]);

  useEffect(() => {
    if (!poll) return;
    const shouldShowBars = voted || poll.isClosed;
    if (!shouldShowBars) {
      setBarsAnimated(false);
      return;
    }
    setBarsAnimated(false);
    const t = setTimeout(() => setBarsAnimated(true), 50);
    return () => clearTimeout(t);
  }, [poll, voted]);

  useEffect(() => {
    if (!poll || !poll.isClosed || poll.winningOptionIndex === null) return;
    if (!voted || votedIndex !== poll.winningOptionIndex) return;
    if (hasCelebratedRef.current) return;

    hasCelebratedRef.current = true;
    setShowCelebration(true);
    const t = setTimeout(() => setShowCelebration(false), 5000);
    return () => clearTimeout(t);
  }, [poll, voted, votedIndex]);

  const handleVote = useCallback(
    async (optionIndex) => {
      if (voted || voting || !user) return;

      setVoting(true);
      setVoteError(null);
      try {
        const token = await getToken();
        socket.emit('submitVote', { pollId: id, optionIndex, token });
        setVoted(true);
        setVotedIndex(optionIndex);
      } catch (err) {
        console.error('Vote failed:', err);
        setVoting(false);
        setVoteError('Something went wrong. Please try again.');
      }
    },
    [voted, voting, user, id, getToken]
  );

  const getPercentage = (votes) => {
    if (!poll || poll.totalVotes === 0) return 0;
    return Math.round((votes / poll.totalVotes) * 100);
  };

  const [shareCopied, setShareCopied] = useState(false);
  const handleShare = async () => {
    try {
      await fetch(`${API_URL}/api/polls/${id}/share`, { method: 'POST' });
    } catch (err) {
      console.error('Share tracking failed:', err);
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      alert('Could not copy link — copy it manually from the address bar.');
    }
  };

  if (loading) {
    return (
      <div className="poll-page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading poll...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="poll-page-container">
        <div className="error-state">
          <span>⚠️</span>
          <p>{error}</p>
          <button className="back-btn" onClick={() => navigate('/polls')}>
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  const winningIndex = poll.isClosed ? poll.winningOptionIndex : null;
  const wonThisPoll = poll.isClosed && voted && votedIndex === winningIndex;

  return (
    <div className="poll-page-container">
      {showCelebration && (
        <>
          <Confetti />
          <div className="celebration-banner">
            🎉🎊 Congratulations! Your prediction was the winner! 🎊🎉
          </div>
        </>
      )}

      <div className="poll-wrapper">
        <div className="poll-page-topbar">
          <button className="back-btn" onClick={() => navigate('/polls')}>
            ← Back
          </button>
          <button className="share-btn" onClick={handleShare}>
            {shareCopied ? '✅ Link Copied' : '🔗 Share'}
          </button>
        </div>

        <div className="poll-header">
          <div className={`poll-live-badge ${poll.isClosed ? 'closed' : ''}`}>
            <span className="live-dot"></span>
            {poll.isClosed ? 'CLOSED' : 'LIVE'}
          </div>
          <h1 className="poll-question">{poll.question}</h1>
          {poll.description && <p className="poll-description">{poll.description}</p>}
          <p className="poll-total-votes">
            {poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'} cast
            {poll.rewardPoints ? ` · ${poll.rewardPoints} credits for a correct prediction` : ''}
          </p>
        </div>

        {poll.isClosed && winningIndex !== null && (
          <div className={`winner-banner ${wonThisPoll ? 'winner-banner-won' : ''}`}>
            🏆 Winner: <strong>{poll.options[winningIndex].text}</strong>
            {wonThisPoll && ' — you predicted correctly!'}
          </div>
        )}

        {poll.isClosed && poll.aiInsight && (
          <div className="ai-insight-card">
            <p className="ai-insight-label">✨ Know More</p>
            {poll.aiInsight.split('\n').filter(Boolean).map((para, i) => (
              <p key={i} className="ai-insight-text">{para}</p>
            ))}
          </div>
        )}

        {poll.aiPrediction && <AIPredictionCard poll={poll} />}

        <div className="poll-options">
          {poll.options.map((option, index) => {
            const pct = getPercentage(option.votes);
            const isVotedOption = voted && votedIndex === index;
            const isWinning = poll.isClosed
              ? winningIndex === index
              : voted && poll.totalVotes > 0 && option.votes === Math.max(...poll.options.map((o) => o.votes));
            const showResults = voted || poll.isClosed;

            return (
              <div
                key={index}
                className={`option-card ${voted || !user || poll.isClosed ? 'voted' : 'clickable'} ${isVotedOption ? 'my-vote' : ''} ${isWinning ? 'winning' : ''}`}
                onClick={() => !poll.isClosed && user && handleVote(index)}
                role={!voted && user && !poll.isClosed ? 'button' : undefined}
                tabIndex={!voted && user && !poll.isClosed ? 0 : undefined}
                onKeyDown={(e) => !voted && user && !poll.isClosed && e.key === 'Enter' && handleVote(index)}
                aria-label={`Vote for ${option.text}`}
              >
                <div className="option-content">
                  <div className="option-top-row">
                    <span className="option-text">
                      {isVotedOption && '✓ '}
                      {option.text}
                    </span>
                    {showResults && <span className="option-pct">{pct}%</span>}
                  </div>

                  {showResults && (
                    <div className="progress-bar-track">
                      <div
                        className={`progress-bar-fill ${isWinning ? 'winning-bar' : ''}`}
                        style={{ width: barsAnimated ? `${pct}%` : '0%' }}
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      ></div>
                    </div>
                  )}

                  {showResults && (
                    <span className="option-votes">
                      {option.votes} {option.votes === 1 ? 'vote' : 'votes'}
                    </span>
                  )}
                </div>

                {poll.isClosed && option.info && (
                  <div className="option-info-box">
                    <p className="option-info-label">
                      {isWinning ? '🏆 ' : ''}About {option.text}
                    </p>
                    <p className="option-info-text">{option.info}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {voteError && (
          <div className="vote-prompt" style={{ border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
            <p>⚠️ {voteError}</p>
          </div>
        )}

        {!user && (
          <div className="vote-prompt" style={{ border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
            <p>🔒 You must be logged in to predict and earn rewards.</p>
            <Link to="/login" state={{ from: location }} style={{ color: '#fff', textDecoration: 'underline', marginTop: '8px', display: 'inline-block' }}>Log in now</Link>
          </div>
        )}
        {!voted && user && !poll.isClosed && (
          <p className="vote-prompt">👆 Click an option to lock in your prediction</p>
        )}
        {voted && user && !poll.isClosed && (
          <p className="voted-notice">✅ Your prediction has been recorded. Results update live!</p>
        )}
        {poll.isClosed && voted && votedIndex !== winningIndex && (
          <p className="vote-prompt">This poll has closed. Your prediction didn't match the winning option this time.</p>
        )}

        <Discussion pollId={id} user={user} voted={voted} />
      </div>
    </div>
  );
}

export default PollPage;