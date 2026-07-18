const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { getDisplayName } = require('../utils/displayName');

function computeAccuracy(user) {
  return user.totalPredictions > 0
    ? Math.round((user.totalWins / user.totalPredictions) * 1000) / 10
    : 0;
}

// GET /api/leaderboard — top 10 by credits, plus the current user's own
// stats/rank even if they're outside the top 10.
router.get('/', requireAuth, async (req, res) => {
  try {
    const allUsers = await User.find({}).sort({ credits: -1, totalWins: -1 });

    const ranked = allUsers.map((u, i) => ({
      rank: i + 1,
      userId: u._id.toString(),
      name: u.name || getDisplayName(u.email),
      credits: u.credits,
      totalPredictions: u.totalPredictions,
      correctPredictions: u.totalWins,
      accuracy: computeAccuracy(u),
      isMe: u._id.toString() === req.user._id.toString(),
    }));

    const leaderboard = ranked.slice(0, 10);
    const me = ranked.find((r) => r.isMe);

    const myStats = me
      ? {
          name: me.name,
          rank: me.rank,
          totalUsers: ranked.length,
          accuracy: me.accuracy,
          correctPredictions: me.correctPredictions,
          incorrectPredictions: me.totalPredictions - me.correctPredictions,
          credits: me.credits,
          totalPredictions: me.totalPredictions,
        }
      : null;

    res.json({ leaderboard, myStats });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;