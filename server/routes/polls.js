const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Poll = require('../models/Poll');
const Vote = require('../models/Vote');
const User = require('../models/User');
const Comment = require('../models/Comment');
const { requireAuth } = require('../middleware/auth');
const { sendNewPollEmail } = require('../utils/email');
const { getDisplayName } = require('../utils/displayName');
const { generateAIPrediction } = require('../utils/aiInsight');

const DEFAULT_DURATION_HOURS = Number(process.env.POLL_DURATION_HOURS) || 12;
const DEFAULT_REWARD_POINTS = Number(process.env.POLL_REWARD_POINTS) || 20;

function requireAdmin(req, res, next) {
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  if (!adminEmail) {
    return res.status(500).json({ message: 'ADMIN_EMAIL is not configured on the server.' });
  }
  if (req.user.email.toLowerCase() !== adminEmail) {
    return res.status(403).json({ message: 'Only the admin can create polls.' });
  }
  next();
}

async function notifyUsersAboutNewPoll(poll, creator) {
  console.log(`\n📬 [notifyUsersAboutNewPoll] Starting for poll "${poll.question}" (${poll._id})`);

  const users = await User.find({});
  console.log(`📬 [notifyUsersAboutNewPoll] Found ${users.length} user(s) in database:`, users.map((u) => u.email));

  if (users.length === 0) {
    console.log('📬 [notifyUsersAboutNewPoll] No registered users — nothing to send.');
    return { sent: 0, failed: 0 };
  }

  const frontendUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
  const pollUrl = `${frontendUrl}/poll/${poll._id}`;
  const creatorName = creator.name || getDisplayName(creator.email);

  console.log(`📬 [notifyUsersAboutNewPoll] Poll URL will be: ${pollUrl}`);

  const results = await Promise.allSettled(
    users.map((user) =>
      sendNewPollEmail({
        to: user.email,
        recipientEmail: user.email,
        creatorName,
        pollQuestion: poll.question,
        pollDescription: poll.description,
        pollUrl,
        durationHours: poll.durationHours,
        rewardPoints: poll.rewardPoints,
      })
    )
  );

  results.forEach((result, i) => {
    const email = users[i].email;
    if (result.status === 'fulfilled') {
      console.log(`📬 [notifyUsersAboutNewPoll] ✅ Sent to ${email}`);
    } else {
      console.error(`📬 [notifyUsersAboutNewPoll] ❌ FAILED to send to ${email}:`, result.reason);
    }
  });

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`📬 [notifyUsersAboutNewPoll] Done: ${sent} sent, ${failed} failed (${users.length} total users)\n`);
  return { sent, failed };
}

