const Match = require('../models/Match');

/**
 * Computes real, dynamic historical records and highlights from past matches
 * for the teams and players participating in the current match.
 */
async function generateHistoricalHighlights(currentMatch) {
  const highlights = [];

  try {
    const teamAName = currentMatch.teamA?.name || '';
    const teamBName = currentMatch.teamB?.name || '';
    const teamAPlayers = (currentMatch.teamA?.players || []).map((p) => p.trim());
    const teamBPlayers = (currentMatch.teamB?.players || []).map((p) => p.trim());
    const allMatchPlayers = [...new Set([...teamAPlayers, ...teamBPlayers])];
    const playerLookup = new Set(allMatchPlayers.map((p) => p.toLowerCase()));

    // Fetch up to 100 previous completed matches
    const pastMatches = await Match.find({
      status: 'completed',
      _id: { $ne: currentMatch._id },
    }).sort({ createdAt: -1 }).limit(100);

    if (!pastMatches || pastMatches.length === 0) {
      // Return engaging inaugural records if this is the first match
      highlights.push({
        id: 'rec-inaugural-1',
        category: 'Matchday',
        badge: '⚡ Live Clash',
        title: 'Clash of Titans',
        text: `${teamAName} and ${teamBName} take the field in an intense ${currentMatch.overs}-over gully cricket showdown!`,
        player: teamAName,
        stat: `${currentMatch.overs} Overs`,
      });
      highlights.push({
        id: 'rec-inaugural-2',
        category: 'Toss',
        badge: '🪙 Toss Decision',
        title: 'Toss Decided',
        text: `${currentMatch[currentMatch.tossWonBy]?.name || 'Toss winner'} won the toss and elected to ${currentMatch.tossDecision === 'bat' ? 'bat first' : 'bowl first'}.`,
        player: currentMatch[currentMatch.tossWonBy]?.name,
        stat: currentMatch.tossDecision.toUpperCase(),
      });
      return highlights;
    }

    // Structures to record best statistics
    let fastestFifty = null;
    let highestScore = null;
    let bestBowling = null;
    const playerCareer = {}; // name -> { runs, balls, fours, sixes, wickets, runsConceded, ballsBowled, catches, motmCount, mvpTotal }
    const headToHead = { matches: 0, teamAWins: 0, teamBWins: 0 };
    let bestPartnership = null;
    let highestTeamScore = null;

    const initPlayer = (name) => {
      const key = name.toLowerCase();
      if (!playerCareer[key]) {
        playerCareer[key] = {
          name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          wickets: 0,
          runsConceded: 0,
          ballsBowled: 0,
          catches: 0,
          motmCount: 0,
          recentScores: [],
        };
      }
      return playerCareer[key];
    };

    pastMatches.forEach((m) => {
      // Check head-to-head
      const mTeamA = m.teamA?.name?.toLowerCase();
      const mTeamB = m.teamB?.name?.toLowerCase();
      const curA = teamAName.toLowerCase();
      const curB = teamBName.toLowerCase();

      if ((mTeamA === curA && mTeamB === curB) || (mTeamA === curB && mTeamB === curA)) {
        headToHead.matches += 1;
        if (m.winner === 'teamA') {
          if (mTeamA === curA) headToHead.teamAWins += 1;
          else headToHead.teamBWins += 1;
        } else if (m.winner === 'teamB') {
          if (mTeamB === curA) headToHead.teamAWins += 1;
          else headToHead.teamBWins += 1;
        }
      }

      // Check MOTM
      if (m.awards?.motm?.name) {
        const motmName = m.awards.motm.name;
        if (playerLookup.has(motmName.toLowerCase())) {
          const p = initPlayer(motmName);
          p.motmCount += 1;
        }
      }

      // Scan each innings
      m.innings?.forEach((inn) => {
        if (!Array.isArray(inn.balls)) return;

        let totalInnRuns = 0;
        let totalInnWickets = 0;
        let legalBallCount = 0;

        const batterMap = {}; // name -> { runs, balls, fours, sixes }
        const bowlerMap = {}; // name -> { wickets, runsConceded, balls }
        let currentPairKey = null;
        let currentPartnership = { runs: 0, balls: 0, batsmen: [] };

        inn.balls.forEach((b) => {
          const legal = !['wide', 'noball'].includes(b.extraType);
          const batsmanRuns = !b.extraType || b.extraType === 'noball' ? b.runs || 0 : 0;
          const teamRuns = b.extraType === 'wide' || b.extraType === 'noball' ? 1 + (b.runs || 0) : b.runs || 0;
          const runsAgainstBowler = b.extraType === 'bye' || b.extraType === 'legbye' ? 0 : teamRuns;

          totalInnRuns += teamRuns;
          if (legal) legalBallCount += 1;

          // Batsman tracking
          const strikerName = b.striker;
          if (strikerName) {
            if (!batterMap[strikerName]) batterMap[strikerName] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
            if (legal) batterMap[strikerName].balls += 1;
            batterMap[strikerName].runs += batsmanRuns;
            if (batsmanRuns === 4) batterMap[strikerName].fours += 1;
            if (batsmanRuns === 6) batterMap[strikerName].sixes += 1;
          }

          // Bowler tracking
          const bowlerName = b.bowler;
          if (bowlerName) {
            if (!bowlerMap[bowlerName]) bowlerMap[bowlerName] = { wickets: 0, runsConceded: 0, balls: 0 };
            if (legal) bowlerMap[bowlerName].balls += 1;
            bowlerMap[bowlerName].runsConceded += runsAgainstBowler;
            if (b.isWicket && b.wicketType !== 'run out') {
              bowlerMap[bowlerName].wickets += 1;
              totalInnWickets += 1;
            }
          }

          // Partnership tracking
          if (b.striker && b.nonStriker) {
            const pairKey = [b.striker, b.nonStriker].sort().join('&');
            if (pairKey !== currentPairKey) {
              if (currentPartnership.runs > (bestPartnership?.runs || 0)) {
                bestPartnership = { ...currentPartnership };
              }
              currentPartnership = { runs: 0, balls: 0, batsmen: [b.striker, b.nonStriker] };
              currentPairKey = pairKey;
            }
            currentPartnership.runs += teamRuns;
            if (legal) currentPartnership.balls += 1;
          }
        });

        if (currentPartnership.runs > (bestPartnership?.runs || 0)) {
          bestPartnership = { ...currentPartnership };
        }

        // Team score check
        const battingTeamName = m[inn.battingTeam]?.name || '';
        if (
          battingTeamName &&
          (battingTeamName.toLowerCase() === curA || battingTeamName.toLowerCase() === curB)
        ) {
          if (!highestTeamScore || totalInnRuns > highestTeamScore.runs) {
            highestTeamScore = {
              team: battingTeamName,
              runs: totalInnRuns,
              wickets: totalInnWickets,
              overs: (legalBallCount / 6).toFixed(1),
            };
          }
        }

        // Aggregate player stats into career records if they are in current match
        Object.entries(batterMap).forEach(([name, st]) => {
          if (playerLookup.has(name.toLowerCase())) {
            const p = initPlayer(name);
            p.runs += st.runs;
            p.balls += st.balls;
            p.fours += st.fours;
            p.sixes += st.sixes;
            p.recentScores.push(st.runs);

            // Check fastest fifty
            if (st.runs >= 50) {
              if (!fastestFifty || st.balls < fastestFifty.balls) {
                fastestFifty = { player: name, runs: st.runs, balls: st.balls, fours: st.fours, sixes: st.sixes };
              }
            }

            // Check highest individual score
            if (!highestScore || st.runs > highestScore.runs) {
              const sr = st.balls > 0 ? ((st.runs / st.balls) * 100).toFixed(1) : '0';
              highestScore = { player: name, runs: st.runs, balls: st.balls, fours: st.fours, sixes: st.sixes, sr };
            }
          }
        });

        Object.entries(bowlerMap).forEach(([name, bl]) => {
          if (playerLookup.has(name.toLowerCase())) {
            const p = initPlayer(name);
            p.wickets += bl.wickets;
            p.runsConceded += bl.runsConceded;
            p.ballsBowled += bl.balls;

            // Check best bowling figures
            if (bl.wickets >= 2) {
              const isBetter =
                !bestBowling ||
                bl.wickets > bestBowling.wickets ||
                (bl.wickets === bestBowling.wickets && bl.runsConceded < bestBowling.runsConceded);
              if (isBetter) {
                bestBowling = {
                  player: name,
                  wickets: bl.wickets,
                  runsConceded: bl.runsConceded,
                  overs: (bl.balls / 6).toFixed(1),
                };
              }
            }
          }
        });
      });
    });

    // --- Format Records into Highlights Array ---

    // 1. Fastest Fifty Record
    if (fastestFifty) {
      highlights.push({
        id: 'rec-fifty',
        category: 'Fastest 50',
        badge: '⚡ Blazing Fifty',
        title: 'Explosive Half-Century',
        text: `${fastestFifty.player} previously smashed 50 runs in just ${fastestFifty.balls} balls, including ${fastestFifty.fours} fours and ${fastestFifty.sixes} sixes!`,
        player: fastestFifty.player,
        stat: `50 in ${fastestFifty.balls}b`,
      });
    }

    // 2. Highest Individual Score
    if (highestScore && highestScore.runs >= 25) {
      highlights.push({
        id: 'rec-highest-score',
        category: 'Highest Score',
        badge: '🔥 Record Score',
        title: 'Masterclass Batting',
        text: `${highestScore.player} holds the highest individual score of ${highestScore.runs} runs off ${highestScore.balls} balls with a strike rate of ${highestScore.sr}!`,
        player: highestScore.player,
        stat: `${highestScore.runs} runs`,
      });
    }

    // 3. Best Bowling Figures
    if (bestBowling) {
      highlights.push({
        id: 'rec-best-bowling',
        category: 'Best Bowling',
        badge: '🎯 Golden Arm',
        title: 'Deadly Bowling Spell',
        text: `${bestBowling.player} delivered legendary figures of ${bestBowling.wickets}/${bestBowling.runsConceded} in ${bestBowling.overs} overs!`,
        player: bestBowling.player,
        stat: `${bestBowling.wickets}/${bestBowling.runsConceded}`,
      });
    }

    // 4. Sixes Leader among current players
    const sixHitters = Object.values(playerCareer)
      .filter((p) => p.sixes > 0)
      .sort((a, b) => b.sixes - a.sixes);
    if (sixHitters.length > 0 && sixHitters[0].sixes >= 2) {
      const topSixer = sixHitters[0];
      highlights.push({
        id: 'rec-sixes-leader',
        category: 'Boundary King',
        badge: '🚀 Six Machine',
        title: 'Most Career Sixes',
        text: `${topSixer.name} is the boundary master with ${topSixer.sixes} massive sixes and ${topSixer.fours} fours to their name!`,
        player: topSixer.name,
        stat: `${topSixer.sixes} Sixes`,
      });
    }

    // 5. Wickets Leader among current players
    const wicketTakers = Object.values(playerCareer)
      .filter((p) => p.wickets > 0)
      .sort((a, b) => b.wickets - a.wickets);
    if (wicketTakers.length > 0 && wicketTakers[0].wickets >= 2) {
      const topBowler = wicketTakers[0];
      const econ = topBowler.ballsBowled > 0 ? ((topBowler.runsConceded / (topBowler.ballsBowled / 6))).toFixed(2) : '0.00';
      highlights.push({
        id: 'rec-top-bowler',
        category: 'Most Wickets',
        badge: '👑 Strike Bowler',
        title: 'Bowling Spearhead',
        text: `${topBowler.name} leads the pack with ${topBowler.wickets} total wickets at a miserly economy of ${econ}!`,
        player: topBowler.name,
        stat: `${topBowler.wickets} Wkts`,
      });
    }

    // 6. Player of the Match Honors
    const motmPlayers = Object.values(playerCareer)
      .filter((p) => p.motmCount > 0)
      .sort((a, b) => b.motmCount - a.motmCount);
    if (motmPlayers.length > 0) {
      const topMotm = motmPlayers[0];
      highlights.push({
        id: 'rec-motm',
        category: 'Accolades',
        badge: '⭐ Match Winner',
        title: 'Player of the Match',
        text: `${topMotm.name} has earned ${topMotm.motmCount} Player-of-the-Match award${topMotm.motmCount > 1 ? 's' : ''} in career appearances!`,
        player: topMotm.name,
        stat: `${topMotm.motmCount} MOTM`,
      });
    }

    // 7. Recent Form Highlight
    const inFormPlayer = Object.values(playerCareer)
      .filter((p) => p.recentScores.length >= 2)
      .map((p) => ({
        ...p,
        recentTotal: p.recentScores.slice(-3).reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.recentTotal - a.recentTotal)[0];

    if (inFormPlayer && inFormPlayer.recentTotal >= 30) {
      highlights.push({
        id: 'rec-form',
        category: 'Recent Form',
        badge: '📈 Red-Hot Form',
        title: 'Player in Momentum',
        text: `${inFormPlayer.name} has been in sublime touch, scoring ${inFormPlayer.recentTotal} runs across their last matches!`,
        player: inFormPlayer.name,
        stat: `${inFormPlayer.recentTotal} Runs`,
      });
    }

    // 8. Highest Team Total
    if (highestTeamScore && highestTeamScore.runs >= 40) {
      highlights.push({
        id: 'rec-team-total',
        category: 'Team Benchmark',
        badge: '🛡️ Record Total',
        title: 'Powerhouse Innings',
        text: `${highestTeamScore.team} previously hammered ${highestTeamScore.runs}/${highestTeamScore.wickets} in ${highestTeamScore.overs} overs!`,
        player: highestTeamScore.team,
        stat: `${highestTeamScore.runs} Runs`,
      });
    }

    // 9. Head-to-Head Record
    if (headToHead.matches > 0) {
      highlights.push({
        id: 'rec-h2h',
        category: 'Rivalry',
        badge: '⚔️ Head-to-Head',
        title: 'Historical Rivalry',
        text: `In their previous ${headToHead.matches} encounter${headToHead.matches > 1 ? 's' : ''}, ${teamAName} won ${headToHead.teamAWins} and ${teamBName} won ${headToHead.teamBWins}!`,
        player: `${teamAName} vs ${teamBName}`,
        stat: `${headToHead.teamAWins} - ${headToHead.teamBWins}`,
      });
    }

    // 10. Fallback / supplementary highlights if fewer than 3
    if (highlights.length < 3) {
      const topRunScorer = Object.values(playerCareer).sort((a, b) => b.runs - a.runs)[0];
      if (topRunScorer && topRunScorer.runs > 0) {
        highlights.push({
          id: 'rec-top-run-scorer',
          category: 'Career Runs',
          badge: '🏏 Run Machine',
          title: 'Career Runs Leader',
          text: `${topRunScorer.name} has accumulated ${topRunScorer.runs} runs (${topRunScorer.balls} balls faced) in tournament history!`,
          player: topRunScorer.name,
          stat: `${topRunScorer.runs} Career Runs`,
        });
      }

      highlights.push({
        id: 'rec-match-rule',
        category: 'Match Intel',
        badge: '🏟️ Ground Focus',
        title: 'Match Format',
        text: `Every ball counts in this ${currentMatch.overs}-over fixture. Clean boundaries and tight bowling will decide the trophy!`,
        player: `${teamAName} vs ${teamBName}`,
        stat: `${currentMatch.overs} Overs`,
      });
    }

    return highlights;
  } catch (err) {
    console.error('Error generating historical highlights:', err);
    return [
      {
        id: 'rec-fallback',
        category: 'Live Match',
        badge: '🏏 Live Match',
        title: 'Game on the line',
        text: `${currentMatch.teamA?.name} and ${currentMatch.teamB?.name} are locked in a thrilling contest!`,
        player: 'Live Cricket',
        stat: 'LIVE',
      },
    ];
  }
}

module.exports = {
  generateHistoricalHighlights,
};
