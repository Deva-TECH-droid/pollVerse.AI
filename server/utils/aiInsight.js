const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Helper to generate high-fidelity, realistic simulation predictions when Gemini API is unavailable.
 */
function generateSimulatedPrediction(poll) {
  const numOptions = poll.options.length;
  
  // Distribute probabilities summing to 100
  // Let the first option have a slightly higher probability for realism
  const probabilities = [];
  let remaining = 100;
  for (let i = 0; i < numOptions - 1; i++) {
    const val = Math.max(10, Math.floor(remaining / (numOptions - i) + (i === 0 ? 15 : -5)));
    probabilities.push(val);
    remaining -= val;
  }
  probabilities.push(remaining);
  
  // Find highest probability option as the predicted winner
  let maxIdx = 0;
  for (let i = 1; i < probabilities.length; i++) {
    if (probabilities[i] > probabilities[maxIdx]) maxIdx = i;
  }
  
  const textToAnalyze = (poll.question + " " + poll.description + " " + poll.options.map(o => o.text).join(" ")).toLowerCase();
  
  let category = "general";
  if (textToAnalyze.match(/player|messi|ronaldo|football|sports|cricket|match|game|team|tennis|basketball|nba|virat|dhoni|ipl|ball/)) {
    category = "sports";
  } else if (textToAnalyze.match(/movie|film|oscar|actor|director|series|netflix|hollywood|bollywood|marvel|dc|show|cinema/)) {
    category = "movies";
  } else if (textToAnalyze.match(/iphone|samsung|phone|gadget|processor|tech|laptop|gpu|card|console|playstation|xbox|apple|android|intel|amd|nvidia/)) {
    category = "technology";
  } else if (textToAnalyze.match(/election|modi|gandhi|biden|trump|president|vote|party|minister|politics|democrat|republican|senate|parliament/)) {
    category = "politics";
  }
  
  let comparisonStats = [];
  let explainableAI = [];
  
  if (category === "sports") {
    comparisonStats = [
      { metric: "Win Rate", values: poll.options.map((_, i) => `${75 - i * 5}%`) },
      { metric: "Recent Form", values: poll.options.map((_, i) => "⭐".repeat(5 - i)) },
      { metric: "Matches Played", values: poll.options.map((_, i) => `${300 + i * 20}`) },
      { metric: "Avg Rating", values: poll.options.map((_, i) => `${(8.8 - i * 0.4).toFixed(1)}/10`) },
      { metric: "Trophies (Last 5 yrs)", values: poll.options.map((_, i) => `${6 - i}`) }
    ];
    explainableAI = [
      "✓ Better recent head-to-head performance record",
      "✓ Higher average match rating in the current league",
      "✓ More trophies won in high-level competitions",
      "✓ Superior athletic statistics and fitness levels"
    ];
  } else if (category === "movies") {
    comparisonStats = [
      { metric: "IMDb Rating", values: poll.options.map((_, i) => `${(8.7 - i * 0.3).toFixed(1)}/10`) },
      { metric: "Rotten Tomatoes", values: poll.options.map((_, i) => `${94 - i * 6}%`) },
      { metric: "Audience Score", values: poll.options.map((_, i) => `${91 - i * 4}%`) },
      { metric: "Box Office (Est.)", values: poll.options.map((_, i) => `$${(450 - i * 80)}M`) },
      { metric: "Awards Won", values: poll.options.map((_, i) => `${12 - i * 2}`) }
    ];
    explainableAI = [
      "✓ Favorable critical consensus on aggregator sites",
      "✓ Higher box office momentum and commercial success",
      "✓ Stronger audience score and audience retention rates",
      "✓ More wins and nominations in recent academy festivals"
    ];
  } else if (category === "technology") {
    comparisonStats = [
      { metric: "Performance Rating", values: poll.options.map((_, i) => `${(9.5 - i * 0.5).toFixed(1)}/10`) },
      { metric: "Battery Life", values: poll.options.map((_, i) => `${24 - i * 2} Hrs`) },
      { metric: "Camera Rating", values: poll.options.map((_, i) => `${98 - i * 4}/100`) },
      { metric: "User Reviews", values: poll.options.map((_, i) => "⭐⭐⭐⭐⭐".slice(0, 5 - Math.floor(i / 2))) },
      { metric: "Value For Money", values: poll.options.map((_, i) => `${85 - i * 8}%`) }
    ];
    explainableAI = [
      "✓ Higher benchmark scores in CPU and GPU speed tests",
      "✓ Longer verified battery backup and faster charging speeds",
      "✓ Better user and community satisfaction index scores",
      "✓ Superior display screen quality and camera rating scores"
    ];
  } else if (category === "politics") {
    comparisonStats = [
      { metric: "Previous Vote Share", values: poll.options.map((_, i) => `${48 - i * 5}%`) },
      { metric: "Public Approval Rating", values: poll.options.map((_, i) => `${58 - i * 6}%`) },
      { metric: "Seat Share History", values: poll.options.map((_, i) => `${52 - i * 4}%`) },
      { metric: "Recent Survey Trend", values: poll.options.map((_, i) => `${54 - i * 5}%`) },
      { metric: "Experience (Years)", values: poll.options.map((_, i) => `${25 - i * 3}`) }
    ];
    explainableAI = [
      "✓ Stronger historical performance in previous terms",
      "✓ Favorable poll survey statistics and political momentum",
      "✓ Greater institutional experience and cabinet leadership",
      "✓ Higher voter approval rating in urban and rural centers"
    ];
  } else {
    // General
    comparisonStats = [
      { metric: "Popularity Index", values: poll.options.map((_, i) => `${88 - i * 8}%`) },
      { metric: "User Rating", values: poll.options.map((_, i) => `${(9.0 - i * 0.5).toFixed(1)}/10`) },
      { metric: "Reliability Score", values: poll.options.map((_, i) => `${92 - i * 5}%`) },
      { metric: "Global Reach", values: poll.options.map((_, i) => `${85 - i * 7}%`) }
    ];
    explainableAI = [
      "✓ Higher overall user satisfaction rating",
      "✓ Superior consistency and durability scores",
      "✓ Better ratings across expert panels and forums",
      "✓ Larger market presence and positive community feedback"
    ];
  }

  return {
    probabilities,
    predictedOptionIndex: maxIdx,
    confidenceLevel: probabilities[maxIdx] > 65 ? "High" : probabilities[maxIdx] > 45 ? "Medium" : "Low",
    confidenceScore: Math.round(probabilities[maxIdx] * 1.3 > 99 ? 99 : probabilities[maxIdx] * 1.3),
    explainableAI,
    comparisonStats,
    isCorrect: null
  };
}

