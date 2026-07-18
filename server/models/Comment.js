const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  pollId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  // Self-reference for one level of replies. Keeping replies flat (not nested
  // further) matches the example in the spec — a reply to a reply just
  // points at the same top-level thread.
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true,
  },
  likes: {
    type: [mongoose.Schema.Types.ObjectId], // userIds who liked — lets us toggle + prevent double-likes
    ref: 'User',
    default: [],
  },
  pinned: {
    type: Boolean,
    default: false,
  },
  reportedBy: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [],
  },
  isHidden: {
    // Flip this on manually (or via a future auto-threshold) to soft-hide
    // a heavily-reported comment without deleting it outright.
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Comment', commentSchema);