const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const { requireAuth } = require('../middleware/auth');
const { generateMotmCertificate } = require('../utils/certificate');
const { sendMatchScorecardEmail } = require('../utils/email');

router.post('/matches', requireAuth, async (req, res) => {
  try {
    const { teamAName, teamBName, teamAPlayers, teamBPlayers, overs, tossWonBy, tossDecision } = req.body;

    if (!teamAName?.trim() || !teamBName?.trim()) {
      return res.status(400).json({ message: 'Both team names are required.' });
    }
    if (!Array.isArray(teamAPlayers) || !Array.isArray(teamBPlayers)) {
      return res.status(400).json({ message: 'Player lists are required for both teams.' });
    }
    const cleanA = teamAPlayers.map((p) => p.trim()).filter(Boolean);
    const cleanB = teamBPlayers.map((p) => p.trim()).filter(Boolean);
    if (cleanA.length < 2 || cleanB.length < 2) {
      return res.status(400).json({ message: 'Each team needs at least 2 players.' });
    }
    if (!overs || overs < 1 || overs > 50) {
      return res.status(400).json({ message: 'Overs must be between 1 and 50.' });
    }
    if (!['teamA', 'teamB'].includes(tossWonBy)) {
      return res.status(400).json({ message: 'tossWonBy must be teamA or teamB.' });
    }
    if (!['bat', 'bowl'].includes(tossDecision)) {
      return res.status(400).json({ message: 'tossDecision must be bat or bowl.' });
    }

    const winner = tossWonBy;
    const loser = tossWonBy === 'teamA' ? 'teamB' : 'teamA';
    const battingTeam = tossDecision === 'bat' ? winner : loser;
    const bowlingTeam = battingTeam === 'teamA' ? 'teamB' : 'teamA';

    const match = await Match.create({
      teamA: { name: teamAName.trim(), players: cleanA },
      teamB: { name: teamBName.trim(), players: cleanB },
      overs,
      tossWonBy,
      tossDecision,
      battingTeam,
      bowlingTeam,
      createdBy: {
        userId: req.user._id,
        email: req.user.email,
        name: req.user.name || req.user.email,
      },
    });

    res.status(201).json(match);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/matches', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const matches = await Match.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/matches/:id', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    res.json({ match, innings: match.innings.map((inn, i) => buildInningsSummary(match, inn)) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Scoring engine
// ---------------------------------------------------------------------------

// Turns a wicket ball into standard scorecard notation, e.g. "c Rahul b Aman",
// "b Aman", "run out (Devansh)", "st Rahul b Aman".
function describeDismissal(ball, bowlerName) {
  const fielder = ball.fielder;
  switch (ball.wicketType) {
    case 'caught':
      return fielder ? `c ${fielder} b ${bowlerName}` : `c & b ${bowlerName}`;
    case 'bowled':
      return `b ${bowlerName}`;
    case 'lbw':
      return `lbw b ${bowlerName}`;
    case 'run out':
      return fielder ? `run out (${fielder})` : 'run out';
    case 'stumped':
      return fielder ? `st ${fielder} b ${bowlerName}` : `st b ${bowlerName}`;
    case 'hit wicket':
      return `hit wicket b ${bowlerName}`;
    default:
      return ball.wicketType || 'out';
  }
}

// Turns the raw ball log for one innings into everything the scoreboard UI
// needs: totals, batting card, bowling card, extras, fall of wickets.
// Recomputed on every request instead of stored, so there's a single source
// of truth (the ball log) and nothing can drift out of sync.
function buildInningsSummary(match, innings) {
  const battingTeamKey = innings.battingTeam;
  const bowlingTeamKey = innings.bowlingTeam;
  const battingPlayers = match[battingTeamKey].players;

  const batting = {}; // name -> stats
  const bowling = {}; // name -> stats
  let totalRuns = 0;
  let totalWickets = 0;
  let legalBallCount = 0;
  const extras = { wide: 0, noball: 0, bye: 0, legbye: 0 };
  const fallOfWickets = [];
  const recentBalls = [];

  const ensureBatter = (name) => {
    if (!batting[name]) batting[name] = { name, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false, outType: '' };
    return batting[name];
  };
  const ensureBowler = (name) => {
    if (!bowling[name]) bowling[name] = { name, legalBalls: 0, maidenCandidates: {}, runsConceded: 0, wickets: 0 };
    return bowling[name];
  };

  innings.balls.forEach((b) => {
    const legal = !['wide', 'noball'].includes(b.extraType);
    const striker = ensureBatter(b.striker);
    const bowler = ensureBowler(b.bowler);

    let teamRuns = 0;
    let batsmanRuns = 0;
    if (b.extraType === 'wide') {
      teamRuns = 1 + (b.runs || 0);
    } else if (b.extraType === 'noball') {
      teamRuns = 1 + (b.runs || 0);
      batsmanRuns = b.runs || 0;
    } else if (b.extraType === 'bye' || b.extraType === 'legbye') {
      teamRuns = b.runs || 0;
    } else {
      teamRuns = b.runs || 0;
      batsmanRuns = b.runs || 0;
    }

    totalRuns += teamRuns;
    if (b.extraType) extras[b.extraType] = (extras[b.extraType] || 0) + teamRuns;

    if (legal) {
      legalBallCount += 1;
      striker.ballsFaced += 1;
    }
    if (!b.extraType) {
      striker.runs += batsmanRuns;
      if (batsmanRuns === 4) striker.fours += 1;
      if (batsmanRuns === 6) striker.sixes += 1;
    } else if (b.extraType === 'noball') {
      striker.runs += batsmanRuns;
      if (batsmanRuns === 4) striker.fours += 1;
      if (batsmanRuns === 6) striker.sixes += 1;
    }

    // Bowler figures — byes/leg-byes don't count against the bowler.
    const runsAgainstBowler = b.extraType === 'bye' || b.extraType === 'legbye' ? 0 : teamRuns;
    bowler.runsConceded += runsAgainstBowler;
    if (legal) bowler.legalBalls += 1;
    const overKey = b.overNumber;
    bowler.maidenCandidates[overKey] = (bowler.maidenCandidates[overKey] || 0) + runsAgainstBowler;

    if (b.isWicket) {
      totalWickets += 1;
      const outName = b.outBatsman || b.striker;
      const outBatter = ensureBatter(outName);
      outBatter.isOut = true;
      outBatter.outType = describeDismissal(b, bowler.name);
      if (b.wicketType !== 'run out') bowler.wickets += 1;
      fallOfWickets.push({
        wicketNumber: totalWickets,
        score: totalRuns,
        over: `${b.overNumber}.${legal ? b.ballInOver : b.ballInOver}`,
        batsmanOut: outName,
        dismissal: outBatter.outType,
      });
    }

    recentBalls.push({
      display: b.isWicket ? 'W' : b.extraType === 'wide' ? `Wd${b.runs ? '+' + b.runs : ''}` : b.extraType === 'noball' ? `Nb${b.runs ? '+' + b.runs : ''}` : b.extraType === 'bye' ? `${b.runs}b` : b.extraType === 'legbye' ? `${b.runs}lb` : String(b.runs),
      isWicket: b.isWicket,
      isBoundary: !b.extraType && (b.runs === 4 || b.runs === 6),
    });
  });

  const battingCard = battingPlayers.map((name) => {
    const b = batting[name] || { name, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false, outType: '' };
    return { ...b, strikeRate: b.ballsFaced > 0 ? Math.round((b.runs / b.ballsFaced) * 1000) / 10 : 0 };
  });

  const bowlingCard = Object.values(bowling).map((bl) => {
    const oversCompleted = Math.floor(bl.legalBalls / 6);
    const ballsRemainder = bl.legalBalls % 6;
    const maidens = Object.values(bl.maidenCandidates).filter((r, idx) => r === 0).length;
    const oversAsDecimal = bl.legalBalls / 6;
    return {
      name: bl.name,
      overs: `${oversCompleted}.${ballsRemainder}`,
      maidens,
      runsConceded: bl.runsConceded,
      wickets: bl.wickets,
      economy: oversAsDecimal > 0 ? Math.round((bl.runsConceded / oversAsDecimal) * 100) / 100 : 0,
    };
  });

  const oversCompleted = Math.floor(legalBallCount / 6);
  const ballsThisOver = legalBallCount % 6;

  // Required run rate — only meaningful in a chasing innings with a target.
  let requiredRunRate = null;
  if (innings.target) {
    const totalLegalBalls = match.overs * 6;
    const ballsRemaining = Math.max(totalLegalBalls - legalBallCount, 0);
    const runsNeeded = Math.max(innings.target - totalRuns, 0);
    requiredRunRate = {
      runsNeeded,
      ballsRemaining,
      oversRemaining: Math.round((ballsRemaining / 6) * 10) / 10,
      requiredRunRate: ballsRemaining > 0 ? Math.round((runsNeeded / (ballsRemaining / 6)) * 100) / 100 : null,
      currentRunRate: legalBallCount > 0 ? Math.round((totalRuns / (legalBallCount / 6)) * 100) / 100 : 0,
    };
  }

  const lastBall = innings.balls[innings.balls.length - 1];

  return {
    battingTeam: battingTeamKey,
    bowlingTeam: bowlingTeamKey,
    totalRuns,
    totalWickets,
    oversDisplay: `${oversCompleted}.${ballsThisOver}`,
    legalBallCount,
    battingCard,
    bowlingCard,
    extras,
    extrasTotal: Object.values(extras).reduce((a, b) => a + b, 0),
    fallOfWickets,
    recentBalls: recentBalls.slice(-6),
    current: innings.current,
    isComplete: innings.isComplete,
    target: innings.target || null,
    requiredRunRate,
    currentPartnership: computeCurrentPartnership(innings),
    wagonWheel: computeWagonWheel(innings),
    latestCommentary: lastBall ? generateCommentary(lastBall, innings.balls.length - 1) : null,
  };
}

// Groups consecutive balls by which pair of batsmen were at the crease,
// so we can show runs added together between each fall of wicket.
function computePartnerships(innings) {
  const partnerships = [];
  let currentPairKey = null;
  let current = null;

  innings.balls.forEach((b) => {
    const pairKey = [b.striker, b.nonStriker].sort().join('|');
    if (pairKey !== currentPairKey) {
      if (current) partnerships.push(current);
      current = { batsmen: [b.striker, b.nonStriker], runs: 0, balls: 0 };
      currentPairKey = pairKey;
    }
    const legal = !['wide', 'noball'].includes(b.extraType);
    let teamRuns = 0;
    if (b.extraType === 'wide' || b.extraType === 'noball') teamRuns = 1 + (b.runs || 0);
    else teamRuns = b.runs || 0;
    current.runs += teamRuns;
    if (legal) current.balls += 1;
  });
  if (current) partnerships.push(current);

  return partnerships.map((p, i) => ({ ...p, partnershipNumber: i + 1 }));
}

// Cumulative score at the end of each over, for a simple run-rate graph.
function computeRunRate(innings) {
  const perOver = {};
  let running = 0;
  innings.balls.forEach((b) => {
    let teamRuns = 0;
    if (b.extraType === 'wide' || b.extraType === 'noball') teamRuns = 1 + (b.runs || 0);
    else teamRuns = b.runs || 0;
    running += teamRuns;
    perOver[b.overNumber] = running;
  });
  return Object.entries(perOver).map(([over, cumulativeRuns]) => ({
    over: Number(over) + 1,
    cumulativeRuns,
  }));
}

// Off-side vs leg-side split for a standard right-hand batter's fielding
// regions. Used to turn shot directions into the classic wagon-wheel %s.
const OFF_SIDE_DIRECTIONS = new Set(['Cover Drive', 'Point', 'Third Man', 'Mid Off', 'Long Off']);
const LEG_SIDE_DIRECTIONS = new Set(['Mid On', 'Mid Wicket', 'Square Leg', 'Fine Leg', 'Long On']);

function computeWagonWheel(innings) {
  const byDirection = {};
  let offSideRuns = 0;
  let legSideRuns = 0;
  let totalShotRuns = 0;

  innings.balls.forEach((b) => {
    if (!b.shotDirection) return;
    const runs = b.runs || 0;
    byDirection[b.shotDirection] = (byDirection[b.shotDirection] || 0) + runs;
    totalShotRuns += runs;
    if (OFF_SIDE_DIRECTIONS.has(b.shotDirection)) offSideRuns += runs;
    else if (LEG_SIDE_DIRECTIONS.has(b.shotDirection)) legSideRuns += runs;
  });

  if (totalShotRuns === 0) return null;

  return {
    directions: Object.entries(byDirection).map(([direction, runs]) => ({
      direction,
      runs,
      pct: Math.round((runs / totalShotRuns) * 100),
    })),
    offSidePct: Math.round((offSideRuns / totalShotRuns) * 100),
    legSidePct: Math.round((legSideRuns / totalShotRuns) * 100),
    totalShotRuns,
  };
}

// Runs/balls added by whichever pair is currently batting, since the last
// wicket (or the start of the innings if none has fallen yet).
function computeCurrentPartnership(innings) {
  if (innings.isComplete) return null;
  const balls = innings.balls;
  let lastWicketIndex = -1;
  balls.forEach((b, i) => {
    if (b.isWicket) lastWicketIndex = i;
  });

  let runs = 0;
  let ballCount = 0;
  for (let i = lastWicketIndex + 1; i < balls.length; i++) {
    const b = balls[i];
    const legal = !['wide', 'noball'].includes(b.extraType);
    let teamRuns = 0;
    if (b.extraType === 'wide' || b.extraType === 'noball') teamRuns = 1 + (b.runs || 0);
    else teamRuns = b.runs || 0;
    runs += teamRuns;
    if (legal) ballCount += 1;
  }

  return { batsmen: [innings.current.striker, innings.current.nonStriker], runs, balls: ballCount };
}

// Required run rate for a chasing (2nd) innings — recalculated after every
// ball so the scorer always sees the current chase requirement.
function computeRequiredRunRate(match, innings, summary) {
  if (!innings.target) return null;
  const totalLegalBalls = match.overs * 6;
  const ballsBowled = summary.legalBallCount;
  const ballsRemaining = Math.max(totalLegalBalls - ballsBowled, 0);
  const runsNeeded = Math.max(innings.target - summary.totalRuns, 0);

  return {
    runsNeeded,
    ballsRemaining,
    oversRemaining: Math.round((ballsRemaining / 6) * 10) / 10,
    requiredRunRate: ballsRemaining > 0 ? Math.round((runsNeeded / (ballsRemaining / 6)) * 100) / 100 : null,
    currentRunRate: ballsBowled > 0 ? Math.round((summary.totalRuns / (ballsBowled / 6)) * 100) / 100 : 0,
  };
}

// Deterministic "random" pick from a list, seeded by the ball's position —
// same ball always gets the same commentary line even though it's generated
// fresh each time (nothing extra to store).
function pickVariant(list, seed) {
  return list[seed % list.length];
}

// Turns one ball's raw data into a short broadcast-style commentary line.
function generateCommentary(ball, seed) {
  const batter = ball.striker;

  if (ball.isWicket) {
    const outName = ball.outBatsman || batter;
    const fielder = ball.fielder;
    const bowler = ball.bowler;
    const lines = {
      bowled: [
        `BOWLED HIM! What a delivery from ${bowler} — ${outName} had no answer, clean bowled!`,
        `${bowler} strikes! Right through the gate, ${outName}'s stumps are shattered. Absolutely brilliant bowling!`,
        `Castled! ${bowler} has ${outName}'s number today — that ball was unplayable!`,
      ],
      caught: [
        fielder
          ? `GOT HIM! ${bowler} induces the edge and ${fielder} makes no mistake — ${outName} has to go! Brilliant bowling, brilliant catch!`
          : `Caught! ${bowler} gets the breakthrough — ${outName} departs.`,
        fielder
          ? `Up in the air... and ${fielder} completes the catch! ${bowler} strikes right when the team needed it, ${outName} walks back.`
          : `Up in the air... and caught! ${bowler} removes ${outName}.`,
      ],
      lbw: [
        `PLUMB! ${bowler} traps ${outName} dead in front — that has to be out, no doubt about it!`,
        `Given LBW! A superb delivery from ${bowler} that ${outName} simply couldn't get across to.`,
      ],
      'run out': [
        fielder
          ? `RUN OUT! Brilliant fielding from ${fielder} — a direct hit and ${outName} is well short. What a piece of work!`
          : `Run out! ${outName} is well short of the crease — costly mix-up.`,
        `Mix-up between the wickets! ${outName} pays the price and is run out — that could be a turning point!`,
      ],
      stumped: [
        fielder
          ? `STUMPED! ${outName} steps out to ${bowler}, and ${fielder} whips the bails off in a flash — lightning quick!`
          : `Stumped! ${bowler} lures ${outName} out of the crease.`,
        `Down the track and stumped! ${bowler} has outfoxed ${outName} completely.`,
      ],
      'hit wicket': [`Hit wicket! ${outName} treads onto the stumps off ${bowler}'s bowling — unlucky way to go.`],
    };
    return `🔴 WICKET! ${pickVariant(lines[ball.wicketType] || [`${outName} is out!`], seed)}`;
  }

  if (ball.extraType === 'wide') {
    return ball.runs > 0
      ? `Wide ball! ${batter} and the non-striker scamper through for extra runs.`
      : 'Wide ball! Extra run awarded.';
  }
  if (ball.extraType === 'noball') {
    return `No ball! Free hit coming up.${ball.runs > 0 ? ` And ${batter} middles it for ${ball.runs} off the free delivery too!` : ''}`;
  }
  if (ball.extraType === 'bye') return `Byes — ${batter} and partner run ${ball.runs}, added to the total.`;
  if (ball.extraType === 'legbye') return `Leg byes — ${ball.runs} run${ball.runs === 1 ? '' : 's'} added to the total.`;

  if (ball.runs === 6) {
    const lines = [
      `SIX! Massive hit — ${batter} smashes it way over the boundary!`,
      `SIX! ${batter} sends that into the crowd, what a strike!`,
    ];
    return `6️⃣ ${pickVariant(lines, seed)}`;
  }
  if (ball.runs === 4) {
    const lines = [
      `FOUR! Excellent shot from ${batter}, finds the gap beautifully.`,
      `FOUR! ${batter} races that away to the boundary.`,
    ];
    return `4️⃣ ${pickVariant(lines, seed)}`;
  }
  if (ball.runs === 0) {
    const lines = [`Good delivery, ${batter} defends — no run.`, `Dot ball — tight bowling beats ${batter}.`];
    return pickVariant(lines, seed);
  }
  return `${batter} taps it away for ${ball.runs} run${ball.runs === 1 ? '' : 's'}.`;
}

function buildCommentaryFeed(innings) {
  return innings.balls.map((b, i) => ({
    over: b.overNumber,
    ballInOver: b.ballInOver,
    label: `${b.overNumber}.${b.ballInOver}`,
    text: generateCommentary(b, i),
  }));
}


// log (catches, run-outs, stumpings already carry a fielder name).
function computeAwards(match, inningsSummaries) {
  const battingTotals = {}; // name -> { runs, ballsFaced, fours, sixes }
  const bowlingTotals = {}; // name -> { wickets, runsConceded, legalBalls }
  const fieldingCredits = {}; // name -> count

  inningsSummaries.forEach((inn) => {
    inn.battingCard.forEach((b) => {
      if (b.ballsFaced === 0 && !b.isOut) return;
      battingTotals[b.name] = battingTotals[b.name] || { name: b.name, runs: 0, ballsFaced: 0, fours: 0, sixes: 0 };
      battingTotals[b.name].runs += b.runs;
      battingTotals[b.name].ballsFaced += b.ballsFaced;
      battingTotals[b.name].fours += b.fours;
      battingTotals[b.name].sixes += b.sixes;
    });
    inn.bowlingCard.forEach((bl) => {
      bowlingTotals[bl.name] = bowlingTotals[bl.name] || { name: bl.name, wickets: 0, runsConceded: 0, legalBalls: 0 };
      bowlingTotals[bl.name].wickets += bl.wickets;
      bowlingTotals[bl.name].runsConceded += bl.runsConceded;
      const [ov, balls] = bl.overs.split('.').map(Number);
      bowlingTotals[bl.name].legalBalls += ov * 6 + balls;
    });
  });

  match.innings.forEach((inn) => {
    inn.balls.forEach((b) => {
      if (b.isWicket && b.fielder && ['caught', 'run out', 'stumped'].includes(b.wicketType)) {
        fieldingCredits[b.fielder] = (fieldingCredits[b.fielder] || 0) + 1;
      }
    });
  });

  const batters = Object.values(battingTotals);
  const bowlers = Object.values(bowlingTotals);

  const bestBatter = batters.length
    ? batters.reduce((a, b) => (b.runs > a.runs ? b : a))
    : null;

  const bestBowler = bowlers.length
    ? bowlers.reduce((a, b) => (b.wickets > a.wickets ? b : a))
    : null;

  const qualifiedStrikers = batters.filter((b) => b.ballsFaced >= 6);
  const highestStrikeRate = qualifiedStrikers.length
    ? qualifiedStrikers.reduce((a, b) => {
      const srA = a.ballsFaced > 0 ? a.runs / a.ballsFaced : 0;
      const srB = b.ballsFaced > 0 ? b.runs / b.ballsFaced : 0;
      return srB > srA ? b : a;
    })
    : null;

  const qualifiedBowlers = bowlers.filter((b) => b.legalBalls >= 6);
  const bestEconomy = qualifiedBowlers.length
    ? qualifiedBowlers.reduce((a, b) => {
      const ecoA = a.legalBalls > 0 ? a.runsConceded / (a.legalBalls / 6) : Infinity;
      const ecoB = b.legalBalls > 0 ? b.runsConceded / (b.legalBalls / 6) : Infinity;
      return ecoB < ecoA ? b : a;
    })
    : null;

  const bestFielder = Object.keys(fieldingCredits).length
    ? Object.entries(fieldingCredits).reduce((a, b) => (b[1] > a[1] ? b : a))
    : null;

  // Combined impact score for MOTM/MVP — batting runs + bonus for
  // boundaries, plus a bowling bonus weighted toward wickets over economy.
  const allNames = new Set([...batters.map((b) => b.name), ...bowlers.map((b) => b.name)]);
  const impactScores = [...allNames].map((name) => {
    const bat = battingTotals[name];
    const bowl = bowlingTotals[name];
    const battingImpact = bat ? bat.runs + bat.fours * 1 + bat.sixes * 2 : 0;
    const bowlingImpact = bowl ? bowl.wickets * 20 - (bowl.legalBalls > 0 ? (bowl.runsConceded / (bowl.legalBalls / 6)) * 2 : 0) : 0;
    const fieldingImpact = (fieldingCredits[name] || 0) * 10;
    return { name, score: battingImpact + bowlingImpact + fieldingImpact };
  });

  const motm = impactScores.length ? impactScores.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  // MVP mirrors MOTM in a single-match context (both measure combined
  // contribution) — kept as a distinct field since a future tournament mode
  // could compute MVP across multiple matches instead.
  const mvp = motm;

  // Builds a plain-English reason like "62 runs (2 fours, 3 sixes), 2
  // wickets & 2 catches" so the award never looks arbitrary.
  const buildReason = (name) => {
    const bat = battingTotals[name];
    const bowl = bowlingTotals[name];
    const catches = fieldingCredits[name] || 0;
    const parts = [];

    if (bat && (bat.runs > 0 || bat.ballsFaced > 0)) {
      let batPart = `${bat.runs} run${bat.runs === 1 ? '' : 's'} off ${bat.ballsFaced} ball${bat.ballsFaced === 1 ? '' : 's'}`;
      const boundaryBits = [];
      if (bat.fours > 0) boundaryBits.push(`${bat.fours} four${bat.fours === 1 ? '' : 's'}`);
      if (bat.sixes > 0) boundaryBits.push(`${bat.sixes} six${bat.sixes === 1 ? '' : 'es'}`);
      if (boundaryBits.length) batPart += ` (${boundaryBits.join(', ')})`;
      parts.push(batPart);
    }
    if (bowl && bowl.wickets > 0) {
      parts.push(`${bowl.wickets} wicket${bowl.wickets === 1 ? '' : 's'}`);
    }
    if (catches > 0) {
      parts.push(`${catches} catch${catches === 1 ? '' : 'es'}`);
    }

    return parts.length ? parts.join(', ') : 'Best overall contribution this match';
  };

  const line = (b) => (b ? `${b.runs} (${b.ballsFaced} balls)` : null);
  const bowlLine = (b) => (b ? `${b.wickets} wkts, ${Math.round((b.runsConceded / Math.max(b.legalBalls / 6, 0.1)) * 100) / 100} econ` : null);

  return {
    motm: motm ? { name: motm.name, statLine: buildReason(motm.name) } : null,
    mvp: mvp ? { name: mvp.name, statLine: buildReason(mvp.name) } : null,
    bestBatter: bestBatter ? { name: bestBatter.name, statLine: line(bestBatter) } : null,
    bestBowler: bestBowler ? { name: bestBowler.name, statLine: bowlLine(bestBowler) } : null,
    highestStrikeRate: highestStrikeRate
      ? { name: highestStrikeRate.name, statLine: `SR: ${Math.round((highestStrikeRate.runs / highestStrikeRate.ballsFaced) * 1000) / 10}` }
      : null,
    bestEconomy: bestEconomy
      ? { name: bestEconomy.name, statLine: `Econ: ${Math.round((bestEconomy.runsConceded / (bestEconomy.legalBalls / 6)) * 100) / 100}` }
      : null,
    bestFielder: bestFielder ? { name: bestFielder[0], statLine: `${bestFielder[1]} dismissal${bestFielder[1] === 1 ? '' : 's'} involved` } : null,
  };
}

// Builds the MOTM certificate and emails the full scorecard to whoever
// created the match. Fire-and-forget from the caller's perspective — a
// mailing hiccup should never break the scoring response.
async function notifyMatchCreatorByEmail(match) {
  const motm = match.awards?.motm;
  let certificateBase64 = null;

  if (motm) {
    try {
      const pdfBuffer = await generateMotmCertificate({
        playerName: motm.name,
        teamAName: match.teamA.name,
        teamBName: match.teamB.name,
        statLine: motm.statLine,
        matchDate: new Date().toLocaleDateString('en-GB'),
        awardType: 'Player of the Match',
      });
      certificateBase64 = pdfBuffer.toString('base64');
    } catch (err) {
      console.error('❌ Failed to generate MOTM certificate:', err);
    }
  }

  const frontendUrl = (process.env.CLIENT_URL || 'https://poll-verse-ai-delta.vercel.app').replace(/\/$/, '');
  const matchUrl = `${frontendUrl}/gully-cricket/match/${match._id}/summary`;

  await sendMatchScorecardEmail({
    to: match.createdBy.email,
    recipientName: match.createdBy.name || match.createdBy.email,
    teamAName: match.teamA.name,
    teamBName: match.teamB.name,
    result: match.result,
    awards: match.awards,
    matchUrl,
    certificateBase64,
  });
}

// Start (or restart into) an innings: sets opening striker/non-striker/bowler.
router.post('/matches/:id/start-innings', requireAuth, async (req, res) => {
  try {
    const { strikerName, nonStrikerName, bowlerName } = req.body;
    if (!strikerName || !nonStrikerName || !bowlerName) {
      return res.status(400).json({ message: 'Striker, non-striker, and bowler are all required.' });
    }
    if (strikerName === nonStrikerName) {
      return res.status(400).json({ message: 'Striker and non-striker must be different players.' });
    }

    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    if (match.status === 'completed') return res.status(400).json({ message: 'This match has already finished.' });

    const inningsCount = match.innings.length;
    if (inningsCount >= 2) {
      return res.status(400).json({ message: 'Both innings are already underway.' });
    }
    if (inningsCount === 1 && !match.innings[0].isComplete) {
      return res.status(400).json({ message: 'The first innings is still in progress.' });
    }

    const battingTeamKey = inningsCount === 0 ? match.battingTeam : match.bowlingTeam;
    const bowlingTeamKey = battingTeamKey === 'teamA' ? 'teamB' : 'teamA';

    const newInnings = {
      battingTeam: battingTeamKey,
      bowlingTeam: bowlingTeamKey,
      balls: [],
      current: {
        striker: strikerName,
        nonStriker: nonStrikerName,
        bowler: bowlerName,
        legalBallsThisOver: 0,
        oversCompleted: 0,
      },
      isComplete: false,
      target: inningsCount === 1 ? match.firstInningsScore + 1 : null,
    };

    match.innings.push(newInnings);
    match.status = 'live';
    match.markModified('innings');
    await match.save();

    res.status(201).json({ match, innings: match.innings.map((inn) => buildInningsSummary(match, inn)) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Record a single delivery and advance match state.
router.post('/matches/:id/ball', requireAuth, async (req, res) => {
  try {
    const {
      runs = 0,
      extraType = null, // 'wide' | 'noball' | 'bye' | 'legbye' | null
      isWicket = false,
      wicketType = null,
      outBatsmanName = null,
      fielderName = null, // who took the catch / ran them out / stumped them
      shotDirection = null, // optional wagon-wheel direction, e.g. 'Cover Drive'
      newBatsmanName = null, // required alongside isWicket if the innings continues
      newBowlerName = null, // required when a new over is starting
    } = req.body;

    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    const innings = match.innings[match.innings.length - 1];
    if (!innings || innings.isComplete) {
      return res.status(400).json({ message: 'Start an innings before scoring balls.' });
    }

    const cur = innings.current;
    const legal = !['wide', 'noball'].includes(extraType);

    // A fresh over needs a bowler pick before the first ball can be recorded.
    if (cur.legalBallsThisOver === 0 && innings.balls.length > 0) {
      if (newBowlerName) cur.bowler = newBowlerName;
      else if (!cur.bowler) return res.status(400).json({ message: 'Select the bowler for this over.' });
    } else if (newBowlerName) {
      cur.bowler = newBowlerName;
    }

    if (isWicket && !newBatsmanName) {
      const battingPlayers = match[innings.battingTeam].players;
      const alreadyBatted = new Set(innings.balls.map((b) => b.striker).concat(innings.balls.map((b) => b.nonStriker)));
      const wicketsSoFar = innings.balls.filter((b) => b.isWicket).length + 1;
      if (wicketsSoFar < battingPlayers.length - 1) {
        return res.status(400).json({ message: 'Select the new batsman coming in.' });
      }
    }

    const ball = {
      overNumber: cur.oversCompleted,
      ballInOver: legal ? cur.legalBallsThisOver + 1 : cur.legalBallsThisOver,
      striker: cur.striker,
      nonStriker: cur.nonStriker,
      bowler: cur.bowler,
      runs,
      extraType,
      isWicket,
      wicketType: isWicket ? wicketType || 'out' : null,
      outBatsman: isWicket ? outBatsmanName || cur.striker : null,
      fielder: isWicket ? fielderName || null : null,
      shotDirection: !isWicket && !extraType && runs > 0 ? shotDirection || null : null,
      timestamp: new Date(),
    };
    innings.balls.push(ball);

    if (legal) cur.legalBallsThisOver += 1;

    // Strike rotation for runs actually run between the wickets.
    const runsForRotation = extraType === 'bye' || extraType === 'legbye' ? runs : extraType === 'wide' ? 0 : runs;
    if (runsForRotation % 2 === 1) {
      [cur.striker, cur.nonStriker] = [cur.nonStriker, cur.striker];
    }

    // Wicket: bring in the new batsman (unless the innings just ended).
    if (isWicket && newBatsmanName) {
      if ((ball.outBatsman || cur.striker) === cur.striker) {
        cur.striker = newBatsmanName;
      } else {
        cur.nonStriker = newBatsmanName;
      }
    }

    // Over complete — rotate strike again (batsmen cross for the new over)
    // and clear the bowler so the next call must supply one.
    if (cur.legalBallsThisOver >= 6) {
      cur.legalBallsThisOver = 0;
      cur.oversCompleted += 1;
      [cur.striker, cur.nonStriker] = [cur.nonStriker, cur.striker];
      cur.bowler = null;
    }

    // Work out if the innings (and maybe the match) is now over.
    const battingPlayers = match[innings.battingTeam].players;
    const wicketsDown = innings.balls.filter((b) => b.isWicket).length;
    const summary = buildInningsSummary(match, innings);

    let inningsJustEnded = false;
    if (wicketsDown >= battingPlayers.length - 1) inningsJustEnded = true;
    if (cur.oversCompleted >= match.overs) inningsJustEnded = true;
    if (innings.target && summary.totalRuns >= innings.target) inningsJustEnded = true;

    if (inningsJustEnded) {
      innings.isComplete = true;

      if (match.innings.length === 1) {
        match.firstInningsScore = summary.totalRuns;
      } else {
        // Second innings just wrapped up — decide the result.
        match.status = 'completed';
        const target = innings.target;
        if (summary.totalRuns >= target) {
          const wicketsInHand = battingPlayers.length - 1 - wicketsDown;
          match.result = `${match[innings.battingTeam].name} won by ${wicketsInHand} wicket${wicketsInHand === 1 ? '' : 's'}`;
        } else if (summary.totalRuns === target - 1) {
          match.result = 'Match tied';
        } else {
          const margin = match.firstInningsScore - summary.totalRuns;
          match.result = `${match[innings.bowlingTeam].name} won by ${margin} run${margin === 1 ? '' : 's'}`;
        }

        const finalSummaries = match.innings.map((inn) => buildInningsSummary(match, inn));
        match.awards = computeAwards(match, finalSummaries);
      }
    }

    match.markModified('innings');
    await match.save();

    if (match.status === 'completed') {
      notifyMatchCreatorByEmail(match).catch((err) => {
        console.error('❌ Failed to send match scorecard email:', err);
      });
    }

    res.json({
      match,
      innings: match.innings.map((inn) => buildInningsSummary(match, inn)),
      inningsJustEnded,
      matchComplete: match.status === 'completed',
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Full match summary: both innings' scorecards, partnerships, run-rate data,
// and awards (recomputed live if the match hasn't finished yet).
router.get('/matches/:id/summary', async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    const innings = match.innings.map((inn) => ({
      ...buildInningsSummary(match, inn),
      partnerships: computePartnerships(inn),
      runRate: computeRunRate(inn),
      commentary: buildCommentaryFeed(inn),
      teamName: match[inn.battingTeam].name,
    }));

    const awards = match.awards || (match.status === 'completed' ? computeAwards(match, innings) : null);

    res.json({ match, innings, awards });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Career stats for a player, aggregated by exact name match across every
// completed match they appear in. Gully cricket players aren't app accounts,
// so name is the only identifier we have — duplicate/misspelled names will
// show up as different players.
router.get('/players/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const matches = await Match.find({
      status: 'completed',
      $or: [{ 'teamA.players': name }, { 'teamB.players': name }],
    });

    if (matches.length === 0) {
      return res.json({
        name,
        matchesPlayed: 0,
        totalRuns: 0,
        highestScore: 0,
        average: 0,
        strikeRate: 0,
        fifties: 0,
        wickets: 0,
        motmAwards: 0,
        mvpAwards: 0,
      });
    }

    let totalRuns = 0;
    let totalBallsFaced = 0;
    let timesOut = 0;
    let highestScore = 0;
    let fifties = 0;
    let totalWickets = 0;
    let motmAwards = 0;
    let mvpAwards = 0;

    matches.forEach((match) => {
      const summaries = match.innings.map((inn) => buildInningsSummary(match, inn));
      summaries.forEach((inn) => {
        const batEntry = inn.battingCard.find((b) => b.name === name);
        if (batEntry && (batEntry.ballsFaced > 0 || batEntry.isOut)) {
          totalRuns += batEntry.runs;
          totalBallsFaced += batEntry.ballsFaced;
          if (batEntry.isOut) timesOut += 1;
          if (batEntry.runs > highestScore) highestScore = batEntry.runs;
          if (batEntry.runs >= 50) fifties += 1;
        }
        const bowlEntry = inn.bowlingCard.find((b) => b.name === name);
        if (bowlEntry) totalWickets += bowlEntry.wickets;
      });
      if (match.awards?.motm?.name === name) motmAwards += 1;
      if (match.awards?.mvp?.name === name) mvpAwards += 1;
    });

    res.json({
      name,
      matchesPlayed: matches.length,
      totalRuns,
      highestScore,
      average: timesOut > 0 ? Math.round((totalRuns / timesOut) * 10) / 10 : totalRuns,
      strikeRate: totalBallsFaced > 0 ? Math.round((totalRuns / totalBallsFaced) * 1000) / 10 : 0,
      fifties,
      wickets: totalWickets,
      motmAwards,
      mvpAwards,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;