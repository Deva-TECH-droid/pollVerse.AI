const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // Clerk's user ID — the source of truth for identity now.
  clerkId: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  name: {
    type: String,
    trim: true,
  },
  credits: {
    type: Number,
    default: 0,
  },
  totalWins: {
    type: Number,
    default: 0,
  },
  totalPredictions: {
    type: Number,
    default: 0,
  },
  correctPredictions: {
    type: Number,
    default: 0,
  },
  predictionAccuracy: {
    type: Number,
    default: 0,
  },
  rewardClaimed: {
    type: Boolean,
    default: false,
  },
  lastLoginAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', UserSchema);
