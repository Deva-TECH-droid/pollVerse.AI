const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Poll = require('../models/Poll');
const Vote = require('../models/Vote');
const { requireAuth } = require('../middleware/auth');

function requireAdmin(req, res, next) {
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  if (!adminEmail) {
    return res.status(500).json({ message: 'ADMIN_EMAIL is not configured on the server.' });
  }
  if (req.user.email.toLowerCase() !== adminEmail) {
    return res.status(403).json({ message: 'Only the admin can do that.' });
  }
  next();
}

// TODO: wire this up once we see how Socket.io is set up on the server side
// (which file holds `io.on('connection', ...)`, how `io` is exposed to
// routes, and what room polls join). For now this is a no-op if `io` isn't
// found on the app, so REST calls still work — comments just won't be
// pushed live until this is filled in.
function emitToPoll(req, pollId, event, payload) {
  const io = req.app.get('io');
  if (!io) return;
  io.to(String(pollId)).emit(event, payload);
}

// GET all comments for a poll, nested as top-level + replies, pinned first.
router.get('/poll/:pollId', async (req, res) => {
  try {
    const comments = await Comment.find({ pollId: req.params.pollId, isHidden: false }).sort({ createdAt: 1 });

    const topLevel = comments.filter((c) => !c.parentCommentId);
    const replies = comments.filter((c) => c.parentCommentId);

    const nested = topLevel
      .map((c) => ({
        ...c.toObject(),
        likeCount: c.likes.length,
        replies: replies
          .filter((r) => String(r.parentCommentId) === String(c._id))
          .map((r) => ({ ...r.toObject(), likeCount: r.likes.length })),
      }))
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

    res.json(nested);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST a new comment or reply. Only users who have voted on the poll can comment.
router.post('/poll/:pollId', requireAuth, async (req, res) => {
  try {
    const { comment, parentCommentId } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }

    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    const hasVoted = await Vote.findOne({ pollId: poll._id, userId: req.user._id });
    if (!hasVoted) {
      return res.status(403).json({ message: 'Vote on this poll before joining the discussion.' });
    }

    if (parentCommentId) {
      const parent = await Comment.findById(parentCommentId);
      if (!parent || String(parent.pollId) !== String(poll._id)) {
        return res.status(400).json({ message: 'Invalid comment to reply to.' });
      }
    }

    const newComment = await Comment.create({
      pollId: poll._id,
      userId: req.user._id,
      userName: req.user.name || req.user.email,
      comment: comment.trim(),
      parentCommentId: parentCommentId || null,
    });

    const payload = { ...newComment.toObject(), likeCount: 0, replies: [] };
    emitToPoll(req, poll._id, 'newComment', payload);

    res.status(201).json(payload);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Toggle a like on a comment.
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const userId = String(req.user._id);
    const alreadyLiked = comment.likes.some((id) => String(id) === userId);

    if (alreadyLiked) {
      comment.likes = comment.likes.filter((id) => String(id) !== userId);
    } else {
      comment.likes.push(req.user._id);
    }
    await comment.save();

    const payload = { commentId: comment._id, likeCount: comment.likes.length, liked: !alreadyLiked };
    emitToPoll(req, comment.pollId, 'commentLiked', payload);

    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Report a comment as inappropriate.
router.post('/:id/report', requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const userId = String(req.user._id);
    const alreadyReported = comment.reportedBy.some((id) => String(id) === userId);
    if (!alreadyReported) {
      comment.reportedBy.push(req.user._id);
      await comment.save();
    }

    res.json({ message: 'Comment reported. Thanks for flagging it.', reportCount: comment.reportedBy.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: pin a comment as the "Admin Pick" for its poll (unpins any other
// pinned comment on the same poll, since only one pin makes sense at a time).
router.post('/:id/pin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const willPin = !comment.pinned;

    if (willPin) {
      await Comment.updateMany({ pollId: comment.pollId, pinned: true }, { $set: { pinned: false } });
    }
    comment.pinned = willPin;
    await comment.save();

    emitToPoll(req, comment.pollId, 'commentPinned', { commentId: comment._id, pinned: willPin });

    res.json({ commentId: comment._id, pinned: willPin });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Author (or admin) can delete their own comment.
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const isOwner = String(comment.userId) === String(req.user._id);
    const isAdmin = req.user.email.toLowerCase() === adminEmail;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You can only delete your own comments.' });
    }

    // Also remove any replies hanging off this comment.
    await Comment.deleteMany({ $or: [{ _id: comment._id }, { parentCommentId: comment._id }] });

    emitToPoll(req, comment.pollId, 'commentDeleted', { commentId: comment._id });

    res.json({ message: 'Comment deleted', commentId: comment._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;