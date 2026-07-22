const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  players: {
    type: [String], // free-text player names — gully cricket players usually aren't app users
    validate: {
      validator: (v) => v.length >= 2,
      message: 'A team needs at least 2 players.',
    },
  },
});

const matchSchema = new mongoose.Schema({
  teamA: { type: teamSchema, required: true },
  teamB: { type: teamSchema, required: true },
  overs: {
    type: Number,
    required: true,
    min: 1,
    max: 50,
  },
  tossWonBy: {
    type: String,
    enum: ['teamA', 'teamB'],
    required: true,
  },
  tossDecision: {
    type: String,
    enum: ['bat', 'bowl'],
    required: true,
  },
  // Derived from toss — which team bats/bowls in the 1st innings.
  battingTeam: {
    type: String,
    enum: ['teamA', 'teamB'],
    required: true,
  },
  bowlingTeam: {
    type: String,
    enum: ['teamA', 'teamB'],
    required: true,
  },
  status: {
    type: String,
    enum: ['created', 'live', 'completed'],
    default: 'created',
  },
  firstInningsScore: {
    type: Number,
    default: null,
  },
  result: {
    type: String,
    default: '',
  },
  awards: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  // Placeholder for the live-scoring phase — ball-by-ball data, per-innings
  // totals, batting/bowling figures will live here once scoring is built.
  innings: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
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

module.exports = mongoose.model('Match', matchSchema);