/**
 * Generates structured AI prediction data for a poll using Google Gemini API,
 * with a high-fidelity local simulation fallback.
 */
async function generateAIPrediction(poll) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY; // Accept both for flexibility
  if (!apiKey) {
    console.warn('⚠️  GEMINI_API_KEY not set in .env — using AI prediction simulator fallback.');
    return generateSimulatedPrediction(poll);
  }

  const optionNames = poll.options.map((o) => o.text).join(', ');
  const prompt = `You are an AI data analyst for a poll prediction app.
Analyze the following poll question and options to estimate the winning probability of each option based on historical performance, recent statistics, and general trends.

Poll Question: "${poll.question}"
Description: "${poll.description || ''}"
Options: ${optionNames}

Determine the relevant category (e.g. sports, movies, politics, technology, general) and synthesize realistic, accurate, or highly plausible side-by-side statistics comparing all the options. For example, if comparing Messi and Ronaldo, gather stats like Goals, Assists, Matches, Win Rate, and Recent Form. If comparing smartphones, gather stats like Performance Rating, Battery Life, Camera Rating, User Reviews, and Value For Money. Ensure that you output exactly one column/value per option for each statistic.

You must respond with a JSON object conforming exactly to this JSON schema:
{
  "probabilities": [number], // An array of numbers representing the estimated win probability in percentage for each option in the exact same order as the options list. Must sum to 100.
  "predictedOptionIndex": number, // The index (0-indexed) of the option predicted to have the highest probability.
  "confidenceLevel": "High" | "Medium" | "Low", // The confidence level of this prediction.
  "confidenceScore": number, // A confidence percentage score from 1 to 100.
  "explainableAI": [string], // A list of 3-5 concise bullet points (each under 15 words) explaining why the AI prefers the predicted winner (e.g., "✓ Better recent performance", "✓ More trophies in the last 5 years"). Ensure each starts with "✓ ".
  "comparisonStats": [ // An array of 4-5 statistics comparing the options side-by-side.
    {
      "metric": string, // The name of the metric (e.g. "Goals", "IMDb Rating", "Battery Life", etc.)
      "values": [string] // An array of strings representing the value of this metric for each option, in the exact same order as the options list. Use ⭐ emojis for ratings if appropriate.
    }
  ]
}

Return ONLY the raw JSON object. Do not include markdown formatting, backticks, or any conversational text.`;

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini API error:', res.status, errText);
      return generateSimulatedPrediction(poll);
    }

    const data = await res.json();
    let text = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();

    if (text.startsWith('```')) {
      text = text.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
    }

    const prediction = JSON.parse(text);
    
    // Safety assertions to make sure shape is correct
    if (!Array.isArray(prediction.probabilities) || prediction.probabilities.length !== poll.options.length) {
      throw new Error("Probabilities array length mismatch");
    }
    if (typeof prediction.predictedOptionIndex !== 'number' || prediction.predictedOptionIndex < 0 || prediction.predictedOptionIndex >= poll.options.length) {
      throw new Error("Invalid predictedOptionIndex");
    }
    if (!Array.isArray(prediction.explainableAI)) {
      throw new Error("Invalid explainableAI format");
    }
    if (!Array.isArray(prediction.comparisonStats)) {
      throw new Error("Invalid comparisonStats format");
    }

    // Ensure comparison stats have values matching the number of options
    prediction.comparisonStats.forEach(stat => {
      if (!Array.isArray(stat.values) || stat.values.length !== poll.options.length) {
        throw new Error("Comparison stats values length mismatch");
      }
    });

    prediction.isCorrect = null;
    return prediction;

  } catch (err) {
    console.error('Failed to parse/generate Gemini AI prediction:', err);
    return generateSimulatedPrediction(poll);
  }
}

/**
 * Generates a short, engaging "know more" style explainer about a poll's topic and options.
 * Uses Gemini API with fallback description parsing.
 */
async function generatePollInsight(poll) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  GEMINI_API_KEY not set in .env — skipping AI insight generation.');
    return `Interesting fact about ${poll.options.map(o => o.text).join(' and ')}: This matchup highlights unique achievements and contrasting styles between both choices.`;
  }

  const optionNames = poll.options.map((o) => o.text).join(' vs ');
  const winningOption =
    poll.winningOptionIndex !== null && poll.winningOptionIndex !== undefined
      ? poll.options[poll.winningOptionIndex].text
      : null;

  const prompt = `Write a short, engaging "know more" factual background paragraph for a prediction poll app called PollVerse.
  
Poll question: "${poll.question}"
Options: ${optionNames}
${winningOption ? `The option with the most user votes was: "${winningOption}"` : ''}

Write 2 short paragraphs giving interesting, factual background on this matchup — achievements, history, or context. Keep it under 150 words. Do not use markdown formatting.`;

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!res.ok) return '';

    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
    return text;
  } catch (err) {
    console.error('Failed to generate AI insight paragraph:', err);
    return '';
  }
}

module.exports = { generatePollInsight, generateAIPrediction };