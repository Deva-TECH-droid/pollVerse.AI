const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  votes: {
    type: Number,
    default: 0,
  },
  info: {
    type: String,
    trim: true,
    default: '',
  },
});

const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  options: {
    type: [optionSchema],
    validate: {
      validator: (v) => v.length >= 2 && v.length <= 6,
      message: 'A poll must have between 2 and 6 options.',
    },
  },
  totalVotes: {
    type: Number,
    default: 0,
  },
  shares: {
    type: Number,
    default: 0,
  },
  durationHours: {
    type: Number,
    default: 12,
  },
  rewardPoints: {
    type: Number,
    default: 20,
  },
  closesAt: {
    type: Date,
  },
  isClosed: {
    type: Boolean,
    default: false,
  },
  winningOptionIndex: {
    type: Number,
    default: null,
  },
  rewardsProcessed: {
    type: Boolean,
    default: false,
  },
  aiInsight: {
    type: String,
    default: '',
  },
  aiPrediction: {
    predictedOptionIndex: {
      type: Number,
      default: null,
    },
    probabilities: {
      type: [Number],
      default: [],
    },
    confidenceLevel: {
      type: String,
      default: '',
    },
    confidenceScore: {
      type: Number,
      default: null,
    },
    explainableAI: {
      type: [String],
      default: [],
    },
    comparisonStats: [
      {
        metric: String,
        values: [String],
      },
    ],
    isCorrect: {
      type: Boolean,
      default: null,
    },
  },
  createdBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String,
    name: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Poll', pollSchema);