import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import '../styles/TournamentCelebration.css';

function TournamentCelebration({ tournament, playerStats, celebrationStats }) {
  const rootRef = useRef(null);
  const confettiRef = useRef(null);
  const trophyRef = useRef(null);
  const labelRef = useRef(null);
  const teamNameRef = useRef(null);
  const rosterRef = useRef(null);
  const awardsRef = useRef(null);
  const teamAwardsRef = useRef(null);
  const mvpRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        trophyRef.current,
        { scale: 0, rotate: -35, opacity: 0 },
        { scale: 1, rotate: 0, opacity: 1, duration: 0.9, ease: 'back.out(2.2)' }
      );
      tl.add(() => burstConfetti(confettiRef.current), '-=0.25');
      tl.fromTo(labelRef.current, { opacity: 0, letterSpacing: '0.6em' }, { opacity: 1, letterSpacing: '0.25em', duration: 0.6 }, '-=0.3');
      tl.fromTo(teamNameRef.current, { opacity: 0, y: 24, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.6)' }, '-=0.15');

      const rosterItems = rosterRef.current?.querySelectorAll('.tc-roster-item');
      if (rosterItems?.length) {
        tl.fromTo(rosterItems, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.09 }, '-=0.15');
      }

      if (mvpRef.current) {
        tl.fromTo(mvpRef.current, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, '+=0.1');
      }

      const teamAwardCards = teamAwardsRef.current?.querySelectorAll('.tc-award-card');
      if (teamAwardCards?.length) {
        tl.fromTo(
          teamAwardCards,
          { opacity: 0, scale: 0.85, y: 16 },
          { opacity: 1, scale: 1, y: 0, duration: 0.4, stagger: 0.12, ease: 'back.out(1.7)' },
          '-=0.1'
        );
      }

      const awardCards = awardsRef.current?.querySelectorAll('.tc-award-card');
      if (awardCards?.length) {
        tl.fromTo(
          awardCards,
          { opacity: 0, scale: 0.85, y: 16 },
          { opacity: 1, scale: 1, y: 0, duration: 0.4, stagger: 0.12, ease: 'back.out(1.7)' },
          '-=0.1'
        );
      }
    }, rootRef);

    return () => ctx.revert();
  }, []);

  function burstConfetti(container) {
    if (!container) return;
    const colors = ['#f59e0b', '#22c55e', '#6c63ff', '#ef4444', '#fbbf24', '#3b82f6'];
    for (let i = 0; i < 70; i++) {
      const piece = document.createElement('div');
      piece.className = 'tc-confetti-piece';
      piece.style.background = colors[i % colors.length];
      piece.style.left = `${45 + Math.random() * 10}%`;
      piece.style.top = '0%';
      container.appendChild(piece);

      const angle = Math.random() * Math.PI - Math.PI / 2;
      const distanceX = Math.cos(angle) * (150 + Math.random() * 250);
      const fallY = 220 + Math.random() * 220;

      gsap.to(piece, {
        x: distanceX,
        y: fallY,
        rotation: Math.random() * 720 - 360,
        opacity: 0,
        duration: 1.8 + Math.random() * 0.9,
        ease: 'power1.in',
        onComplete: () => piece.remove(),
      });
    }
  }

  const pott = tournament.playerOfTournament;

  const awardList = playerStats
    ? [
        { icon: '🏏', label: 'Most Runs', name: playerStats.mostRuns[0]?.name, stat: playerStats.mostRuns[0] ? `${playerStats.mostRuns[0].runs} runs` : null },
        { icon: '🎯', label: 'Most Wickets', name: playerStats.mostWickets[0]?.name, stat: playerStats.mostWickets[0] ? `${playerStats.mostWickets[0].wickets} wickets` : null },
        { icon: '🔥', label: 'Most Sixes', name: playerStats.mostSixes[0]?.name, stat: playerStats.mostSixes[0] ? `${playerStats.mostSixes[0].sixes} sixes` : null },
        { icon: '💪', label: 'Best Economy', name: playerStats.bestEconomy[0]?.name, stat: playerStats.bestEconomy[0] ? `${playerStats.bestEconomy[0].economy} econ` : null },
        { icon: '🧤', label: 'Most Catches', name: playerStats.mostCatches[0]?.name, stat: playerStats.mostCatches[0] ? `${playerStats.mostCatches[0].count} catches` : null },
      ].filter((a) => a.name)
    : [];

  return (
    <div className="tc-root" ref={rootRef}>
      <div className="tc-confetti-wrap" ref={confettiRef} />

      <div className="tc-trophy" ref={trophyRef}>🏆</div>
      <p className="tc-champions-label" ref={labelRef}>CHAMPIONS</p>
      <h2 className="tc-team-name" ref={teamNameRef}>{tournament.winningTeam}</h2>

      {celebrationStats?.winningTeamPlayers?.length > 0 && (
        <div className="tc-roster" ref={rosterRef}>
          <div className="tc-roster-table-wrap">
            <table className="tc-roster-table">
              <thead>
                <tr>
                  <th>Player</th><th>Runs</th><th>SR</th><th>Wkts</th><th>Econ</th><th>Catches</th>
                </tr>
              </thead>
              <tbody>
                {celebrationStats.winningTeamPlayers.map((p) => (
                  <tr key={p.name} className="tc-roster-item">
                    <td>
                      {p.name}
                      {p.name === pott?.name && <span className="tc-roster-badge"> ⭐ POTT</span>}
                    </td>
                    <td>{p.runs}</td>
                    <td>{p.strikeRate || '—'}</td>
                    <td>{p.wickets}</td>
                    <td>{p.economy ?? '—'}</td>
                    <td>{p.catches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pott && (
        <div className="tc-mvp-card" ref={mvpRef}>
          <p className="tc-mvp-label">⭐ Player of the Tournament</p>
          <p className="tc-mvp-name">{pott.name}</p>
          <p className="tc-mvp-line">
            {pott.matches} matches · {pott.runs} runs{pott.wickets > 0 ? ` · ${pott.wickets} wickets` : ''}
          </p>
          <p className="tc-mvp-explanation">{pott.explanation}</p>
        </div>
      )}

      {celebrationStats && (
        <div className="tc-awards-grid tc-team-awards-grid" ref={teamAwardsRef}>
          {celebrationStats.bestBattingTeam && (
            <div className="tc-award-card">
              <span className="tc-award-icon">🏏</span>
              <p className="tc-award-label">Best Batting Team</p>
              <p className="tc-award-name">{celebrationStats.bestBattingTeam.name}</p>
              <p className="tc-award-stat">{celebrationStats.bestBattingTeam.runs} runs</p>
            </div>
          )}
          {celebrationStats.bestBowlingTeam && (
            <div className="tc-award-card">
              <span className="tc-award-icon">🎯</span>
              <p className="tc-award-label">Best Bowling Team</p>
              <p className="tc-award-name">{celebrationStats.bestBowlingTeam.name}</p>
              <p className="tc-award-stat">{celebrationStats.bestBowlingTeam.wickets} wickets</p>
            </div>
          )}
          {celebrationStats.bestCatchingTeam && (
            <div className="tc-award-card">
              <span className="tc-award-icon">🧤</span>
              <p className="tc-award-label">Best Catching Team</p>
              <p className="tc-award-name">{celebrationStats.bestCatchingTeam.name}</p>
              <p className="tc-award-stat">{celebrationStats.bestCatchingTeam.catches} catches</p>
            </div>
          )}
          {celebrationStats.bestEconomicalTeam && (
            <div className="tc-award-card">
              <span className="tc-award-icon">💪</span>
              <p className="tc-award-label">Most Economical Team</p>
              <p className="tc-award-name">{celebrationStats.bestEconomicalTeam.name}</p>
              <p className="tc-award-stat">{celebrationStats.bestEconomicalTeam.economy} econ</p>
            </div>
          )}
        </div>
      )}

      {awardList.length > 0 && (
        <div className="tc-awards-grid" ref={awardsRef}>
          {awardList.map((a) => (
            <div key={a.label} className="tc-award-card">
              <span className="tc-award-icon">{a.icon}</span>
              <p className="tc-award-label">{a.label}</p>
              <p className="tc-award-name">{a.name}</p>
              <p className="tc-award-stat">{a.stat}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TournamentCelebration;