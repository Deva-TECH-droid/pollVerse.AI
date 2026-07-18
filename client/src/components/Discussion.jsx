import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import socket from '../socket';
import '../styles/Discussion.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function CommentItem({ comment, isAdmin, currentUserId, onLike, onReply, onReport, onPin, onDelete }) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const liked = currentUserId && comment.likes?.some((id) => String(id) === String(currentUserId));

  const submitReply = () => {
    if (!replyText.trim()) return;
    onReply(comment._id, replyText.trim());
    setReplyText('');
    setShowReplyBox(false);
  };

  return (
    <div className={`comment-item ${comment.pinned ? 'comment-pinned' : ''}`}>
      {comment.pinned && <div className="comment-pin-badge">📌 Admin Pick</div>}
      <div className="comment-header">
        <span className="comment-author">{comment.userName}</span>
        <span className="comment-date">{new Date(comment.createdAt).toLocaleDateString()}</span>
      </div>
      <p className="comment-text">{comment.comment}</p>
      <div className="comment-actions">
        <button className={`comment-like-btn ${liked ? 'liked' : ''}`} onClick={() => onLike(comment._id)}>
          ❤️ {comment.likeCount ?? comment.likes?.length ?? 0}
        </button>
        <button className="comment-reply-btn" onClick={() => setShowReplyBox((s) => !s)}>
          💬 Reply
        </button>
        {isAdmin && (
          <button className="comment-pin-btn" onClick={() => onPin(comment._id)}>
            📌 {comment.pinned ? 'Unpin' : 'Pin'}
          </button>
        )}
        {currentUserId && String(comment.userId) !== String(currentUserId) && (
          <button className="comment-report-btn" onClick={() => onReport(comment._id)}>
            🚫 Report
          </button>
        )}
        {(isAdmin || String(comment.userId) === String(currentUserId)) && (
          <button className="comment-delete-btn" onClick={() => onDelete(comment._id)}>
            🗑️
          </button>
        )}
      </div>

      {showReplyBox && (
        <div className="comment-reply-box">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            onKeyDown={(e) => e.key === 'Enter' && submitReply()}
          />
          <button onClick={submitReply}>Post</button>
        </div>
      )}

      {comment.replies?.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <div key={reply._id} className="comment-item comment-reply-item">
              <div className="comment-header">
                <span className="comment-author">{reply.userName}</span>
                <span className="comment-date">{new Date(reply.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="comment-text">{reply.comment}</p>
              <div className="comment-actions">
                <button className={`comment-like-btn ${reply.likes?.some((id) => String(id) === String(currentUserId)) ? 'liked' : ''}`} onClick={() => onLike(reply._id)}>
                  ❤️ {reply.likeCount ?? reply.likes?.length ?? 0}
                </button>
                {(isAdmin || String(reply.userId) === String(currentUserId)) && (
                  <button className="comment-delete-btn" onClick={() => onDelete(reply._id)}>
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Discussion({ pollId, user, voted }) {
  const { getToken } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  const isAdmin = !!user?.isAdmin;

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/comments/poll/${pollId}`);
      if (!res.ok) throw new Error('Failed to load comments');
      const data = await res.json();
      setComments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pollId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Live updates. PollPage already does `socket.emit('joinPoll', pollId)`
  // for votes, so this component just listens on the same room.
  useEffect(() => {
    const handleNewComment = (payload) => {
      if (payload.parentCommentId) {
        setComments((prev) =>
          prev.map((c) => (String(c._id) === String(payload.parentCommentId) ? { ...c, replies: [...(c.replies || []), payload] } : c))
        );
      } else {
        setComments((prev) => [payload, ...prev]);
      }
    };

    const handleCommentLiked = ({ commentId, likeCount }) => {
      setComments((prev) =>
        prev.map((c) => {
          if (String(c._id) === String(commentId)) return { ...c, likeCount };
          return { ...c, replies: c.replies?.map((r) => (String(r._id) === String(commentId) ? { ...r, likeCount } : r)) };
        })
      );
    };

    const handlePinned = ({ commentId, pinned }) => {
      setComments((prev) => prev.map((c) => ({ ...c, pinned: String(c._id) === String(commentId) ? pinned : false })));
    };

    const handleDeleted = ({ commentId }) => {
      setComments((prev) =>
        prev
          .filter((c) => String(c._id) !== String(commentId))
          .map((c) => ({ ...c, replies: c.replies?.filter((r) => String(r._id) !== String(commentId)) }))
      );
    };

    socket.on('newComment', handleNewComment);
    socket.on('commentLiked', handleCommentLiked);
    socket.on('commentPinned', handlePinned);
    socket.on('commentDeleted', handleDeleted);

    return () => {
      socket.off('newComment', handleNewComment);
      socket.off('commentLiked', handleCommentLiked);
      socket.off('commentPinned', handlePinned);
      socket.off('commentDeleted', handleDeleted);
    };
  }, []);

  const authedRequest = async (url, options = {}) => {
    const token = await getToken();
    return fetch(`${API_URL}${url}`, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
    });
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const res = await authedRequest(`/api/comments/poll/${pollId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to post comment');
      }
      setNewComment('');
      // Socket event will also add it, but add locally too in case sockets
      // aren't wired up yet on the backend.
      const created = await res.json();
      setComments((prev) => (prev.some((c) => String(c._id) === String(created._id)) ? prev : [created, ...prev]));
    } catch (err) {
      alert(err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleReply = async (parentCommentId, text) => {
    try {
      const res = await authedRequest(`/api/comments/poll/${pollId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: text, parentCommentId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to post reply');
      }
      const created = await res.json();
      setComments((prev) =>
        prev.map((c) =>
          String(c._id) === String(parentCommentId) && !c.replies?.some((r) => String(r._id) === String(created._id))
            ? { ...c, replies: [...(c.replies || []), created] }
            : c
        )
      );
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLike = async (commentId) => {
    try {
      await authedRequest(`/api/comments/${commentId}/like`, { method: 'POST' });
      // UI updates via the socket event; if sockets aren't wired up yet,
      // refetch as a fallback.
      fetchComments();
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const handleReport = async (commentId) => {
    if (!window.confirm('Report this comment as inappropriate?')) return;
    try {
      const res = await authedRequest(`/api/comments/${commentId}/report`, { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Reported');
    } catch (err) {
      console.error('Report failed:', err);
    }
  };

  const handlePin = async (commentId) => {
    try {
      await authedRequest(`/api/comments/${commentId}/pin`, { method: 'POST' });
      fetchComments();
    } catch (err) {
      console.error('Pin failed:', err);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await authedRequest(`/api/comments/${commentId}`, { method: 'DELETE' });
      setComments((prev) =>
        prev
          .filter((c) => String(c._id) !== String(commentId))
          .map((c) => ({ ...c, replies: c.replies?.filter((r) => String(r._id) !== String(commentId)) }))
      );
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="discussion-section">
      <h2 className="discussion-title">💬 Discussion</h2>

      {!user && <p className="discussion-locked">🔒 Log in and vote to join the discussion.</p>}
      {user && !voted && <p className="discussion-locked">🗳️ Cast your vote first to unlock the discussion.</p>}

      {user && voted && (
        <div className="comment-composer">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share why you voted the way you did..."
            onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
            disabled={posting}
          />
          <button onClick={handlePostComment} disabled={posting || !newComment.trim()}>
            Post
          </button>
        </div>
      )}

      {loading && <p className="discussion-loading">Loading comments...</p>}
      {error && <p className="discussion-error">{error}</p>}

      {!loading && !error && comments.length === 0 && <p className="discussion-empty">No comments yet — be the first!</p>}

      <div className="comment-list">
        {comments.map((comment) => (
          <CommentItem
            key={comment._id}
            comment={comment}
            isAdmin={isAdmin}
            currentUserId={user?._id}
            onLike={handleLike}
            onReply={handleReply}
            onReport={handleReport}
            onPin={handlePin}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

export default Discussion;