import React from 'react';
import '../styles/PlayoffBracket.css';

function findFixture(fixtures, stage) {
  const matches = fixtures.filter((f) => f.stage === stage);
  if (matches.length === 0) return null;
  // If a rematch was scheduled, its matchNumber is higher — show that one.
  return matches.reduce((latest, f) => (f.matchNumber > latest.matchNumber ? f : latest));
}

function findTeam(teams, name) {
  return teams.find((t) => t.name === name);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function MatchBox({ fixture, teams, onStart, onRematch, label, accent }) {
  if (!fixture) {
    return (
      <div className="pb-box pb-box-empty">
        <p className="pb-box-label">{label}</p>
        <p className="pb-box-tbd">TBD</p>
      </div>
    );
  }

  const isPending = fixture.teamAName.startsWith('TBD') || fixture.teamBName.startsWith('TBD');
  const teamA = findTeam(teams, fixture.teamAName);
  const teamB = findTeam(teams, fixture.teamBName);

  return (
    <div className={`pb-box pb-box-${accent} ${fixture.status === 'completed' ? 'pb-box-completed' : ''}`}>
      <p className="pb-box-label">{label}</p>
      <div
        className={`pb-team-row ${!isPending && fixture.status !== 'completed' ? 'pb-clickable' : ''}`}
        onClick={() => !isPending && fixture.status !== 'completed' && onStart(fixture)}
      >
        <div className="pb-team">
          {teamA?.logo ? <img src={teamA.logo} alt={teamA.name} className="pb-team-logo" /> : <span className="pb-team-logo-fallback">{fixture.teamAName.slice(0, 2).toUpperCase()}</span>}
          <span className="pb-team-name">{fixture.teamAName}</span>
        </div>
        <div className="pb-team">
          {teamB?.logo ? <img src={teamB.logo} alt={teamB.name} className="pb-team-logo" /> : <span className="pb-team-logo-fallback">{fixture.teamBName.slice(0, 2).toUpperCase()}</span>}
          <span className="pb-team-name">{fixture.teamBName}</span>
        </div>
      </div>
      <p className="pb-box-meta">
        {formatDate(fixture.scheduledDate)} ·{' '}
        <span className={`pb-status pb-status-${fixture.status}`}>
          {isPending ? 'Pending' : fixture.status === 'scheduled' ? 'Tap to start' : fixture.status}
        </span>
      </p>
      {fixture.status === 'completed' && onRematch && (
        <button className="pb-rematch-btn" onClick={() => onRematch(fixture)}>🔁 Tied — Force Rematch</button>
      )}
    </div>
  );
}

function PlayoffBracket({ fixtures, teams, onStart, onRematch }) {
  const qualifier1 = findFixture(fixtures, 'qualifier1');
  const eliminator = findFixture(fixtures, 'eliminator');
  const qualifier2 = findFixture(fixtures, 'qualifier2');
  const final = findFixture(fixtures, 'final');

  return (
    <div className="pb-bracket">
      <div className="pb-column">
        <MatchBox fixture={qualifier1} teams={teams} onStart={onStart} onRematch={onRematch} label="QUALIFIER 1" accent="green" />
        <div className="pb-connector pb-connector-top" />
        <div className="pb-connector pb-connector-bottom" />
        <MatchBox fixture={eliminator} teams={teams} onStart={onStart} onRematch={onRematch} label="ELIMINATOR" accent="red" />
      </div>

      <div className="pb-column pb-column-mid">
        <div className="pb-mid-spacer" />
        <MatchBox fixture={qualifier2} teams={teams} onStart={onStart} onRematch={onRematch} label="QUALIFIER 2" accent="amber" />
      </div>

      <div className="pb-column pb-column-final">
        <div className="pb-final-spacer" />
        <MatchBox fixture={final} teams={teams} onStart={onStart} onRematch={onRematch} label="🏆 FINAL" accent="gold" />
      </div>
    </div>
  );
}

export default PlayoffBracket;