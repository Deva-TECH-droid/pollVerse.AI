const { getDisplayName } = require('./displayName');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function isEmailConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM_ADDRESS);
}

function getFromAddress() {
  return {
    email: process.env.EMAIL_FROM_ADDRESS,
    name: process.env.EMAIL_FROM_NAME || 'PollVerse',
  };
}

async function sendEmail({ to, subject, html, text, attachments = [] }) {
  if (!isEmailConfigured()) {
    console.warn('\n⚠️  Email not configured. Set BREVO_API_KEY and EMAIL_FROM_ADDRESS in server/.env');
    console.log(`📧 Would send to: ${to}`);
    console.log(`   Subject: ${subject}`);
    if (text) console.log(`   Body:\n${text}\n`);
    if (attachments.length) console.log(`   Attachments: ${attachments.map((a) => a.name).join(', ')}`);
    return { mocked: true };
  }

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: getFromAddress(),
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
      ...(attachments.length ? { attachment: attachments.map((a) => ({ content: a.content, name: a.name })) } : {}),
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`❌ Brevo failed to send to ${to}:`, res.status, errBody);
    throw new Error(`Brevo send failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();

  console.log(`✅ Email sent to ${to} — ${data?.messageId}`);
  return data;
}

async function sendOTPEmail(email, otp) {
  const subject = '🔐 Your LivePoll Login Code';
  const text = [
    'Hello,',
    '',
    `Your LivePoll verification code is: ${otp}`,
    '',
    'This code expires in 10 minutes.',
    'If you did not request this, you can safely ignore this email.',
    '',
    '— LivePoll Team',
  ].join('\n');

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #111; color: #fff; border-radius: 16px;">
      <h2 style="color: #8b85ff; margin-bottom: 8px;">LivePoll</h2>
      <p style="color: #a0a0a0;">Your one-time login code</p>
      <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; margin: 28px 0; color: #fff;">${otp}</div>
      <p style="color: #a0a0a0; font-size: 14px;">This code expires in <strong style="color:#fff;">10 minutes</strong>.</p>
      <p style="color: #606060; font-size: 13px; margin-top: 24px;">If you didn't request this, ignore this email.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html, text });
}

async function sendNewPollEmail({ to, recipientEmail, creatorName, pollQuestion, pollDescription, pollUrl, durationHours, rewardPoints }) {
  const recipientName = getDisplayName(recipientEmail);
  const subject = `📢 ${creatorName} has started a new prediction poll`;
  const text = [
    `Hello ${recipientName},`,
    '',
    `📢 ${creatorName} has started a new prediction poll.`,
    '',
    `Poll: ${pollQuestion}`,
    pollDescription ? pollDescription : null,
    '',
    `Vote now before the poll closes in ${durationHours} hours.`,
    rewardPoints ? `Correct predictions earn ${rewardPoints} reward credits.` : null,
    '',
    `Click here to participate: ${pollUrl}`,
    '',
    'Thank you for being a part of LivePoll!',
  ]
    .filter((line) => line !== null)
    .join('\n');

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #111; color: #fff; border-radius: 16px; border: 1px solid #2a2a2a;">
      <h2 style="color: #8b85ff; margin: 0 0 4px;">📢 New Prediction Poll</h2>
      <p style="color: #a0a0a0; margin-top: 0;">Hello <strong style="color:#fff;">${recipientName}</strong>,</p>
      <p style="color: #ccc; line-height: 1.6;"><strong style="color:#fff;">${creatorName}</strong> has started a new prediction poll. Vote now before the poll closes.</p>
      <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 6px; color: #606060; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Poll</p>
        <p style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #fff;">${pollQuestion}</p>
        ${pollDescription ? `<p style="margin: 0; color: #a0a0a0; font-size: 14px;">${pollDescription}</p>` : ''}
      </div>
      <p style="color: #a0a0a0;">Closes in <strong style="color:#f59e0b;">${durationHours} hours</strong>${rewardPoints ? ` &nbsp;•&nbsp; Correct votes earn <strong style="color:#4ade80;">${rewardPoints} credits</strong>` : ''}</p>
      <a href="${pollUrl}" style="display: inline-block; margin: 24px 0; padding: 14px 28px; background: linear-gradient(135deg, #6c63ff, #8b85ff); color: #fff; text-decoration: none; border-radius: 10px; font-weight: 700;">Click Here to Participate →</a>
      <p style="color: #606060; font-size: 13px; margin-top: 24px;">Thank you for being a part of LivePoll!</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}

// Sent to every user whose vote matched the winning option once a poll closes.
async function sendWinnerEmail({ to, recipientEmail, pollQuestion, pollDescription, winningOption, creditsEarned, currentCredits, pollUrl }) {
  const recipientName = getDisplayName(recipientEmail);
  const subject = '🎉 Congratulations — your prediction was correct!';

  const text = [
    `Hello ${recipientName},`,
    '',
    '🎉 Congratulations for your valuable vote!',
    '',
    `Guess what — your previous vote is the winner!`,
    '',
    `Poll: ${pollQuestion}`,
    pollDescription ? pollDescription : null,
    `Winning option: ${winningOption}`,
    '',
    `You earned ${creditsEarned} reward credits.`,
    `Current credits: ${currentCredits}`,
    '',
    pollUrl ? `See the full results: ${pollUrl}` : null,
    '',
    'Keep participating to unlock exciting rewards.',
  ]
    .filter((line) => line !== null)
    .join('\n');

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #111; color: #fff; border-radius: 16px; border: 1px solid #2a2a2a;">
      <h2 style="color: #4ade80; margin: 0 0 4px;">🎉 Congratulations!</h2>
      <p style="color: #a0a0a0; margin-top: 0;">Hello <strong style="color:#fff;">${recipientName}</strong>, thank you for your valuable vote — guess what, your previous vote is the winner!</p>
      <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 6px; color: #606060; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Poll</p>
        <p style="margin: 0 0 8px; font-size: 16px; font-weight: 700; color: #fff;">${pollQuestion}</p>
        ${pollDescription ? `<p style="margin: 0 0 12px; color: #a0a0a0; font-size: 14px;">${pollDescription}</p>` : ''}
        <p style="margin: 0; color: #4ade80; font-weight: 600;">✓ Winning option: ${winningOption}</p>
      </div>
      <p style="color: #ccc; font-size: 18px;">You earned <strong style="color:#4ade80;">${creditsEarned} reward credits</strong>.</p>
      <p style="color: #a0a0a0;">Current credits: <strong style="color:#fff;">${currentCredits}</strong></p>
      ${pollUrl ? `<a href="${pollUrl}" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background: linear-gradient(135deg, #6c63ff, #8b85ff); color: #fff; text-decoration: none; border-radius: 10px; font-weight: 700;">See Full Results →</a>` : ''}
      <p style="color: #606060; font-size: 13px; margin-top: 24px;">Keep participating to unlock exciting rewards!</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}

// Sent once when a user crosses the 200-credit milestone.
async function sendMilestoneEmail({ to, recipientEmail, currentCredits, claimUrl }) {
  const recipientName = getDisplayName(recipientEmail);
  const subject = '🏆 You unlocked a 200-credit reward!';

  const text = [
    `Congratulations ${recipientName}!`,
    '',
    `🏆 You have reached ${currentCredits} reward credits.`,
    '',
    'As a reward, you have unlocked an exclusive surprise.',
    '',
    `Claim it here: ${claimUrl}`,
  ].join('\n');

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #111; color: #fff; border-radius: 16px; border: 1px solid #2a2a2a; text-align: center;">
      <h2 style="color: #f59e0b; margin: 0 0 4px;">🏆 Congratulations!</h2>
      <p style="color: #a0a0a0;">${recipientName}, you've reached <strong style="color:#fff;">${currentCredits} reward credits</strong>.</p>
      <p style="color: #ccc; line-height: 1.6;">As a reward, you have unlocked an exclusive surprise.</p>
      <a href="${claimUrl}" style="display: inline-block; margin: 24px 0; padding: 14px 28px; background: linear-gradient(135deg, #f59e0b, #f97316); color: #fff; text-decoration: none; border-radius: 10px; font-weight: 700;">Claim Your Reward →</a>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}

// Sent to whoever created a Gully Cricket match once it's finished — full
// result plus MOTM/MVP called out specially, with a certificate PDF attached
// for the Player of the Match.
async function sendMatchScorecardEmail({ to, recipientName, teamAName, teamBName, result, awards, matchUrl, certificateBase64 }) {
  const subject = `🏏 Scorecard: ${teamAName} vs ${teamBName} — ${result}`;

  const awardLine = (label, award) => (award ? `${label}: ${award.name} — ${award.statLine}` : null);

  const text = [
    `Hello ${recipientName},`,
    '',
    `Your Gully Cricket match has finished!`,
    '',
    `${teamAName} vs ${teamBName}`,
    `Result: ${result}`,
    '',
    '🏆 Match Awards',
    awardLine('⭐ Player of the Match', awards.motm),
    awardLine('🏅 Most Valuable Player', awards.mvp),
    awardLine('🏏 Best Batter', awards.bestBatter),
    awardLine('🎯 Best Bowler', awards.bestBowler),
    awardLine('⚡ Highest Strike Rate', awards.highestStrikeRate),
    awardLine('💪 Best Economy', awards.bestEconomy),
    awardLine('🧤 Best Fielder', awards.bestFielder),
    '',
    certificateBase64 ? 'A Player of the Match certificate is attached to this email.' : null,
    '',
    `View the full scorecard: ${matchUrl}`,
    '',
    '— PollVerse Gully Cricket',
  ]
    .filter((line) => line !== null)
    .join('\n');

  const awardRow = (icon, label, award, highlight) =>
    award
      ? `
      <div style="background: ${highlight ? 'rgba(34,197,94,0.1)' : '#1a1a1a'}; border: 1px solid ${highlight ? 'rgba(34,197,94,0.4)' : '#2a2a2a'}; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px;">
        <p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">${icon} ${label}</p>
        <p style="margin: 4px 0 0; font-size: 16px; font-weight: 700; color: #fff;">${award.name}</p>
        <p style="margin: 2px 0 0; font-size: 13px; color: #4ade80;">${award.statLine}</p>
      </div>`
      : '';

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #111; color: #fff; border-radius: 16px; border: 1px solid #2a2a2a;">
      <h2 style="color: #22c55e; margin: 0 0 4px;">🏏 Match Finished!</h2>
      <p style="color: #a0a0a0; margin-top: 0;">Hello <strong style="color:#fff;">${recipientName}</strong>, here's the full scorecard for your match.</p>

      <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #fff;">${teamAName} vs ${teamBName}</p>
        <p style="margin: 0; font-size: 15px; font-weight: 700; color: #22c55e;">🏆 ${result}</p>
      </div>

      <h3 style="color: #fff; font-size: 15px; margin: 24px 0 12px;">🏆 Match Awards</h3>
      ${awardRow('⭐', 'Player of the Match', awards.motm, true)}
      ${awardRow('🏅', 'Most Valuable Player', awards.mvp, true)}
      ${awardRow('🏏', 'Best Batter', awards.bestBatter, false)}
      ${awardRow('🎯', 'Best Bowler', awards.bestBowler, false)}
      ${awardRow('⚡', 'Highest Strike Rate', awards.highestStrikeRate, false)}
      ${awardRow('💪', 'Best Economy', awards.bestEconomy, false)}
      ${awardRow('🧤', 'Best Fielder', awards.bestFielder, false)}

      ${certificateBase64 ? '<p style="color: #a0a0a0; font-size: 13px; margin-top: 16px;">📎 A Player of the Match certificate is attached to this email.</p>' : ''}

      <a href="${matchUrl}" style="display: inline-block; margin: 20px 0 8px; padding: 14px 28px; background: linear-gradient(135deg, #22c55e, #16a34a); color: #052e10; text-decoration: none; border-radius: 10px; font-weight: 700;">View Full Scorecard →</a>

      <p style="color: #606060; font-size: 13px; margin-top: 20px;">Thanks for scoring with PollVerse Gully Cricket!</p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text,
    attachments: certificateBase64 ? [{ name: 'Player_of_the_Match_Certificate.pdf', content: certificateBase64 }] : [],
  });
}

// Sent to the admin whenever a user submits feedback.
async function sendFeedbackEmail({ to, fromName, fromEmail, message }) {
  const subject = `💬 New feedback from ${fromName}`;

  const text = [
    `New feedback submitted on PollVerse.`,
    '',
    `From: ${fromName} (${fromEmail})`,
    '',
    'Message:',
    message,
  ].join('\n');

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #111; color: #fff; border-radius: 16px; border: 1px solid #2a2a2a;">
      <h2 style="color: #8b85ff; margin: 0 0 4px;">💬 New Feedback</h2>
      <p style="color: #a0a0a0; margin-top: 0;">From <strong style="color:#fff;">${fromName}</strong> (${fromEmail})</p>
      <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 20px; margin: 24px 0; white-space: pre-wrap; color: #ccc; line-height: 1.6;">${message}</div>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}

module.exports = {
  isEmailConfigured,
  sendNewPollEmail,
  sendWinnerEmail,
  sendMilestoneEmail,
  sendFeedbackEmail,
  sendMatchScorecardEmail,
};