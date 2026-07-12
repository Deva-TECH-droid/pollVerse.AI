import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { AuthContext } from '../context/AuthContext';
import '../styles/CreatePage.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function CreatePage() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState([
    { text: '', info: '' },
    { text: '', info: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/create' } } });
      return;
    }
    if (!user.isAdmin) {
      navigate('/polls');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user || !user.isAdmin) return null;

  const handleOptionTextChange = (index, value) => {
    const updated = [...options];
    updated[index] = { ...updated[index], text: value };
    setOptions(updated);
  };

  const handleOptionInfoChange = (index, value) => {
    const updated = [...options];
    updated[index] = { ...updated[index], info: value };
    setOptions(updated);
  };

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, { text: '', info: '' }]);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedQuestion = question.trim();
    const validOptions = options
      .map((o) => ({ text: o.text.trim(), info: o.info.trim() }))
      .filter((o) => o.text.length > 0);

    if (!trimmedQuestion) {
      setError('Please enter a question.');
      return;
    }
    if (validOptions.length < 2) {
      setError('Please provide at least 2 non-empty options.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: trimmedQuestion, description: description.trim(), options: validOptions }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create poll');
      }

      const newPoll = await res.json();
      navigate(`/poll/${newPoll._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-container">
      <div className="create-wrapper">
        <div className="create-header">
          <h1 className="create-title">Create a New Poll</h1>
          <p className="create-subtitle">Ask a question and let the crowd decide</p>
        </div>

        <form className="create-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="question" className="form-label">
              Your Question
            </label>
            <input
              id="question"
              type="text"
              className="form-input"
              placeholder="e.g. Who is the greatest batsman in cricket history?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={200}
              required
            />
            <span className="char-count">{question.length}/200</span>
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              id="description"
              className="form-input"
              placeholder="Add any extra context for voters..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              rows={3}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
            <span className="char-count">{description.length}/300</span>
          </div>

          <div className="form-group">
            <label className="form-label">Options</label>
            <div className="options-list">
              {options.map((option, index) => (
                <div key={index} className="option-input-block">
                  <div className="option-input-row">
                    <span className="option-number">{index + 1}</span>
                    <input
                      type="text"
                      className="form-input option-input"
                      placeholder={`Option ${index + 1} (e.g. Virat Kohli)`}
                      value={option.text}
                      onChange={(e) => handleOptionTextChange(index, e.target.value)}
                      maxLength={100}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        className="remove-option-btn"
                        onClick={() => removeOption(index)}
                        aria-label={`Remove option ${index + 1}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <textarea
                    className="form-input option-info-input"
                    placeholder={`Knowledge box for "${option.text || `Option ${index + 1}`}" (optional) — e.g. their stats, technique, background. Shown to everyone after the poll closes.`}
                    value={option.info}
                    onChange={(e) => handleOptionInfoChange(index, e.target.value)}
                    maxLength={800}
                    rows={2}
                  />
                </div>
              ))}
            </div>

            {options.length < 6 && (
              <button
                type="button"
                className="add-option-btn"
                onClick={addOption}
              >
                + Add Option
                <span className="option-count-hint">
                  ({options.length}/6)
                </span>
              </button>
            )}
          </div>

          {error && (
            <div className="form-error" role="alert">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={submitting}
            id="create-poll-submit"
          >
            {submitting ? (
              <>
                <span className="btn-spinner"></span>
                Creating Poll...
              </>
            ) : (
              '🚀 Launch Poll'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreatePage;