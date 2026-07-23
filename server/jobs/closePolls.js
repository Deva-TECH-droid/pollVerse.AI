const cron = require('node-cron');
const Poll = require('../models/Poll');
const Vote = require('../models/Vote');
const User = require('../models/User');
const { sendWinnerEmail, sendMilestoneEmail } = require('../utils/email');
const { generatePollInsight } = require('../utils/aiInsight');

const MILESTONE_CREDITS = Number(process.env.MILESTONE_CREDITS) || 200;
const PREDICTION_REWARD = 20; // credits awarded for a correct prediction

async function closeAndRewardPoll(poll) {
  poll.isClosed = true;

  let winningIndex = 0;
  poll.options.forEach((opt, i) => {
    if (opt.votes > poll.options[winningIndex].votes) winningIndex = i;
  });

  const hasVotes = poll.totalVotes > 0;
  poll.winningOptionIndex = hasVotes ? winningIndex : null;
  poll.rewardsProcessed = true;

  // Set AI accuracy status
  if (poll.aiPrediction && typeof poll.aiPrediction.predictedOptionIndex === 'number') {
    poll.aiPrediction.isCorrect = hasVotes && (poll.winningOptionIndex === poll.aiPrediction.predictedOptionIndex);
  }

  try {
    poll.aiInsight = await generatePollInsight(poll);
  } catch (err) {
    console.error(`Failed to generate AI insight for poll ${poll._id}:`, err);
  }

  await poll.save();

  if (!hasVotes) {
    console.log(`⏳ Poll "${poll.question}" closed with no votes — nothing to reward.`);
    return;
  }

  const winningOptionText = poll.options[winningIndex].text;
  const winningVotes = await Vote.find({ pollId: poll._id, optionIndex: winningIndex });

  console.log(`🏆 Poll "${poll.question}" closed. Winner: "${winningOptionText}" (${winningVotes.length} correct voters)`);

  const frontendUrl = (process.env.CLIENT_URL || 'https://poll-verse-ai-delta.vercel.app').replace(/\/$/, '');

  for (const vote of winningVotes) {
    try {
      const user = await User.findById(vote.userId);
      if (!user) continue;

      const creditsBefore = user.credits;
      user.credits += poll.rewardPoints;
      user.totalWins += 1;
      user.totalPredictions += 1;
      // ---- Prediction accuracy tracking ----
      user.credits += PREDICTION_REWARD; // bonus for correct prediction
      user.correctPredictions = (user.correctPredictions || 0) + 1;
      user.predictionAccuracy = Math.round(
        (user.correctPredictions / user.totalPredictions) * 100
      );
      await user.save();

      await sendWinnerEmail({
        to: user.email,
        recipientEmail: user.email,
        pollQuestion: poll.question,
        pollDescription: poll.description,
        winningOption: winningOptionText,
        creditsEarned: poll.rewardPoints,
        currentCredits: user.credits,
        pollUrl: `${frontendUrl}/poll/${poll._id}`,
      });

      if (creditsBefore < MILESTONE_CREDITS && user.credits >= MILESTONE_CREDITS && !user.rewardClaimed) {
        await sendMilestoneEmail({
          to: user.email,
          recipientEmail: user.email,
          currentCredits: user.credits,
          claimUrl: `${frontendUrl}/reward/claim`,
        });
        console.log(`🌟 ${user.email} crossed ${MILESTONE_CREDITS} credits — milestone email sent.`);
      }
    } catch (err) {
      console.error(`Failed to reward voter ${vote.userId} for poll ${poll._id}:`, err);
    }
  }

  const losingVotes = await Vote.find({
    pollId: poll._id,
    optionIndex: { $ne: winningIndex },
  });
  for (const vote of losingVotes) {
    try {
      const user = await User.findById(vote.userId);
      if (!user) continue;
      user.totalPredictions = (user.totalPredictions || 0) + 1;
      // accuracy decreases naturally since correctPredictions doesn't change
      user.predictionAccuracy = user.totalPredictions > 0
        ? Math.round(((user.correctPredictions || 0) / user.totalPredictions) * 100)
        : 0;
      await user.save();
    } catch (err) {
      console.error(`Failed to update prediction tally for voter ${vote.userId}:`, err);
    }
  }
}

async function closeExpiredPolls() {
  const expiredPolls = await Poll.find({
    isClosed: false,
    closesAt: { $lte: new Date() },
  });

  if (expiredPolls.length === 0) return;

  console.log(`⏰ Closing ${expiredPolls.length} expired poll(s)...`);
  for (const poll of expiredPolls) {
    await closeAndRewardPoll(poll);
  }
}

function startPollCloseJob() {
  cron.schedule('* * * * *', () => {
    closeExpiredPolls().catch((err) => {
      console.error('Poll auto-close job failed:', err);
    });
  });
  console.log('🕐 Poll auto-close cron job scheduled (every minute).');
}

module.exports = { startPollCloseJob, closeExpiredPolls };