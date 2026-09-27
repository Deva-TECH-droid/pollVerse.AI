const mongoose = require('mongoose');

const playerProfileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Normalized lowercase for case-insensitive lookup
    nameNormalized: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    photoUrl: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['Batsman', 'Bowler', 'All-Rounder', 'Wicketkeeper', 'Player', ''],
      default: 'Player',
    },
    battingStyle: {
      type: String,
      default: 'Right-hand bat',
    },
    bowlingStyle: {
      type: String,
      default: 'Right-arm medium',
    },
    jerseyNumber: {
      type: Number,
      default: null,
    },
    teamName: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to ensure nameNormalized is always in sync
playerProfileSchema.pre('validate', function (next) {
  if (this.name) {
    this.nameNormalized = this.name.trim().toLowerCase();
  }
  next();
});

module.exports = mongoose.model('PlayerProfile', playerProfileSchema);
