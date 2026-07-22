const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { clerkClient } = require('@clerk/express');
const Poll = require('../models/Poll');
const Vote = require('../models/Vote');
const User = require('../models/User');
const Comment = require('../models/Comment');
const { requireAuth } = require('../middleware/auth');

function requireAdmin(req, res, next) {
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  if (!adminEmail) {
    return res.status(500).json({ message: 'ADMIN_EMAIL is not configured on the server.' });
  }
  if (req.user.email.toLowerCase() !== adminEmail) {
    return res.status(403).json({ message: 'Admin access only.' });
  }
  next();
}

// Builds an ObjectId whose embedded timestamp is `date` — lets us filter
// Vote/User documents by creation time without needing an explicit
// createdAt field, since MongoDB ObjectIds already encode it.
function objectIdFromDate(date) {
  return mongoose.Types.ObjectId.createFromTime(Math.floor(date.getTime() / 1000));
}

router.get('/analytics', requireAuth, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ---- Top-line counts ----
    const [totalUsers, totalPolls, activePolls, completedPolls, activeUsersToday, totalVotesAllTime] =
      await Promise.all([
        User.countDocuments(),
        Poll.countDocuments(),
        Poll.countDocuments({ isClosed: false }),
        Poll.countDocuments({ isClosed: true }),
        User.countDocuments({ lastLoginAt: { $gte: startOfToday } }),
        Vote.countDocuments(),
      ]);

    const [votesToday, votesThisWeek, votesThisMonth] = await Promise.all([
      Vote.countDocuments({ _id: { $gte: objectIdFromDate(startOfToday) } }),
      Vote.countDocuments({ _id: { $gte: objectIdFromDate(sevenDaysAgo) } }),
      Vote.countDocuments({ _id: { $gte: objectIdFromDate(thirtyDaysAgo) } }),
    ]);

    // ---- Most popular poll ----
    const topPoll = await Poll.findOne().sort({ totalVotes: -1 });
    let mostPopularPoll = null;
    if (topPoll) {
      const commentCount = await Comment.countDocuments({ pollId: topPoll._id });
      mostPopularPoll = {
        question: topPoll.question,
        totalVotes: topPoll.totalVotes,
        comments: commentCount,
        shares: topPoll.shares || 0,
      };
    }

    // ---- Most active user (by votes cast), with prediction accuracy ----
    const topVoter = await Vote.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    let mostActiveUser = null;
    if (topVoter.length > 0) {
      const userDoc = await User.findById(topVoter[0]._id);
      const userVotes = await Vote.find({ userId: topVoter[0]._id });
      const pollIds = userVotes.map((v) => v.pollId);
      const relevantPolls = await Poll.find({ _id: { $in: pollIds }, isClosed: true });
      const pollMap = new Map(relevantPolls.map((p) => [String(p._id), p]));

      let correct = 0;
      let judged = 0;
      userVotes.forEach((v) => {
        const p = pollMap.get(String(v.pollId));
        if (p && p.winningOptionIndex !== null && p.winningOptionIndex !== undefined) {
          judged += 1;
          if (p.winningOptionIndex === v.optionIndex) correct += 1;
        }
      });

      mostActiveUser = userDoc
        ? {
            name: userDoc.name || userDoc.email,
            pollsParticipated: topVoter[0].count,
            accuracy: judged > 0 ? Math.round((correct / judged) * 100) : null,
            credits: userDoc.credits || 0,
          }
        : null;
    }

    // ---- User growth: signups per day, last 30 days ----
    const userGrowthRaw = await User.aggregate([
      { $match: { _id: { $gte: objectIdFromDate(thirtyDaysAgo) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$_id' } } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const userGrowth = userGrowthRaw.map((d) => ({ date: d._id, count: d.count }));

    // ---- Poll participation: votes per day, last 30 days ----
    const participationRaw = await Vote.aggregate([
      { $match: { _id: { $gte: objectIdFromDate(thirtyDaysAgo) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$_id' } } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const pollParticipation = participationRaw.map((d) => ({ date: d._id, count: d.count }));

    // ---- Top 5 trending polls (same scoring as the homepage trending feed) ----
    const activePollDocs = await Poll.find({ isClosed: false });
    const scored = await Promise.all(
      activePollDocs.map(async (poll) => {
        const [votesTodayForPoll, commentCount] = await Promise.all([
          Vote.countDocuments({ pollId: poll._id, _id: { $gte: objectIdFromDate(startOfToday) } }),
          Comment.countDocuments({ pollId: poll._id }),
        ]);
        const score = votesTodayForPoll * 2 + commentCount * 1 + poll.totalVotes * 2 + (poll.shares || 0) * 3;
        return { question: poll.question, totalVotes: poll.totalVotes, score };
      })
    );
    const topTrendingPolls = scored.sort((a, b) => b.score - a.score).slice(0, 5);

    // ---- Credit distribution: top 10 users by credits ----
    const creditLeaders = await User.find().sort({ credits: -1 }).limit(10).select('name email credits');
    const creditDistribution = creditLeaders.map((u) => ({
      name: u.name || u.email,
      credits: u.credits || 0,
    }));

    res.json({
      totalUsers,
      totalPolls: { total: totalPolls, active: activePolls, completed: completedPolls, upcoming: 0 },
      activeUsersToday,
      totalVotes: { today: votesToday, thisWeek: votesThisWeek, thisMonth: votesThisMonth, allTime: totalVotesAllTime },
      mostPopularPoll,
      mostActiveUser,
      userGrowth,
      pollParticipation,
      topTrendingPolls,
      creditDistribution,
      // Not modeled yet — polls have no category field today.
      categoryDistribution: null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Full user list for the "Total Users" drill-down — includes each user's
// Clerk profile photo, since we don't store that in Mongo ourselves.
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('name email clerkId credits').sort({ createdAt: -1 });

    const clerkIds = users.map((u) => u.clerkId).filter(Boolean);
    let photoMap = {};

    if (clerkIds.length > 0) {
      // Clerk's list endpoint is paginated at 500 by default — chunk just in case.
      const chunks = [];
      for (let i = 0; i < clerkIds.length; i += 200) chunks.push(clerkIds.slice(i, i + 200));

      const results = await Promise.all(
        chunks.map((chunk) => clerkClient.users.getUserList({ userId: chunk, limit: chunk.length }))
      );

      results.forEach((page) => {
        const list = page.data || page; // SDK versions differ slightly in return shape
        list.forEach((cu) => {
          photoMap[cu.id] = cu.imageUrl;
        });
      });
    }

    const enriched = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      credits: u.credits || 0,
      imageUrl: photoMap[u.clerkId] || null,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;