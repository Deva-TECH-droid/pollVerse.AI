const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');
const Vote = require('../models/Vote');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { sendNewPollEmail } = require('../utils/email');
const { getDisplayName } = require('../utils/displayName');

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

    await poll.save();
    console.log(`✅ Poll created: "${poll.question}" (${poll._id}) by ${req.user.email}`);

    notifyUsersAboutNewPoll(poll, req.user).catch((err) => {
      console.error('❌ notifyUsersAboutNewPoll threw an uncaught error:', err);
    });

    res.status(201).json(poll);
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