router.get('/', async (req, res) => {
  try {
    const polls = await Poll.find().sort({ createdAt: -1 });
    res.json(polls);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { question, description, options, durationHours, rewardPoints } = req.body;

    if (!question || !options || options.length < 2) {
      return res.status(400).json({ message: 'Question and at least 2 options are required.' });
    }

    const formattedOptions = options.map((opt) => ({
      text: typeof opt === 'string' ? opt : opt.text,
      votes: 0,
      info: typeof opt === 'string' ? '' : (opt.info || '').trim(),
    }));

    const finalDurationHours = durationHours || DEFAULT_DURATION_HOURS;
    const closesAt = new Date(Date.now() + finalDurationHours * 60 * 60 * 1000);

    const poll = new Poll({
      question,
      description: description || '',
      options: formattedOptions,
      durationHours: finalDurationHours,
      rewardPoints: rewardPoints || DEFAULT_REWARD_POINTS,
      closesAt,
      createdBy: {
        userId: req.user._id,
        email: req.user.email,
        name: req.user.name || getDisplayName(req.user.email),
      },
    });

    // Generate AI Prediction
    try {
      poll.aiPrediction = await generateAIPrediction(poll);
    } catch (err) {
      console.error('❌ Failed to generate initial AI prediction:', err);
    }

    await poll.save();
    console.log(`✅ Poll created with AI Prediction: "${poll.question}" (${poll._id}) by ${req.user.email}`);

    notifyUsersAboutNewPoll(poll, req.user).catch((err) => {
      console.error('❌ notifyUsersAboutNewPoll threw an uncaught error:', err);
    });

    res.status(201).json(poll);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/ai/dashboard-stats', async (req, res) => {
  try {
    const closedPolls = await Poll.find({
      isClosed: true,
      'aiPrediction.predictedOptionIndex': { $ne: null }
    }).sort({ closesAt: -1 });

    let totalPredictions = closedPolls.length;
    let correctPredictions = 0;
    let confidenceSum = 0;

    closedPolls.forEach(poll => {
      if (poll.aiPrediction && poll.aiPrediction.isCorrect) {
        correctPredictions++;
      }
      const score = poll.aiPrediction?.confidenceScore;
      if (score) {
        confidenceSum += score;
      } else if (poll.aiPrediction?.confidenceLevel) {
        const confMap = { "High": 85, "Medium": 60, "Low": 35 };
        confidenceSum += confMap[poll.aiPrediction.confidenceLevel] || 50;
      }
    });

    const accuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;
    const avgConfidence = totalPredictions > 0 ? Math.round(confidenceSum / totalPredictions) : 0;

    res.json({
      totalPredictions,
      correctPredictions,
      accuracy,
      avgConfidence,
      history: closedPolls.map(p => ({
        _id: p._id,
        question: p.question,
        options: p.options.map(o => ({ text: o.text, votes: o.votes })),
        predictedWinner: p.options[p.aiPrediction.predictedOptionIndex]?.text || 'N/A',
        actualWinner: p.winningOptionIndex !== null ? p.options[p.winningOptionIndex]?.text : 'Draw/None',
        probabilities: p.aiPrediction.probabilities,
        predictedOptionIndex: p.aiPrediction.predictedOptionIndex,
        winningOptionIndex: p.winningOptionIndex,
        isCorrect: p.aiPrediction.isCorrect,
        closesAt: p.closesAt,
        confidenceLevel: p.aiPrediction.confidenceLevel,
        confidenceScore: p.aiPrediction.confidenceScore
      }))
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Combined trending data for the homepage: Most Voted, Ending Soon, Trending Today.
// Must stay ABOVE the `/:id` route below, or Express will try to treat
// "trending" itself as a poll id and 404/error out.
router.get('/trending', async (req, res) => {
  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // 🔥 Most Voted — top active polls by total votes.
    const mostVoted = await Poll.find({ isClosed: false })
      .sort({ totalVotes: -1 })
      .limit(10);

    // ⏳ Ending Soon — active polls closing within the next hour.
    const endingSoon = await Poll.find({
      isClosed: false,
      closesAt: { $gt: now, $lte: oneHourFromNow },
    }).sort({ closesAt: 1 });

    // 📈 Trending Today — score = (new votes today × 2) + (comments × 1)
    // + (unique participants × 2) + (shares × 3).
    // "New votes today" is derived from each Vote's _id, since MongoDB
    // ObjectIds embed their creation time — no extra timestamp field needed.
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const todayThresholdId = mongoose.Types.ObjectId.createFromTime(startOfToday.getTime() / 1000);

    const activePolls = await Poll.find({ isClosed: false });

    const scored = await Promise.all(
      activePolls.map(async (poll) => {
        const [votesToday, commentCount] = await Promise.all([
          Vote.countDocuments({ pollId: poll._id, _id: { $gte: todayThresholdId } }),
          Comment.countDocuments({ pollId: poll._id }),
        ]);
        // Every vote is from a unique user (one vote per user is enforced
        // elsewhere), so totalVotes doubles as the unique-participants count.
        const uniqueParticipants = poll.totalVotes;
        const score = votesToday * 2 + commentCount * 1 + uniqueParticipants * 2 + poll.shares * 3;
        return { poll, score, votesToday };
      })
    );

    const trendingToday = scored
      .filter((s) => s.votesToday > 0) // only show polls with actual activity today
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((s) => ({ ...s.poll.toObject(), trendingScore: s.score, votesToday: s.votesToday }));

    res.json({ mostVoted, endingSoon, trendingToday });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Increment a poll's share counter (feeds into the Trending Today score).
router.post('/:id/share', async (req, res) => {
  try {
    const poll = await Poll.findByIdAndUpdate(req.params.id, { $inc: { shares: 1 } }, { new: true });
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    res.json({ shares: poll.shares });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    if (!poll.isClosed && poll.closesAt && new Date() > poll.closesAt) {
      poll.isClosed = true;
      await poll.save();
    }

    res.json(poll);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/:id/my-vote', requireAuth, async (req, res) => {
  try {
    const vote = await Vote.findOne({ pollId: req.params.id, userId: req.user._id });
    res.json({ voted: !!vote, optionIndex: vote ? vote.optionIndex : null });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/:id/vote', requireAuth, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const poll = await Poll.findById(req.params.id);

    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (poll.isClosed || (poll.closesAt && new Date() > poll.closesAt)) {
      return res.status(400).json({ message: 'This poll has closed.' });
    }
    if (optionIndex === undefined || optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ message: 'Invalid option index' });
    }

    const existingVote = await Vote.findOne({ pollId: poll._id, userId: req.user._id });
    if (existingVote) {
      return res.status(409).json({ message: 'You have already voted on this poll. Votes cannot be changed.' });
    }

    try {
      await Vote.create({ pollId: poll._id, userId: req.user._id, optionIndex });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ message: 'You have already voted on this poll. Votes cannot be changed.' });
      }
      throw err;
    }

    poll.options[optionIndex].votes += 1;
    poll.totalVotes += 1;
    await poll.save();

    res.json(poll);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;