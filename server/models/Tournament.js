const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: { type: String, default: '' }, // Batter / Bowler / All-rounder / Wicketkeeper
  battingStyle: { type: String, default: '' },
  bowlingStyle: { type: String, default: '' },
  jerseyNumber: { type: Number, default: null },
  photoUrl: { type: String, default: '' },
  price: { type: Number, default: 0 },
});

const tournamentTeamSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  captain: { type: String, default: '' },
  viceCaptain: { type: String, default: '' },
  logo: { type: String, default: '' }, // URL, optional
  budget: { type: Number, default: 100 },
  players: { type: [playerSchema], default: [] },
  isUserTeam: { type: Boolean, default: false },
});

const fixtureSchema = new mongoose.Schema({
  matchNumber: { type: Number, required: true },
  round: { type: Number, required: true }, // league round index, used by the round-robin algorithm
  teamAName: { type: String, required: true },
  teamBName: { type: String, required: true },
  scheduledDate: { type: Date },
  stage: { type: String, enum: ['league', 'qualifier1', 'eliminator', 'qualifier2', 'final'], default: 'league' },
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null }, // linked once someone starts scoring it
  status: { type: String, enum: ['scheduled', 'live', 'completed'], default: 'scheduled' },
});

const auctionPlayerSchema = new mongoose.Schema({
  id: { type: String },
  name: { type: String, required: true, trim: true },
  role: { type: String, default: 'All-Rounder' },
  category: { type: String, default: 'All' },
  country: { type: String, default: 'India' },
  basePrice: { type: Number, default: 1.0 },
  soldPrice: { type: Number, default: 0 },
  soldTo: { type: String, default: null },
  status: { type: String, enum: ['pending', 'bidding', 'sold', 'unsold'], default: 'pending' },
  photoUrl: { type: String, default: '' },
  stats: { type: mongoose.Schema.Types.Mixed, default: {} },
});

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  numberOfTeams: { type: Number, required: true, min: 2, max: 32 },
  oversPerMatch: { type: Number, required: true, min: 1, max: 50 },
  format: { type: String, enum: ['league_playoffs', 'league', 'knockout'], default: 'league_playoffs' },
  venue: { type: String, default: '' },
  ballType: { type: String, default: '' },
  playersPerTeam: { type: Number, default: 8 },

  // Optional extras
  logo: { type: String, default: '' },
  organizerName: { type: String, default: '' },
  description: { type: String, default: '' },
  rules: { type: String, default: '' },
  registrationDeadline: { type: Date, default: null },

  // Auction feature
  hasAuction: { type: Boolean, default: false },
  auctionConfig: {
    budgetPerTeam: { type: Number, default: 100 },
    minPlayersPerTeam: { type: Number, default: 2 },
    maxPlayersPerTeam: { type: Number, default: 25 },
    bidIncrement: { type: Number, default: 0.25 },
    status: { type: String, enum: ['setup', 'in_progress', 'completed'], default: 'setup' },
  },
  auctionPool: { type: [auctionPlayerSchema], default: [] },
  auctionHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },

  teams: { type: [tournamentTeamSchema], default: [] },
  fixtures: { type: [fixtureSchema], default: [] },

  // 'setup' = still adding teams, 'league' = fixtures generated & underway,
  // 'playoffs' = top 4 decided, 'completed' = final played.
  status: { type: String, enum: ['setup', 'league', 'playoffs', 'completed'], default: 'setup' },

  playerOfTournament: { type: mongoose.Schema.Types.Mixed, default: null },
  winningTeam: { type: String, default: null },

  createdBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String,
    name: String,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Tournament', tournamentSchema);