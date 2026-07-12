const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Generates a short, engaging "know more" style explainer about a poll's
// topic and its options — e.g. for "Argentina vs France" it might cover
// World Cup history, star players, and recent form. This is a real call to
// Anthropic's API (requires ANTHROPIC_API_KEY), not hardcoded text, so the
// content adapts to whatever the admin's poll is actually about.
async function generatePollInsight(poll) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  ANTHROPIC_API_KEY not set in .env — skipping AI insight generation.');
    return '';
  }

  const optionNames = poll.options.map((o) => o.text).join(' vs ');
  const winningOption =
    poll.winningOptionIndex !== null && poll.winningOptionIndex !== undefined
      ? poll.options[poll.winningOptionIndex].text
      : null;

  const prompt = `You're writing a short "know more" explainer for a prediction poll app called PollVerse.

Poll question: "${poll.question}"
${poll.description ? `Poll description: "${poll.description}"` : ''}
Options: ${optionNames}
${winningOption ? `The option with the most user votes was: "${winningOption}"` : ''}

Write 2-3 short paragraphs (under 180 words total) giving interesting, factual background on this topic and the options involved — relevant history, achievements, stats, or context that helps a curious reader understand why this is a compelling matchup or question. Keep it upbeat and engaging, not dry or academic. Do not mention that you are an AI or that this text was generated. Do not use markdown formatting — plain text paragraphs only, separated by a blank line. If you are not confident about a specific fact (e.g. an exact statistic), speak in general terms rather than stating a precise number you're unsure of.`;

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Anthropic API error:', res.status, errText);
      return '';
    }

    const data = await res.json();
    const text = (data.content || [])
      .map((block) => block.text || '')
      .join('\n')
      .trim();

    return text;
  } catch (err) {
    console.error('Failed to generate AI insight:', err);
    return '';
  }
}

module.exports = { generatePollInsight };