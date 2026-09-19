/**
 * Automated Real-Time Cricket Highlights Engine for Matches & Tournaments
 * Generates structured, timestamped highlight cards from live and historical deliveries.
 */

function generateMatchHighlights(match, inningsSummaries = []) {
  if (!match || !Array.isArray(match.innings)) return [];

  const highlights = [];
  let highlightCounter = 1;

  // Track milestones per innings
  match.innings.forEach((inn, innIdx) => {
    if (!Array.isArray(inn.balls)) return;

    const battingTeamName = match[inn.battingTeam]?.name || 'Batting Team';
    const bowlingTeamName = match[inn.bowlingTeam]?.name || 'Bowling Team';

    const batterRuns = new Map(); // name -> { runs: 0, balls: 0, crossed50: false, crossed100: false }
    const bowlerStats = new Map(); // name -> { wkts: 0, runs: 0, crossed3w: false, crossed5w: false }

    inn.balls.forEach((b) => {
      const legal = !['wide', 'noball'].includes(b.extraType);
      const batsmanRuns = !b.extraType || b.extraType === 'noball' ? b.runs || 0 : 0;
      const overStr = `Ov ${b.overNumber}.${b.ballInOver}`;
      const time = b.timestamp || match.createdAt || new Date();

      // Track batter
      if (b.striker) {
        const bEntry = batterRuns.get(b.striker) || { runs: 0, balls: 0, crossed50: false, crossed100: false };
        if (legal) bEntry.balls += 1;
        if (!b.extraType || b.extraType === 'noball') bEntry.runs += batsmanRuns;

        // Check 50 milestone
        if (bEntry.runs >= 50 && !bEntry.crossed50) {
          bEntry.crossed50 = true;
          highlights.push({
            id: `hl_50_${innIdx}_${highlightCounter++}`,
            type: 'fifty',
            icon: '🌟',
            title: `HALF-CENTURY FOR ${b.striker.toUpperCase()}!`,
            description: `${b.striker} reaches a stellar 50 runs off ${bEntry.balls} deliveries for ${battingTeamName}.`,
            player: b.striker,
            team: battingTeamName,
            statistics: `${bEntry.runs} runs (${bEntry.balls} balls)`,
            over: overStr,
            timestamp: time,
            matchId: match._id,
            matchName: `${match.teamA.name} vs ${match.teamB.name}`,
          });
        }

        // Check 100 milestone
        if (bEntry.runs >= 100 && !bEntry.crossed100) {
          bEntry.crossed100 = true;
          highlights.push({
            id: `hl_100_${innIdx}_${highlightCounter++}`,
            type: 'century',
            icon: '👑',
            title: `MAGNIFICENT CENTURY: ${b.striker.toUpperCase()}!`,
            description: `Spectacular 100 from ${b.striker} in ${bEntry.balls} balls! Dominant batting display.`,
            player: b.striker,
            team: battingTeamName,
            statistics: `${bEntry.runs} runs (${bEntry.balls} balls)`,
            over: overStr,
            timestamp: time,
            matchId: match._id,
            matchName: `${match.teamA.name} vs ${match.teamB.name}`,
          });
        }

        batterRuns.set(b.striker, bEntry);
      }

      // Track bowler
      if (b.bowler) {
        const bowEntry = bowlerStats.get(b.bowler) || { wkts: 0, runs: 0, crossed3w: false, crossed5w: false };
        if (b.isWicket && b.wicketType !== 'run out') {
          bowEntry.wkts += 1;

          // 3-wicket haul
          if (bowEntry.wkts === 3 && !bowEntry.crossed3w) {
            bowEntry.crossed3w = true;
            highlights.push({
              id: `hl_3w_${innIdx}_${highlightCounter++}`,
              type: 'three_wickets',
              icon: '🔥',
              title: `3-WICKET HAUL FOR ${b.bowler.toUpperCase()}!`,
              description: `${b.bowler} tears through the batting lineup with 3 crucial wickets for ${bowlingTeamName}.`,
              player: b.bowler,
              team: bowlingTeamName,
              statistics: `3 wickets taken`,
              over: overStr,
              timestamp: time,
              matchId: match._id,
              matchName: `${match.teamA.name} vs ${match.teamB.name}`,
            });
          }

          // 5-wicket haul
          if (bowEntry.wkts === 5 && !bowEntry.crossed5w) {
            bowEntry.crossed5w = true;
            highlights.push({
              id: `hl_5w_${innIdx}_${highlightCounter++}`,
              type: 'five_wickets',
              icon: '⚡',
              title: `5-WICKET HAUL: SENSATIONAL SPELL BY ${b.bowler.toUpperCase()}!`,
              description: `A masterclass in bowling! ${b.bowler} claims 5 wickets in a game-defining performance.`,
              player: b.bowler,
              team: bowlingTeamName,
              statistics: `5 wickets taken`,
              over: overStr,
              timestamp: time,
              matchId: match._id,
              matchName: `${match.teamA.name} vs ${match.teamB.name}`,
            });
          }
        }
        bowlerStats.set(b.bowler, bowEntry);
      }

      // Event: WICKET
      if (b.isWicket) {
        const outName = b.outBatsman || b.striker;
        const dismissalDetails =
          b.wicketType === 'caught' && b.fielder
            ? `c ${b.fielder} b ${b.bowler}`
            : b.wicketType === 'run out'
            ? `run out (${b.fielder || 'Direct Hit'})`
            : `${b.wicketType || 'out'} b ${b.bowler}`;

        highlights.push({
          id: `hl_wkt_${innIdx}_${highlightCounter++}`,
          type: 'wicket',
          icon: '🔴',
          title: `WICKET! ${outName.toUpperCase()} DISMISSED`,
          description: `${outName} departs (${dismissalDetails}). Big breakthrough for ${bowlingTeamName}!`,
          player: b.bowler,
          team: bowlingTeamName,
          statistics: dismissalDetails,
          over: overStr,
          timestamp: time,
          matchId: match._id,
          matchName: `${match.teamA.name} vs ${match.teamB.name}`,
        });
      }
      // Event: SIX
      else if (b.runs === 6 && (!b.extraType || b.extraType === 'noball')) {
        highlights.push({
          id: `hl_six_${innIdx}_${highlightCounter++}`,
          type: 'six',
          icon: '🚀',
          title: `MASSIVE SIX BY ${b.striker.toUpperCase()}!`,
          description: `${b.striker} hammers ${b.bowler} over the ropes for a colossal six!`,
          player: b.striker,
          team: battingTeamName,
          statistics: `6 Runs · Maximum`,
          over: overStr,
          timestamp: time,
          matchId: match._id,
          matchName: `${match.teamA.name} vs ${match.teamB.name}`,
        });
      }
      // Event: FOUR
      else if (b.runs === 4 && (!b.extraType || b.extraType === 'noball')) {
        highlights.push({
          id: `hl_four_${innIdx}_${highlightCounter++}`,
          type: 'four',
          icon: '🔥',
          title: `CRACKING FOUR BY ${b.striker.toUpperCase()}!`,
          description: `Beautiful timing! ${b.striker} drives ${b.bowler} through the gap to the boundary.`,
          player: b.striker,
          team: battingTeamName,
          statistics: `4 Runs · Boundary`,
          over: overStr,
          timestamp: time,
          matchId: match._id,
          matchName: `${match.teamA.name} vs ${match.teamB.name}`,
        });
      }
    });

    // Check 50+ Partnerships from innings summary if available
    const innSum = inningsSummaries[innIdx];
    if (innSum && Array.isArray(innSum.partnerships)) {
      innSum.partnerships.forEach((p) => {
        if (p.runs >= 50) {
          highlights.push({
            id: `hl_part_${innIdx}_${p.partnershipNumber}`,
            type: 'partnership',
            icon: '🤝',
            title: `50+ PARTNERSHIP: ${p.batsmen.join(' & ').toUpperCase()}`,
            description: `Superb stand of ${p.runs} runs (${p.balls} balls) between ${p.batsmen[0]} and ${p.batsmen[1]}.`,
            player: p.batsmen.join(' & '),
            team: battingTeamName,
            statistics: `${p.runs} runs (${p.balls} balls)`,
            over: `Innings ${innIdx + 1}`,
            timestamp: match.createdAt || new Date(),
            matchId: match._id,
            matchName: `${match.teamA.name} vs ${match.teamB.name}`,
          });
        }
      });
    }
  });

  // Event: MATCH RESULT & MVP
  if (match.status === 'completed' && match.result) {
    const winnerTeam = match.winner === 'tie' ? 'Tied' : match[match.winner]?.name || 'Winner';
    const mvpName = match.awards?.mvp?.name || match.awards?.motm?.name;
    const mvpStats = match.awards?.mvp?.statLine || match.awards?.motm?.statLine;

    highlights.push({
      id: `hl_result_${match._id}`,
      type: 'match_result',
      icon: '🏆',
      title: `MATCH RESULT: ${match.result.toUpperCase()}`,
      description: `Dramatic match conclusion! ${winnerTeam} takes the honors.${
        mvpName ? ` Player of the Match: ${mvpName} (${mvpStats || 'Match Winning Effort'}).` : ''
      }`,
      player: mvpName || winnerTeam,
      team: winnerTeam,
      statistics: match.result,
      over: 'Final',
      timestamp: match.createdAt || new Date(),
      matchId: match._id,
      matchName: `${match.teamA.name} vs ${match.teamB.name}`,
    });
  }

  // Sort highlights chronologically with most recent first
  return highlights.reverse();
}

module.exports = {
  generateMatchHighlights,
};
