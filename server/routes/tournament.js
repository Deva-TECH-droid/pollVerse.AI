const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      name, startDate, endDate, numberOfTeams, oversPerMatch, format,
      venue, ballType, playersPerTeam, logo, organizerName, description,
      rules, registrationDeadline,
    } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: 'Tournament name is required.' });
    if (!startDate || !endDate) return res.status(400).json({ message: 'Start and end dates are required.' });
    if (new Date(endDate) <= new Date(startDate)) return res.status(400).json({ message: 'End date must be after the start date.' });
    if (!numberOfTeams || numberOfTeams < 2) return res.status(400).json({ message: 'At least 2 teams are required.' });
    if (!oversPerMatch || oversPerMatch < 1) return res.status(400).json({ message: 'Overs per match is required.' });

    const tournament = await Tournament.create({
      name: name.trim(),
      startDate,
      endDate,
      numberOfTeams,
      oversPerMatch,
      format: format || 'league_playoffs',
      venue: venue || '',
      ballType: ballType || '',
      playersPerTeam: playersPerTeam || 8,
      logo: logo || '',
      organizerName: organizerName || '',
      description: description || '',
      rules: rules || '',
      registrationDeadline: registrationDeadline || null,
      createdBy: {
        userId: req.user._id,
        email: req.user.email,
        name: req.user.name || req.user.email,
      },
    });

    res.status(201).json(tournament);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const tournaments = await Tournament.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    const pointsTable = tournament.status !== 'setup' ? await computePointsTable(tournament) : [];
    res.json({ ...tournament.toObject(), pointsTable });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add one team at a time — called repeatedly by the frontend until
