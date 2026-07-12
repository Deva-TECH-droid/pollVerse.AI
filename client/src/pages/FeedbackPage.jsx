import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { AuthContext } from '../context/AuthContext';
import '../styles/FeedbackPage.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function FeedbackPage() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: { pathname: '/feedback' } } });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmed = message.trim();
    if (!trimmed) {
      setError('Please write something before sending.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to send feedback');
      }

      setSent(true);
      setMessage('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feedback-container">
      <div className="feedback-wrapper">
        <h1 className="feedback-title">Send Feedback</h1>
        <p className="feedback-subtitle">
          Something not working, or an idea for the app? Let us know — it goes straight to the admin's inbox.
        </p>

        {sent ? (
          <div className="feedback-sent">
            <span>✅</span>
            <p>Thanks! Your feedback has been sent.</p>
            <button className="feedback-btn" onClick={() => setSent(false)}>
              Send Another
            </button>
          </div>
        ) : (
          <form className="feedback-form" onSubmit={handleSubmit}>
            <textarea
              className="feedback-textarea"
              placeholder="Tell us what's on your mind..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={8}
            />
            <span className="feedback-char-count">{message.length}/2000</span>

            {error && (
              <div className="feedback-error" role="alert">
                ⚠️ {error}
              </div>
            )}

            <button type="submit" className="feedback-btn" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default FeedbackPage;