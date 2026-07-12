const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

const MILESTONE_CREDITS = Number(process.env.MILESTONE_CREDITS) || 200;

// GET /api/rewards/status — does this user qualify, and have they claimed it?
router.get('/status', requireAuth, async (req, res) => {
  res.json({
    eligible: req.user.credits >= MILESTONE_CREDITS,
    claimed: req.user.rewardClaimed,
    credits: req.user.credits,
    milestone: MILESTONE_CREDITS,
  });
});

// POST /api/rewards/claim — mark the milestone reward as claimed
router.post('/claim', requireAuth, async (req, res) => {
  if (req.user.credits < MILESTONE_CREDITS) {
    return res.status(400).json({
      message: `You need ${MILESTONE_CREDITS} credits to claim this reward. You currently have ${req.user.credits}.`,
    });
  }

  if (req.user.rewardClaimed) {
    return res.json({ message: 'Reward already claimed', alreadyClaimed: true });
  }

  req.user.rewardClaimed = true;
  await req.user.save();

  res.json({ message: 'Reward claimed successfully', alreadyClaimed: false });
});

module.exports = router;