// tournament.numberOfTeams is reached.
router.post('/:id/teams', requireAuth, async (req, res) => {
  try {
    const { name, captain, viceCaptain, players, logo } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: 'Team name is required.' });
    if (!Array.isArray(players) || players.length < 2) {
      return res.status(400).json({ message: 'A team needs at least 2 players.' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
    if (tournament.status !== 'setup') return res.status(400).json({ message: 'Teams can only be added while the tournament is in setup.' });
    if (tournament.teams.length >= tournament.numberOfTeams) {
      return res.status(400).json({ message: `This tournament already has all ${tournament.numberOfTeams} teams.` });
    }
    if (tournament.teams.some((t) => t.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(400).json({ message: 'A team with this name already exists in this tournament.' });
    }

    tournament.teams.push({
      name: name.trim(),
      captain: captain || '',
      viceCaptain: viceCaptain || '',
      logo: logo || '',
      players: players.map((p) => ({
        name: (typeof p === 'string' ? p : p.name || '').trim(),
        role: typeof p === 'object' ? p.role || '' : '',
        battingStyle: typeof p === 'object' ? p.battingStyle || '' : '',
        bowlingStyle: typeof p === 'object' ? p.bowlingStyle || '' : '',
        jerseyNumber: typeof p === 'object' ? p.jerseyNumber || null : null,
      })),
    });

    await tournament.save();
    res.status(201).json(tournament);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/:id/teams/:teamName', requireAuth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
    if (tournament.status !== 'setup') return res.status(400).json({ message: 'Teams can only be removed during setup.' });

    tournament.teams = tournament.teams.filter((t) => t.name !== req.params.teamName);
    await tournament.save();
    res.json(tournament);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Round-robin fixture generation — the "circle method". This is a plain
// deterministic algorithm, not AI: every team is guaranteed to play every
// other team exactly once, with no repeats and no double-booking within a
// round. AI's job (a later phase) is to explain/present this schedule, not
// to decide it.
// ---------------------------------------------------------------------------
function generateRoundRobinRounds(teamNames) {
  let teams = [...teamNames];
  const hasBye = teams.length % 2 !== 0;
  if (hasBye) teams.push('__BYE__');

  const n = teams.length;
  const half = n / 2;
  const rounds = [];
  let arr = teams.slice();

  for (let round = 0; round < n - 1; round++) {
    const roundMatches = [];
    for (let i = 0; i < half; i++) {
      const teamA = arr[i];
      const teamB = arr[n - 1 - i];
      if (teamA !== '__BYE__' && teamB !== '__BYE__') {
        roundMatches.push({ teamA, teamB });
      }
    }
    rounds.push(roundMatches);

    // Rotate everyone except the first team fixed in place.
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr = [fixed, ...rest];
  }

  return rounds;
}

router.post('/:id/generate-fixtures', requireAuth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    if (tournament.teams.length !== tournament.numberOfTeams) {
      return res.status(400).json({
        message: `Add all ${tournament.numberOfTeams} teams before generating fixtures (currently ${tournament.teams.length}).`,
      });
    }
    if (tournament.fixtures.length > 0) {
      return res.status(400).json({ message: 'Fixtures have already been generated for this tournament.' });
    }

    const teamNames = tournament.teams.map((t) => t.name);
    const rounds = generateRoundRobinRounds(teamNames);
    const allMatches = rounds.flat();

    // Spread matches evenly across the tournament's date range.
    const start = new Date(tournament.startDate);
    const end = new Date(tournament.endDate);
    const totalDays = Math.max(Math.floor((end - start) / (1000 * 60 * 60 * 24)), 1);

    const fixtures = allMatches.map((m, i) => {
      const dayOffset = allMatches.length > 1 ? Math.round((i / (allMatches.length - 1)) * totalDays) : 0;
      const scheduledDate = new Date(start.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      // Figure out which round this match belongs to, for display grouping.
      let roundIndex = 0;
      let counted = 0;
      for (let r = 0; r < rounds.length; r++) {
        if (i < counted + rounds[r].length) {
          roundIndex = r;
          break;
        }
        counted += rounds[r].length;
      }
      return {
        matchNumber: i + 1,
        round: roundIndex + 1,
        teamAName: m.teamA,
        teamBName: m.teamB,
        scheduledDate,
        stage: 'league',
        status: 'scheduled',
      };
    });

    tournament.fixtures = fixtures;
    tournament.status = 'league';
    await tournament.save();

    res.status(201).json(tournament);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Start a fixture — creates the real Match document (reusing the whole
// existing scoring engine) and links it back to this fixture.
// ---------------------------------------------------------------------------
router.post('/:id/fixtures/:matchNumber/start', requireAuth, async (req, res) => {
  try {
    const { tossWonBy, tossDecision } = req.body;
    if (!['teamA', 'teamB'].includes(tossWonBy)) {
      return res.status(400).json({ message: 'tossWonBy must be teamA or teamB.' });
    }
    if (!['bat', 'bowl'].includes(tossDecision)) {
      return res.status(400).json({ message: 'tossDecision must be bat or bowl.' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    const fixture = tournament.fixtures.find((f) => f.matchNumber === Number(req.params.matchNumber));
    if (!fixture) return res.status(404).json({ message: 'Fixture not found' });
    if (fixture.matchId) return res.status(400).json({ message: 'This fixture has already been started.' });
    if (fixture.teamAName.startsWith('TBD') || fixture.teamBName.startsWith('TBD')) {
      return res.status(400).json({ message: 'Both teams for this fixture are not decided yet.' });
    }

    const teamA = tournament.teams.find((t) => t.name === fixture.teamAName);
    const teamB = tournament.teams.find((t) => t.name === fixture.teamBName);
    if (!teamA || !teamB) return res.status(400).json({ message: 'Could not find both teams for this fixture.' });

    const winner = tossWonBy;
    const loser = tossWonBy === 'teamA' ? 'teamB' : 'teamA';
    const battingTeam = tossDecision === 'bat' ? winner : loser;
    const bowlingTeam = battingTeam === 'teamA' ? 'teamB' : 'teamA';

    const match = await Match.create({
      teamA: { name: teamA.name, players: teamA.players.map((p) => p.name) },
      teamB: { name: teamB.name, players: teamB.players.map((p) => p.name) },
      overs: tournament.oversPerMatch,
      tossWonBy,
      tossDecision,
      battingTeam,
      bowlingTeam,
      tournamentId: tournament._id,
      tournamentMatchNumber: fixture.matchNumber,
      createdBy: {
        userId: req.user._id,
        email: req.user.email,
        name: req.user.name || req.user.email,
      },
    });

    fixture.matchId = match._id;
    fixture.status = 'live';
    await tournament.save();

    res.status(201).json({ tournament, matchId: match._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Points table — computed on demand from completed league-stage fixtures,
// never stored, so it can never drift out of sync with the underlying
// matches.
// ---------------------------------------------------------------------------
function getInningsTotals(innings) {
  let totalRuns = 0;
  let legalBalls = 0;
  innings.balls.forEach((b) => {
    const teamRuns = b.extraType === 'wide' || b.extraType === 'noball' ? 1 + (b.runs || 0) : b.runs || 0;
    totalRuns += teamRuns;
    if (!['wide', 'noball'].includes(b.extraType)) legalBalls += 1;
  });
  return { totalRuns, legalBalls };
}

async function computePointsTable(tournament) {
  const leagueFixtures = tournament.fixtures.filter((f) => f.stage === 'league' && f.status === 'completed' && f.matchId);
  const matchIds = leagueFixtures.map((f) => f.matchId);
  const matches = await Match.find({ _id: { $in: matchIds } });
  const matchById = new Map(matches.map((m) => [String(m._id), m]));

  const stats = {};
  tournament.teams.forEach((t) => {
    stats[t.name] = { name: t.name, played: 0, won: 0, lost: 0, tied: 0, points: 0, runsFor: 0, oversFor: 0, runsAgainst: 0, oversAgainst: 0 };
  });

  leagueFixtures.forEach((f) => {
    const match = matchById.get(String(f.matchId));
    if (!match || match.status !== 'completed') return;

    const teamAName = match.teamA.name;
    const teamBName = match.teamB.name;
    if (!stats[teamAName] || !stats[teamBName]) return;

    stats[teamAName].played += 1;
    stats[teamBName].played += 1;

    if (match.winner === 'tie') {
      stats[teamAName].tied += 1;
      stats[teamBName].tied += 1;
      stats[teamAName].points += 1;
      stats[teamBName].points += 1;
    } else if (match.winner === 'teamA' || match.winner === 'teamB') {
      const winnerName = match[match.winner].name;
      const loserName = match[match.winner === 'teamA' ? 'teamB' : 'teamA'].name;
      if (stats[winnerName]) {
        stats[winnerName].won += 1;
        stats[winnerName].points += 2;
      }
      if (stats[loserName]) stats[loserName].lost += 1;
    }

    // NRR bookkeeping — a team all out uses the FULL allotted overs (not
    // just the overs they actually faced), per standard NRR convention.
    match.innings.forEach((inn) => {
      const totals = getInningsTotals(inn);
      const battingTeamName = match[inn.battingTeam].name;
      const bowlingTeamName = match[inn.bowlingTeam].name;
      const battingPlayers = match[inn.battingTeam].players.length;
      const wicketsDown = inn.balls.filter((b) => b.isWicket).length;
      const wasAllOut = wicketsDown >= battingPlayers - 1;
      const oversUsed = wasAllOut ? match.overs : totals.legalBalls / 6;

      if (stats[battingTeamName]) {
        stats[battingTeamName].runsFor += totals.totalRuns;
        stats[battingTeamName].oversFor += oversUsed;
      }
      if (stats[bowlingTeamName]) {
        stats[bowlingTeamName].runsAgainst += totals.totalRuns;
        stats[bowlingTeamName].oversAgainst += oversUsed;
      }
    });
  });

  const table = Object.values(stats).map((t) => {
    const nrr =
      t.oversFor > 0 && t.oversAgainst > 0
        ? Math.round((t.runsFor / t.oversFor - t.runsAgainst / t.oversAgainst) * 100) / 100
        : 0;
    return { ...t, nrr };
  });

  table.sort((a, b) => b.points - a.points || b.nrr - a.nrr);
  return table;
}

router.get('/:id/points-table', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
    const table = await computePointsTable(tournament);
    res.json(table);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Playoffs — IPL-style: Qualifier 1 (#1 v #2), Eliminator (#3 v #4),
// Qualifier 2 (loser Q1 v winner Eliminator), Final (winner Q1 v winner Q2).
// The bracket structure itself is fixed logic, not AI-decided.
// ---------------------------------------------------------------------------
function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

router.post('/:id/generate-playoffs', requireAuth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
    if (tournament.status !== 'league') return res.status(400).json({ message: 'Playoffs can only be generated from the league stage.' });

    const leagueFixtures = tournament.fixtures.filter((f) => f.stage === 'league');
    const allCompleted = leagueFixtures.every((f) => f.status === 'completed');
    if (!allCompleted) return res.status(400).json({ message: 'All league matches must be completed first.' });

    const table = await computePointsTable(tournament);
    if (table.length < 4) return res.status(400).json({ message: 'Need at least 4 teams to generate playoffs.' });
    const [t1, t2, t3, t4] = table;

    const base = leagueFixtures.length
      ? Math.max(...leagueFixtures.map((f) => new Date(f.scheduledDate).getTime()))
      : Date.now();
    const baseDate = new Date(base);
    const nextMatchNumber = Math.max(...tournament.fixtures.map((f) => f.matchNumber), 0) + 1;

    tournament.fixtures.push(
      { matchNumber: nextMatchNumber, round: 0, teamAName: t1.name, teamBName: t2.name, scheduledDate: addDays(baseDate, 2), stage: 'qualifier1', status: 'scheduled' },
      { matchNumber: nextMatchNumber + 1, round: 0, teamAName: t3.name, teamBName: t4.name, scheduledDate: addDays(baseDate, 2), stage: 'eliminator', status: 'scheduled' },
      { matchNumber: nextMatchNumber + 2, round: 0, teamAName: 'TBD (Loser Qualifier 1)', teamBName: 'TBD (Winner Eliminator)', scheduledDate: addDays(baseDate, 4), stage: 'qualifier2', status: 'scheduled' },
      { matchNumber: nextMatchNumber + 3, round: 0, teamAName: 'TBD (Winner Qualifier 1)', teamBName: 'TBD (Winner Qualifier 2)', scheduledDate: addDays(baseDate, 6), stage: 'final', status: 'scheduled' }
    );

    tournament.status = 'playoffs';
    await tournament.save();

    res.status(201).json(tournament);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Player stats aggregated across every completed match in this tournament.
// ---------------------------------------------------------------------------
function computeMatchPlayerContributions(match) {
  const batting = {};
  const bowling = {};
  const fielding = {};

  const ensureBat = (name) => (batting[name] = batting[name] || { name, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isOut: false });
  const ensureBowl = (name) => (bowling[name] = bowling[name] || { name, wickets: 0, runsConceded: 0, legalBalls: 0 });

  match.innings.forEach((inn) => {
    inn.balls.forEach((b) => {
      const legal = !['wide', 'noball'].includes(b.extraType);
      const batsmanRuns = !b.extraType || b.extraType === 'noball' ? b.runs || 0 : 0;
      const teamRuns = b.extraType === 'wide' || b.extraType === 'noball' ? 1 + (b.runs || 0) : b.runs || 0;
      const runsAgainstBowler = b.extraType === 'bye' || b.extraType === 'legbye' ? 0 : teamRuns;

      const striker = ensureBat(b.striker);
      if (legal) striker.ballsFaced += 1;
      if (!b.extraType || b.extraType === 'noball') {
        striker.runs += batsmanRuns;
        if (batsmanRuns === 4) striker.fours += 1;
        if (batsmanRuns === 6) striker.sixes += 1;
      }

      const bowler = ensureBowl(b.bowler);
      if (legal) bowler.legalBalls += 1;
      bowler.runsConceded += runsAgainstBowler;

      if (b.isWicket) {
        const outName = b.outBatsman || b.striker;
        ensureBat(outName).isOut = true;
        if (b.wicketType !== 'run out') bowler.wickets += 1;
        if (b.fielder && ['caught', 'run out', 'stumped'].includes(b.wicketType)) {
          fielding[b.fielder] = (fielding[b.fielder] || 0) + 1;
        }
      }
    });
  });

  return { batting, bowling, fielding };
}

router.get('/:id/player-stats', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    const completedFixtures = tournament.fixtures.filter((f) => f.status === 'completed' && f.matchId);
    const matches = await Match.find({ _id: { $in: completedFixtures.map((f) => f.matchId) } });

    const battingTotals = {};
    const bowlingTotals = {};
    const fieldingTotals = {};

    matches.forEach((match) => {
      const { batting, bowling, fielding } = computeMatchPlayerContributions(match);
      Object.values(batting).forEach((b) => {
        const t = (battingTotals[b.name] = battingTotals[b.name] || { name: b.name, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, innings: 0, outs: 0, fifties: 0, hundreds: 0, highestScore: 0 });
        if (b.ballsFaced > 0 || b.isOut) {
          t.runs += b.runs;
          t.ballsFaced += b.ballsFaced;
          t.fours += b.fours;
          t.sixes += b.sixes;
          t.innings += 1;
          if (b.isOut) t.outs += 1;
          if (b.runs >= 50 && b.runs < 100) t.fifties += 1;
          if (b.runs >= 100) t.hundreds += 1;
          if (b.runs > t.highestScore) t.highestScore = b.runs;
        }
      });
      Object.values(bowling).forEach((b) => {
        const t = (bowlingTotals[b.name] = bowlingTotals[b.name] || { name: b.name, wickets: 0, runsConceded: 0, legalBalls: 0 });
        t.wickets += b.wickets;
        t.runsConceded += b.runsConceded;
        t.legalBalls += b.legalBalls;
      });
      Object.entries(fielding).forEach(([name, count]) => {
        fieldingTotals[name] = (fieldingTotals[name] || 0) + count;
      });
    });

    const batters = Object.values(battingTotals).map((b) => ({
      ...b,
      average: b.outs > 0 ? Math.round((b.runs / b.outs) * 10) / 10 : b.runs,
      strikeRate: b.ballsFaced > 0 ? Math.round((b.runs / b.ballsFaced) * 1000) / 10 : 0,
    }));
    const bowlers = Object.values(bowlingTotals).map((b) => ({
      ...b,
      economy: b.legalBalls > 0 ? Math.round((b.runsConceded / (b.legalBalls / 6)) * 100) / 100 : 0,
    }));

    const top = (arr, key, n = 5) => [...arr].sort((a, b) => b[key] - a[key]).slice(0, n);

    res.json({
      mostRuns: top(batters, 'runs'),
      mostWickets: top(bowlers, 'wickets'),
      bestStrikeRate: top(batters.filter((b) => b.ballsFaced >= 6), 'strikeRate'),
      bestEconomy: [...bowlers.filter((b) => b.legalBalls >= 6)].sort((a, b) => a.economy - b.economy).slice(0, 5),
      mostSixes: top(batters, 'sixes'),
      mostFours: top(batters, 'fours'),
      most50s: top(batters, 'fifties'),
      most100s: top(batters, 'hundreds'),
      mostCatches: Object.entries(fieldingTotals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Player of the Tournament — same "algorithm decides, text explains" split
// as everywhere else. Computed once the final is played.
// ---------------------------------------------------------------------------
async function computePlayerOfTournament(tournament) {
  const completedFixtures = tournament.fixtures.filter((f) => f.status === 'completed' && f.matchId);
  const matches = await Match.find({ _id: { $in: completedFixtures.map((f) => f.matchId) } });

  const battingTotals = {};
  const bowlingTotals = {};
  const fieldingTotals = {};
  const matchesPlayedBy = {};

  matches.forEach((match) => {
    const { batting, bowling, fielding } = computeMatchPlayerContributions(match);
    const playedThisMatch = new Set();
    Object.values(batting).forEach((b) => {
      if (b.ballsFaced === 0 && !b.isOut) return;
      playedThisMatch.add(b.name);
      const t = (battingTotals[b.name] = battingTotals[b.name] || { name: b.name, runs: 0, ballsFaced: 0, fours: 0, sixes: 0 });
      t.runs += b.runs;
      t.ballsFaced += b.ballsFaced;
      t.fours += b.fours;
      t.sixes += b.sixes;
    });
    Object.values(bowling).forEach((b) => {
      if (b.legalBalls === 0) return;
      playedThisMatch.add(b.name);
      const t = (bowlingTotals[b.name] = bowlingTotals[b.name] || { name: b.name, wickets: 0, runsConceded: 0, legalBalls: 0 });
      t.wickets += b.wickets;
      t.runsConceded += b.runsConceded;
      t.legalBalls += b.legalBalls;
    });
    Object.entries(fielding).forEach(([name, count]) => {
      fieldingTotals[name] = (fieldingTotals[name] || 0) + count;
    });
    playedThisMatch.forEach((name) => {
      matchesPlayedBy[name] = (matchesPlayedBy[name] || 0) + 1;
    });
  });

  const allNames = new Set([...Object.keys(battingTotals), ...Object.keys(bowlingTotals)]);
  if (allNames.size === 0) return null;

  const impact = [...allNames].map((name) => {
    const bat = battingTotals[name];
    const bowl = bowlingTotals[name];
    const catches = fieldingTotals[name] || 0;
    const battingImpact = bat ? bat.runs + bat.fours * 1 + bat.sixes * 2 : 0;
    const bowlingImpact = bowl ? bowl.wickets * 20 - (bowl.legalBalls > 0 ? (bowl.runsConceded / (bowl.legalBalls / 6)) * 2 : 0) : 0;
    const fieldingImpact = catches * 10;
    return { name, score: battingImpact + bowlingImpact + fieldingImpact };
  });

  const winner = impact.reduce((a, b) => (b.score > a.score ? b : a));
  const bat = battingTotals[winner.name];
  const bowl = bowlingTotals[winner.name];

  const explanationParts = [];
  if (bat && bat.runs > 0) explanationParts.push(`consistent batting (${bat.runs} runs)`);
  if (bowl && bowl.wickets > 0) explanationParts.push(`sharp bowling (${bowl.wickets} wickets)`);
  if (fieldingTotals[winner.name]) explanationParts.push(`${fieldingTotals[winner.name]} catches in the field`);

  const explanation = explanationParts.length
    ? `${winner.name} was selected as Player of the Tournament for ${explanationParts.join(', ')} across ${matchesPlayedBy[winner.name] || 0} matches — the standout all-round contribution of the tournament.`
    : `${winner.name} was selected as Player of the Tournament for the most impactful contributions across the competition.`;

  return {
    name: winner.name,
    matches: matchesPlayedBy[winner.name] || 0,
    runs: bat?.runs || 0,
    average: bat && bat.ballsFaced > 0 ? Math.round((bat.runs / Math.max(matchesPlayedBy[winner.name], 1)) * 10) / 10 : 0,
    strikeRate: bat && bat.ballsFaced > 0 ? Math.round((bat.runs / bat.ballsFaced) * 1000) / 10 : 0,
    fifties: 0,
    sixes: bat?.sixes || 0,
    wickets: bowl?.wickets || 0,
    economy: bowl && bowl.legalBalls > 0 ? Math.round((bowl.runsConceded / (bowl.legalBalls / 6)) * 100) / 100 : 0,
    explanation,
  };
}

// ---------------------------------------------------------------------------
// Called from routes/gullyCricket.js whenever a tournament-linked match
// finishes. Marks the fixture complete and, for playoff stages, resolves
// the bracket (advances the winner/loser into the next fixture) — pure
// lookup logic, not AI.
// ---------------------------------------------------------------------------
async function onTournamentMatchCompleted(match) {
  const tournament = await Tournament.findById(match.tournamentId);
  if (!tournament) return;

  const fixture = tournament.fixtures.find((f) => f.matchNumber === match.tournamentMatchNumber);
  if (!fixture) return;

  fixture.status = 'completed';

  // Playoffs must produce a decisive winner — a tie here means a rematch,
  // not a shared result. League-stage ties are fine as-is (points table
  // already awards 1 point each).
  if (match.winner === 'tie' && fixture.stage !== 'league') {
    const nextMatchNumber = Math.max(...tournament.fixtures.map((f) => f.matchNumber)) + 1;
    tournament.fixtures.push({
      matchNumber: nextMatchNumber,
      round: fixture.round,
      teamAName: fixture.teamAName,
      teamBName: fixture.teamBName,
      scheduledDate: addDays(new Date(fixture.scheduledDate), 1),
      stage: fixture.stage,
      status: 'scheduled',
    });
    await tournament.save();
    return;
  }

  const winnerName = match.winner === 'tie' ? null : match[match.winner]?.name;
  const loserName = match.winner === 'tie' ? null : match[match.winner === 'teamA' ? 'teamB' : 'teamA']?.name;

  if (fixture.stage === 'qualifier1' && winnerName) {
    const final = tournament.fixtures.find((f) => f.stage === 'final');
    const qualifier2 = tournament.fixtures.find((f) => f.stage === 'qualifier2');
    if (final) final.teamAName = winnerName;
    if (qualifier2 && loserName) qualifier2.teamAName = loserName;
  } else if (fixture.stage === 'eliminator' && winnerName) {
    const qualifier2 = tournament.fixtures.find((f) => f.stage === 'qualifier2');
    if (qualifier2) qualifier2.teamBName = winnerName;
  } else if (fixture.stage === 'qualifier2' && winnerName) {
    const final = tournament.fixtures.find((f) => f.stage === 'final');
    if (final) final.teamBName = winnerName;
  } else if (fixture.stage === 'final' && winnerName) {
    tournament.status = 'completed';
    tournament.winningTeam = winnerName;
    try {
      tournament.playerOfTournament = await computePlayerOfTournament(tournament);
    } catch (err) {
      console.error('❌ Failed to compute Player of the Tournament:', err);
    }
  }

  await tournament.save();
}

// Manual backup for scheduling a rematch — in case the automatic tie-detection
// hook (in onTournamentMatchCompleted) missed it for any reason. Only valid
// for a completed, non-league fixture.
router.post('/:id/fixtures/:matchNumber/rematch', requireAuth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    const fixture = tournament.fixtures.find((f) => f.matchNumber === Number(req.params.matchNumber));
    if (!fixture) return res.status(404).json({ message: 'Fixture not found' });
    if (fixture.stage === 'league') return res.status(400).json({ message: 'League ties don\'t need a rematch — they stay as a tie in the points table.' });
    if (fixture.status !== 'completed') return res.status(400).json({ message: 'This fixture isn\'t completed yet.' });

    // If a rematch for this exact pairing/stage already exists and is still
    // pending, don't create a duplicate.
    const alreadyHasPendingRematch = tournament.fixtures.some(
      (f) =>
        f.stage === fixture.stage &&
        f.matchNumber !== fixture.matchNumber &&
        f.teamAName === fixture.teamAName &&
        f.teamBName === fixture.teamBName &&
        f.status !== 'completed'
    );
    if (alreadyHasPendingRematch) {
      return res.status(400).json({ message: 'A rematch for this fixture is already scheduled.' });
    }

    const nextMatchNumber = Math.max(...tournament.fixtures.map((f) => f.matchNumber)) + 1;
    tournament.fixtures.push({
      matchNumber: nextMatchNumber,
      round: fixture.round,
      teamAName: fixture.teamAName,
      teamBName: fixture.teamBName,
      scheduledDate: addDays(new Date(fixture.scheduledDate), 1),
      stage: fixture.stage,
      status: 'scheduled',
    });

    await tournament.save();
    res.status(201).json(tournament);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Team-level stats (Best Batting/Bowling/Catching/Economical Team) plus
// every individual player's stats for a given team — used by the tournament
// celebration screen. Attributes each player's contributions to their team
// via the tournament's own roster, so it works off the same completed
// matches everything else uses.
// ---------------------------------------------------------------------------
async function computeTeamAndPlayerStats(tournament) {
  const completedFixtures = tournament.fixtures.filter((f) => f.status === 'completed' && f.matchId);
  const matches = await Match.find({ _id: { $in: completedFixtures.map((f) => f.matchId) } });

  const playerToTeam = {};
  tournament.teams.forEach((t) => {
    t.players.forEach((p) => {
      playerToTeam[p.name] = t.name;
    });
  });

  const teamTotals = {};
  tournament.teams.forEach((t) => {
    teamTotals[t.name] = { name: t.name, runs: 0, wickets: 0, catches: 0, runsConceded: 0, legalBalls: 0 };
  });

  const playerTotals = {}; // name -> { runs, ballsFaced, fours, sixes, wickets, runsConceded, legalBalls, catches }
  const ensurePlayer = (name) =>
    (playerTotals[name] = playerTotals[name] || { name, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, legalBalls: 0, catches: 0 });

  matches.forEach((match) => {
    const { batting, bowling, fielding } = computeMatchPlayerContributions(match);

    Object.values(batting).forEach((b) => {
      if (b.ballsFaced === 0 && !b.isOut) return;
      const p = ensurePlayer(b.name);
      p.runs += b.runs;
      p.ballsFaced += b.ballsFaced;
      p.fours += b.fours;
      p.sixes += b.sixes;
      const team = playerToTeam[b.name];
      if (team && teamTotals[team]) teamTotals[team].runs += b.runs;
    });

    Object.values(bowling).forEach((b) => {
      if (b.legalBalls === 0) return;
      const p = ensurePlayer(b.name);
      p.wickets += b.wickets;
      p.runsConceded += b.runsConceded;
      p.legalBalls += b.legalBalls;
      const team = playerToTeam[b.name];
      if (team && teamTotals[team]) {
        teamTotals[team].wickets += b.wickets;
        teamTotals[team].runsConceded += b.runsConceded;
        teamTotals[team].legalBalls += b.legalBalls;
      }
    });

    Object.entries(fielding).forEach(([name, count]) => {
      ensurePlayer(name).catches += count;
      const team = playerToTeam[name];
      if (team && teamTotals[team]) teamTotals[team].catches += count;
    });
  });

  const teamStats = Object.values(teamTotals).map((t) => ({
    ...t,
    economy: t.legalBalls > 0 ? Math.round((t.runsConceded / (t.legalBalls / 6)) * 100) / 100 : null,
  }));

  const bestBattingTeam = teamStats.length ? teamStats.reduce((a, b) => (b.runs > a.runs ? b : a)) : null;
  const bestBowlingTeam = teamStats.length ? teamStats.reduce((a, b) => (b.wickets > a.wickets ? b : a)) : null;
  const bestCatchingTeam = teamStats.length ? teamStats.reduce((a, b) => (b.catches > a.catches ? b : a)) : null;
  const economyQualified = teamStats.filter((t) => t.economy !== null);
  const bestEconomicalTeam = economyQualified.length ? economyQualified.reduce((a, b) => (b.economy < a.economy ? b : a)) : null;

  const playersWithStats = (teamName) => {
    const team = tournament.teams.find((t) => t.name === teamName);
    if (!team) return [];
    return team.players.map((p) => {
      const stats = playerTotals[p.name] || { runs: 0, ballsFaced: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, legalBalls: 0, catches: 0 };
      const oversBowled = stats.legalBalls / 6;
      return {
        name: p.name,
        runs: stats.runs,
        ballsFaced: stats.ballsFaced,
        fours: stats.fours,
        sixes: stats.sixes,
        strikeRate: stats.ballsFaced > 0 ? Math.round((stats.runs / stats.ballsFaced) * 1000) / 10 : 0,
        wickets: stats.wickets,
        oversBowled: Math.round(oversBowled * 10) / 10,
        economy: oversBowled > 0 ? Math.round((stats.runsConceded / oversBowled) * 100) / 100 : null,
        catches: stats.catches,
      };
    });
  };

  return { teamStats, bestBattingTeam, bestBowlingTeam, bestCatchingTeam, bestEconomicalTeam, playersWithStats };
}

router.get('/:id/celebration-stats', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    const { teamStats, bestBattingTeam, bestBowlingTeam, bestCatchingTeam, bestEconomicalTeam, playersWithStats } =
      await computeTeamAndPlayerStats(tournament);

    res.json({
      teamStats,
      bestBattingTeam,
      bestBowlingTeam,
      bestCatchingTeam,
      bestEconomicalTeam,
      winningTeamPlayers: tournament.winningTeam ? playersWithStats(tournament.winningTeam) : [],
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
router.onTournamentMatchCompleted = onTournamentMatchCompleted;