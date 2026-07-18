import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/HomePage.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function PollCard({ poll, onDeleted }) {
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    // Stop the card's own onClick (which navigates to the poll) from firing.
    e.stopPropagation();

    const confirmed = window.confirm(`Delete "${poll.question}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/polls/${poll._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || 'Failed to delete poll');
      }

      onDeleted?.(poll._id);
    } catch (err) {
      alert(err.message);
      setDeleting(false);
    }
  };

  const topOption =
    poll.options && poll.options.length > 0
      ? poll.options.reduce((max, opt) => (opt.votes > max.votes ? opt : max), poll.options[0])
      : null;

  const createdDate = new Date(poll.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className="poll-card"
      onClick={() => navigate(`/poll/${poll._id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/poll/${poll._id}`)}
      aria-label={`View poll: ${poll.question}`}
    >
      <div className="poll-card-header">
        <span className="poll-card-badge">LIVE</span>
        <span className="poll-card-date">{createdDate}</span>
        {user?.isAdmin && (
          <button
            className="poll-card-delete-btn"
            onClick={handleDelete}
            disabled={deleting}
            title="Delete poll"
            aria-label="Delete poll"
          >
            {deleting ? '⏳' : '🗑️'}
          </button>
        )}
      </div>
      <h3 className="poll-card-question">{poll.question}</h3>
      <div className="poll-card-footer">
        <div className="poll-card-stats">
          <span className="poll-stat">
            <span className="poll-stat-value">{poll.totalVotes}</span>
            <span className="poll-stat-label">votes</span>
          </span>
          <span className="poll-stat">
            <span className="poll-stat-value">{poll.options.length}</span>
            <span className="poll-stat-label">options</span>
          </span>
        </div>
        {topOption && poll.totalVotes > 0 && (
          <div className="poll-card-top">
            🏆 <span>{topOption.text}</span>
          </div>
        )}
      </div>
      <div className="poll-card-arrow">→</div>
    </div>
  );
}

export default PollCard;