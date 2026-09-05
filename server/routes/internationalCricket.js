const express = require('express');
const router = express.Router();

const CRICAPI_BASE = 'https://api.cricapi.com/v1';
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000;

async function cachedFetch(cacheKey, url) {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return cached.data;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Cricket API request failed (${res.status})`);
  }
  const data = await res.json();
  cache.set(cacheKey, { data, time: Date.now() });
  return data;
}

// ---------------------------------------------------------------------------
// Extensible Leagues & Competitions Registry
// ---------------------------------------------------------------------------
const LEAGUES_REGISTRY = [
  { id: 'all', name: 'All Matches', icon: '🌐' },
  { id: 'international', name: 'International (Test/ODI/T20I)', icon: '🌍' },
  { id: 'ipl', name: 'IPL (Indian Premier League)', icon: '🏆' },
  { id: 'cpl', name: 'CPL (Caribbean Premier League)', icon: '🌴' },
  { id: 'mlc', name: 'MLC (Major League Cricket)', icon: '🦅' },
  { id: 'bbl', name: 'BBL (Big Bash League)', icon: '🦘' },
  { id: 'psl', name: 'PSL (Pakistan Super League)', icon: '⚡' },
  { id: 'the-hundred', name: 'The Hundred', icon: '💯' },
  { id: 'sa20', name: 'SA20 (South Africa)', icon: '🇿🇦' },
  { id: 'ilt20', name: 'ILT20 (International League T20)', icon: '🏜️' },
  { id: 'bpl', name: 'BPL (Bangladesh Premier League)', icon: '🐅' },
  { id: 'lpl', name: 'LPL (Lanka Premier League)', icon: '🦁' },
];

// ---------------------------------------------------------------------------
// Comprehensive Cricbuzz Cricket Data Store
// ---------------------------------------------------------------------------
const MOCK_CRICKET_MATCHES = [
  // 1. IND vs AUS T20I (Live - Thriller Chase)
  {
    id: 'ind-vs-aus-t20-2026',
    name: 'India vs Australia, 2nd T20I',
    series: 'Australia Tour of India 2026',
    leagueId: 'international',
    matchType: 't20',
    category: 't20',
    format: 'T20I',
    status: '🔴 LIVE: India need 28 runs in 16 balls (Target: 187)',
    isLive: true,
    isCompleted: false,
    venue: 'Wankhede Stadium, Mumbai',
    date: '2026-09-05T13:30:00.000Z',
    toss: 'India won the toss and elected to bowl first',
    umpires: 'Nitin Menon, Richard Illingworth',
    referee: 'Javagal Srinath',
    crr: '10.22',
    rrr: '10.50',
    target: 187,
    winProbability: { team1: 78, team2: 22 },
    team1: {
      name: 'India',
      shortName: 'IND',
      flag: '🇮🇳',
      score: '159/4 (17.2 ov)',
      details: '159/4 (17.2 ov) · Need 28 off 16',
    },
    team2: {
      name: 'Australia',
      shortName: 'AUS',
      flag: '🇦🇺',
      score: '186/6 (20.0 ov)',
      details: '186/6 (20.0 ov)',
    },
    currentBatters: [
      { name: 'Virat Kohli', runs: 72, balls: 45, fours: 7, sixes: 3, strikeRate: '160.00', onStrike: true },
      { name: 'Hardik Pandya', runs: 24, balls: 14, fours: 2, sixes: 1, strikeRate: '171.43', onStrike: false },
    ],
    currentBowler: {
      name: 'Pat Cummins',
      overs: '3.2',
      maidens: 0,
      runs: 32,
      wickets: 1,
      economy: '9.60',
    },
    currentOver: {
      overNumber: 18,
      balls: ['1', '4', '0', 'W', '2', '6'],
    },
    recentOvers: [
      { overNumber: 18, balls: ['1', '4', '0', 'W', '2', '6'] },
      { overNumber: 17, balls: ['2', '1', '6', '1', '4', '1'] },
      { overNumber: 16, balls: ['0', '1', '2', '4', '1', '1'] },
    ],
    scorecard: [
      {
        inningName: 'Australia Innings',
        teamName: 'Australia',
        runs: 186,
        wickets: 6,
        overs: '20.0',
        batting: [
          { name: 'Travis Head', dismissal: 'c Samson b Arshdeep', runs: 58, balls: 32, fours: 7, sixes: 3, strikeRate: '181.25' },
          { name: 'Mitchell Marsh (C)', dismissal: 'c Hardik b Axar', runs: 42, balls: 26, fours: 4, sixes: 2, strikeRate: '161.54' },
          { name: 'Glenn Maxwell', dismissal: 'c Suryakumar b Kuldeep', runs: 34, balls: 18, fours: 3, sixes: 3, strikeRate: '188.89' },
          { name: 'Marcus Stoinis', dismissal: 'not out', runs: 28, balls: 16, fours: 2, sixes: 2, strikeRate: '175.00' },
          { name: 'Tim David', dismissal: 'b Bumrah', runs: 12, balls: 8, fours: 1, sixes: 1, strikeRate: '150.00' },
        ],
        bowling: [
          { name: 'Jasprit Bumrah', overs: '4.0', maidens: 0, runs: 28, wickets: 2, economy: '7.00' },
          { name: 'Arshdeep Singh', overs: '4.0', maidens: 0, runs: 42, wickets: 2, economy: '10.50' },
          { name: 'Axar Patel', overs: '4.0', maidens: 0, runs: 34, wickets: 1, economy: '8.50' },
          { name: 'Kuldeep Yadav', overs: '4.0', maidens: 0, runs: 38, wickets: 1, economy: '9.50' },
          { name: 'Hardik Pandya', overs: '4.0', maidens: 0, runs: 40, wickets: 0, economy: '10.00' },
        ],
      },
      {
        inningName: 'India Innings (Chasing)',
        teamName: 'India',
        runs: 159,
        wickets: 4,
        overs: '17.2',
        batting: [
          { name: 'Rohit Sharma', dismissal: 'c Inglis b Starc', runs: 38, balls: 22, fours: 5, sixes: 2, strikeRate: '172.73' },
          { name: 'Yashasvi Jaiswal', dismissal: 'c Stoinis b Zampa', runs: 18, balls: 12, fours: 3, sixes: 0, strikeRate: '150.00' },
          { name: 'Virat Kohli', dismissal: 'batting', runs: 72, balls: 45, fours: 7, sixes: 3, strikeRate: '160.00' },
          { name: 'Suryakumar Yadav (C)', dismissal: 'c David b Cummins', runs: 21, balls: 13, fours: 2, sixes: 1, strikeRate: '161.54' },
          { name: 'Hardik Pandya', dismissal: 'batting', runs: 24, balls: 14, fours: 2, sixes: 1, strikeRate: '171.43' },
        ],
        bowling: [
          { name: 'Mitchell Starc', overs: '4.0', maidens: 0, runs: 38, wickets: 1, economy: '9.50' },
          { name: 'Pat Cummins', overs: '3.2', maidens: 0, runs: 32, wickets: 1, economy: '9.60' },
          { name: 'Adam Zampa', overs: '4.0', maidens: 0, runs: 34, wickets: 1, economy: '8.50' },
          { name: 'Nathan Ellis', overs: '3.0', maidens: 0, runs: 28, wickets: 1, economy: '9.33' },
          { name: 'Marcus Stoinis', overs: '3.0', maidens: 0, runs: 27, wickets: 0, economy: '9.00' },
        ],
      },
    ],
    commentary: [
      { over: '17.2', text: 'SIX! Virat Kohli steps out and sends Cummins soaring over long-on! What a shot under pressure!', event: 'six' },
      { over: '17.1', text: 'Two runs. Driven firmly through deep cover, quick running between the wickets.', event: 'two' },
      { over: '16.6', text: 'OUT! Suryakumar Yadav miscues the lofted drive, straight to Tim David at long-off!', event: 'wicket' },
      { over: '16.5', text: 'Dot ball. Slower bouncer outside off, beaten.', event: 'dot' },
      { over: '16.4', text: 'FOUR! Slashed over backward point with surgical precision!', event: 'four' },
      { over: '16.3', text: 'Single taken towards third man.', event: 'one' },
    ],
    squads: {
      team1: ['Rohit Sharma', 'Yashasvi Jaiswal', 'Virat Kohli', 'Suryakumar Yadav (C)', 'Hardik Pandya', 'Rishabh Pant (WK)', 'Axar Patel', 'Kuldeep Yadav', 'Jasprit Bumrah', 'Arshdeep Singh', 'Mohammed Siraj'],
      team2: ['Travis Head', 'Mitchell Marsh (C)', 'Josh Inglis (WK)', 'Glenn Maxwell', 'Marcus Stoinis', 'Tim David', 'Pat Cummins', 'Mitchell Starc', 'Adam Zampa', 'Nathan Ellis', 'Josh Hazlewood'],
    },
  },

  // 2. ENG vs SA 3rd ODI (Live)
  {
    id: 'eng-vs-sa-odi-2026',
    name: 'England vs South Africa, 3rd ODI',
    series: 'South Africa Tour of England 2026',
    leagueId: 'international',
    matchType: 'odi',
    category: 'odi',
    format: 'ODI',
    status: '🔴 LIVE: South Africa need 84 runs in 58 balls (Target: 318)',
    isLive: true,
    isCompleted: false,
    venue: "Lord's, London",
    date: '2026-09-05T10:00:00.000Z',
    toss: 'England won the toss and elected to bat first',
    umpires: 'Alex Wharf, Kumar Dharmasena',
    referee: 'Richie Richardson',
    crr: '5.81',
    rrr: '8.69',
    target: 318,
    winProbability: { team1: 58, team2: 42 },
    team1: {
      name: 'England',
      shortName: 'ENG',
      flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      score: '317/7 (50.0 ov)',
      details: '317/7 (50.0 ov)',
    },
    team2: {
      name: 'South Africa',
      shortName: 'SA',
      flag: '🇿🇦',
      score: '234/5 (40.2 ov)',
      details: '234/5 (40.2 ov) · Need 84 off 58',
    },
    currentBatters: [
      { name: 'Heinrich Klaasen', runs: 82, balls: 64, fours: 8, sixes: 4, strikeRate: '128.12', onStrike: true },
      { name: 'David Miller', runs: 36, balls: 28, fours: 3, sixes: 1, strikeRate: '128.57', onStrike: false },
    ],
    currentBowler: {
      name: 'Jofra Archer',
      overs: '8.2',
      maidens: 1,
      runs: 48,
      wickets: 2,
      economy: '5.76',
    },
    currentOver: {
      overNumber: 41,
      balls: ['1', '4', '6', '1', '2', '0'],
    },
    recentOvers: [
      { overNumber: 41, balls: ['1', '4', '6', '1', '2', '0'] },
      { overNumber: 40, balls: ['0', '1', '1', '4', '1', 'W'] },
    ],
    scorecard: [
      {
        inningName: 'England Innings',
        teamName: 'England',
        runs: 317,
        wickets: 7,
        overs: '50.0',
        batting: [
          { name: 'Phil Salt (WK)', dismissal: 'c Markram b Rabada', runs: 68, balls: 54, fours: 8, sixes: 2, strikeRate: '125.93' },
          { name: 'Ben Duckett', dismissal: 'b Jansen', runs: 42, balls: 48, fours: 5, sixes: 0, strikeRate: '87.50' },
          { name: 'Harry Brook (C)', dismissal: 'c Klaasen b Shamsi', runs: 112, balls: 96, fours: 12, sixes: 3, strikeRate: '116.67' },
          { name: 'Liam Livingstone', dismissal: 'not out', runs: 52, balls: 34, fours: 4, sixes: 3, strikeRate: '152.94' },
        ],
        bowling: [
          { name: 'Kagiso Rabada', overs: '10.0', maidens: 1, runs: 62, wickets: 3, economy: '6.20' },
          { name: 'Marco Jansen', overs: '10.0', maidens: 0, runs: 58, wickets: 2, economy: '5.80' },
          { name: 'Tabraiz Shamsi', overs: '10.0', maidens: 0, runs: 68, wickets: 2, economy: '6.80' },
        ],
      },
    ],
    commentary: [
      { over: '40.2', text: 'FOUR! Driven powerfully through covers by Heinrich Klaasen!', event: 'four' },
    ],
    squads: { team1: [], team2: [] },
  },

  // 3. NZ vs PAK Test Match (Live - Day 4)
  {
    id: 'nz-vs-pak-test-2026',
    name: 'New Zealand vs Pakistan, 1st Test',
    series: 'Pakistan Tour of New Zealand 2026',
    leagueId: 'international',
    matchType: 'test',
    category: 'test',
    format: 'Test',
    status: '🔴 Day 4 - LIVE: Pakistan need 142 runs to win (Target: 298)',
    isLive: true,
    isCompleted: false,
    venue: 'Seddon Park, Hamilton',
    date: '2026-09-02T22:00:00.000Z',
    toss: 'New Zealand won the toss and elected to bat first',
    umpires: 'Chris Gaffaney, Marais Erasmus',
    referee: 'David Boon',
    crr: '3.12',
    rrr: '—',
    target: 298,
    winProbability: { team1: 60, team2: 40 },
    team1: {
      name: 'New Zealand',
      shortName: 'NZ',
      flag: '🇳🇿',
      score: '348 & 216',
      details: '348/10 (98.4 ov) & 216/10 (64.2 ov)',
    },
    team2: {
      name: 'Pakistan',
      shortName: 'PAK',
      flag: '🇵🇰',
      score: '266 & 156/4 (50.0 ov)',
      details: '266/10 (84.1 ov) & 156/4 (50.0 ov)',
    },
    currentBatters: [
      { name: 'Babar Azam (C)', runs: 68, balls: 142, fours: 8, sixes: 0, strikeRate: '47.89', onStrike: true },
      { name: 'Mohammad Rizwan (WK)', runs: 34, balls: 68, fours: 4, sixes: 0, strikeRate: '50.00', onStrike: false },
    ],
    currentBowler: {
      name: 'Trent Boult',
      overs: '14.0',
      maidens: 4,
      runs: 38,
      wickets: 2,
      economy: '2.71',
    },
    currentOver: {
      overNumber: 50,
      balls: ['0', '0', '1', '0', '4', '0'],
    },
    recentOvers: [
      { overNumber: 50, balls: ['0', '0', '1', '0', '4', '0'] },
    ],
    scorecard: [],
    commentary: [
      { over: '49.5', text: 'FOUR! Elegant on-drive from Babar Azam, beating mid-on to the fence.', event: 'four' },
    ],
    squads: { team1: [], team2: [] },
  },

  // 4. BAN vs SL T20I (Upcoming)
  {
    id: 'ban-vs-sl-t20-2026',
    name: 'Bangladesh vs Sri Lanka, 1st T20I',
    series: 'Sri Lanka Tour of Bangladesh 2026',
    leagueId: 'international',
    matchType: 't20',
    category: 't20',
    format: 'T20I',
    status: '📅 Upcoming · Starts today at 6:30 PM IST',
    isLive: false,
    isCompleted: false,
    venue: 'Sher-e-Bangla National Cricket Stadium, Mirpur',
    date: '2026-09-05T13:00:00.000Z',
    toss: 'Toss at 6:00 PM IST',
    team1: { name: 'Bangladesh', shortName: 'BAN', flag: '🇧🇩', score: null, details: 'Yet to bat' },
    team2: { name: 'Sri Lanka', shortName: 'SL', flag: '🇱🇰', score: null, details: 'Yet to bat' },
    scorecard: [],
    commentary: [],
    squads: { team1: [], team2: [] },
  },

  // 5. AFG vs WI ODI (Completed)
  {
    id: 'afg-vs-wi-odi-2026',
    name: 'Afghanistan vs West Indies, 2nd ODI',
    series: 'Afghanistan vs West Indies in UAE 2026',
    leagueId: 'international',
    matchType: 'odi',
    category: 'odi',
    format: 'ODI',
    status: '✅ Afghanistan won by 38 runs',
    isLive: false,
    isCompleted: true,
    venue: 'Sharjah Cricket Stadium, UAE',
    date: '2026-09-04T10:00:00.000Z',
    toss: 'Afghanistan won the toss and elected to bat',
    team1: { name: 'Afghanistan', shortName: 'AFG', flag: '🇦🇫', score: '284/6 (50.0 ov)', details: '284/6 (50.0 ov)' },
    team2: { name: 'West Indies', shortName: 'WI', flag: '🌴', score: '246/10 (46.4 ov)', details: 'Target: 285' },
    scorecard: [],
    commentary: [],
    squads: { team1: [], team2: [] },
  },

  // 6. IRE vs ZIM T20I (Completed)
  {
    id: 'ire-vs-zim-t20-2026',
    name: 'Ireland vs Zimbabwe, 3rd T20I',
    series: 'Zimbabwe Tour of Ireland 2026',
    leagueId: 'international',
    matchType: 't20',
    category: 't20',
    format: 'T20I',
    status: '✅ Ireland won by 5 wickets',
    isLive: false,
    isCompleted: true,
    venue: 'Malahide, Dublin',
    date: '2026-09-03T14:30:00.000Z',
    toss: 'Ireland won the toss and elected to bowl',
    team1: { name: 'Ireland', shortName: 'IRE', flag: '🇮🇪', score: '168/5 (19.1 ov)', details: 'Target: 165' },
    team2: { name: 'Zimbabwe', shortName: 'ZIM', flag: '🇿🇼', score: '164/7 (20.0 ov)', details: '164/7 (20.0 ov)' },
    scorecard: [],
    commentary: [],
    squads: { team1: [], team2: [] },
  },

  // 7. IPL: CSK vs MI (Upcoming Blockbuster)
  {
    id: 'csk-vs-mi-ipl-2026',
    name: 'Chennai Super Kings vs Mumbai Indians, Match 24',
    series: 'Indian Premier League 2026',
    leagueId: 'ipl',
    matchType: 'league',
    category: 'league',
    format: 'T20',
    status: '📅 Upcoming · El Clásico of IPL · Tomorrow at 7:30 PM IST',
    isLive: false,
    isCompleted: false,
    venue: 'M. A. Chidambaram Stadium, Chepauk, Chennai',
    date: '2026-09-06T14:00:00.000Z',
    toss: 'Toss at 7:00 PM IST',
    winProbability: { team1: 52, team2: 48 },
    team1: { name: 'Chennai Super Kings', shortName: 'CSK', flag: '🦁', score: null, details: 'Match starts tomorrow' },
    team2: { name: 'Mumbai Indians', shortName: 'MI', flag: '🟦', score: null, details: 'Match starts tomorrow' },
    scorecard: [],
    commentary: [],
    squads: {
      team1: ['Ruturaj Gaikwad (C)', 'MS Dhoni (WK)', 'Ravindra Jadeja', 'Shivam Dube', 'Matheesha Pathirana', 'Rachin Ravindra'],
      team2: ['Hardik Pandya (C)', 'Rohit Sharma', 'Suryakumar Yadav', 'Ishan Kishan (WK)', 'Jasprit Bumrah', 'Tilak Varma'],
    },
  },

  // 8. IPL: RCB vs KKR (Live Thriller)
  {
    id: 'rcb-vs-kkr-ipl-2026',
    name: 'Royal Challengers Bengaluru vs Kolkata Knight Riders',
    series: 'Indian Premier League 2026',
    leagueId: 'ipl',
    matchType: 'league',
    category: 'league',
    format: 'T20',
    status: '🔴 LIVE: RCB need 42 runs in 24 balls (Target: 215)',
    isLive: true,
    isCompleted: false,
    venue: 'M. Chinnaswamy Stadium, Bengaluru',
    date: '2026-09-05T14:00:00.000Z',
    toss: 'RCB won the toss and elected to field',
    crr: '10.88',
    rrr: '10.50',
    target: 215,
    winProbability: { team1: 65, team2: 35 },
    team1: { name: 'Royal Challengers Bengaluru', shortName: 'RCB', flag: '🔴', score: '173/3 (16.0 ov)', details: '173/3 (16.0 ov) · Target: 215' },
    team2: { name: 'Kolkata Knight Riders', shortName: 'KKR', flag: '🟣', score: '214/5 (20.0 ov)', details: '214/5 (20.0 ov)' },
    currentBatters: [
      { name: 'Virat Kohli', runs: 86, balls: 48, fours: 9, sixes: 4, strikeRate: '179.17', onStrike: true },
      { name: 'Glenn Maxwell', runs: 28, balls: 14, fours: 2, sixes: 2, strikeRate: '200.00', onStrike: false },
    ],
    currentBowler: { name: 'Varun Chakaravarthy', overs: '3.0', maidens: 0, runs: 32, wickets: 1, economy: '10.67' },
    currentOver: { overNumber: 16, balls: ['1', '6', '4', '1', '2', '6'] },
    recentOvers: [{ overNumber: 16, balls: ['1', '6', '4', '1', '2', '6'] }],
    scorecard: [],
    commentary: [
      { over: '15.6', text: 'SIX! Maxwell launches it into the top tier of Chinnaswamy Stadium!', event: 'six' },
    ],
    squads: { team1: [], team2: [] },
  },

  // 9. CPL: Trinbago Knight Riders vs Guyana Amazon Warriors (Live)
  {
    id: 'tkr-vs-gaw-cpl-2026',
    name: 'Trinbago Knight Riders vs Guyana Amazon Warriors',
    series: 'Caribbean Premier League 2026',
    leagueId: 'cpl',
    matchType: 'league',
    category: 'league',
    format: 'T20',
    status: '🔴 LIVE: TKR need 18 runs in 12 balls (Target: 172)',
    isLive: true,
    isCompleted: false,
    venue: "Queen's Park Oval, Port of Spain, Trinidad",
    date: '2026-09-05T17:00:00.000Z',
    toss: 'Trinbago Knight Riders won the toss and elected to bowl',
    crr: '8.56',
    rrr: '9.00',
    target: 172,
    winProbability: { team1: 72, team2: 28 },
    team1: { name: 'Trinbago Knight Riders', shortName: 'TKR', flag: '🔴', score: '154/4 (18.0 ov)', details: '154/4 (18.0 ov)' },
    team2: { name: 'Guyana Amazon Warriors', shortName: 'GAW', flag: '🟢', score: '171/7 (20.0 ov)', details: '171/7 (20.0 ov)' },
    currentBatters: [
      { name: 'Kieron Pollard (C)', runs: 42, balls: 22, fours: 3, sixes: 4, strikeRate: '190.91', onStrike: true },
      { name: 'Andre Russell', runs: 26, balls: 11, fours: 1, sixes: 3, strikeRate: '236.36', onStrike: false },
    ],
    currentBowler: { name: 'Imran Tahir (C)', overs: '4.0', maidens: 0, runs: 28, wickets: 2, economy: '7.00' },
    currentOver: { overNumber: 18, balls: ['6', '1', '4', '0', '1', '6'] },
    recentOvers: [{ overNumber: 18, balls: ['6', '1', '4', '0', '1', '6'] }],
    scorecard: [],
    commentary: [
      { over: '18.0', text: 'SIX! Russell smashes it flat over mid-wicket for a colossal six!', event: 'six' },
    ],
    squads: { team1: [], team2: [] },
  },

  // 10. MLC: MI New York vs Texas Super Kings (Upcoming)
  {
    id: 'miny-vs-tsk-mlc-2026',
    name: 'MI New York vs Texas Super Kings, Qualifier 1',
    series: 'Major League Cricket 2026',
    leagueId: 'mlc',
    matchType: 'league',
    category: 'league',
    format: 'T20',
    status: '📅 Upcoming · Grand Prairie Stadium, Dallas · Starts at 8:00 PM Local',
    isLive: false,
    isCompleted: false,
    venue: 'Grand Prairie Stadium, Dallas, Texas',
    date: '2026-09-06T01:00:00.000Z',
    team1: { name: 'MI New York', shortName: 'MINY', flag: '🗽', score: null, details: 'Match starts at 8:00 PM' },
    team2: { name: 'Texas Super Kings', shortName: 'TSK', flag: '🤠', score: null, details: 'Match starts at 8:00 PM' },
    scorecard: [],
    commentary: [],
    squads: { team1: [], team2: [] },
  },

  // 11. BBL: Perth Scorchers vs Sydney Sixers (Completed)
  {
    id: 'perth-vs-sixers-bbl-2026',
    name: 'Perth Scorchers vs Sydney Sixers, Final',
    series: 'Big Bash League 2026',
    leagueId: 'bbl',
    matchType: 'league',
    category: 'league',
    format: 'T20',
    status: '✅ Perth Scorchers won by 6 wickets',
    isLive: false,
    isCompleted: true,
    venue: 'Optus Stadium, Perth',
    date: '2026-09-03T08:00:00.000Z',
    team1: { name: 'Perth Scorchers', shortName: 'SCO', flag: '🔥', score: '178/4 (18.4 ov)', details: 'Target: 176' },
    team2: { name: 'Sydney Sixers', shortName: 'SIX', flag: '🌸', score: '175/8 (20.0 ov)', details: '175/8 (20.0 ov)' },
    scorecard: [],
    commentary: [],
    squads: { team1: [], team2: [] },
  },

  // 12. PSL: Lahore Qalandars vs Karachi Kings (Upcoming)
  {
    id: 'lq-vs-kk-psl-2026',
    name: 'Lahore Qalandars vs Karachi Kings',
    series: 'Pakistan Super League 2026',
    leagueId: 'psl',
    matchType: 'league',
    category: 'league',
    format: 'T20',
    status: '📅 Upcoming · Gaddafi Stadium, Lahore · Starts at 8:00 PM PKT',
    isLive: false,
    isCompleted: false,
    venue: 'Gaddafi Stadium, Lahore',
    date: '2026-09-06T15:00:00.000Z',
    team1: { name: 'Lahore Qalandars', shortName: 'LQ', flag: '🟢', score: null, details: 'Yet to Bat' },
    team2: { name: 'Karachi Kings', shortName: 'KK', flag: '🔵', score: null, details: 'Yet to Bat' },
    scorecard: [],
    commentary: [],
    squads: { team1: [], team2: [] },
  },

  // 13. SA20: Sunrisers Eastern Cape vs MI Cape Town (Completed)
  {
    id: 'sec-vs-mict-sa20-2026',
    name: 'Sunrisers Eastern Cape vs MI Cape Town',
    series: 'SA20 2026',
    leagueId: 'sa20',
    matchType: 'league',
    category: 'league',
    format: 'T20',
    status: '✅ Sunrisers Eastern Cape won by 14 runs',
    isLive: false,
    isCompleted: true,
    venue: "St George's Park, Gqeberha",
    date: '2026-09-04T15:30:00.000Z',
    team1: { name: 'Sunrisers Eastern Cape', shortName: 'SEC', flag: '🟠', score: '189/6 (20.0 ov)', details: '189/6 (20.0 ov)' },
    team2: { name: 'MI Cape Town', shortName: 'MICT', flag: '🔵', score: '175/8 (20.0 ov)', details: 'Target: 190' },
    scorecard: [],
    commentary: [],
    squads: { team1: [], team2: [] },
  },

  // 14. The Hundred: Oval Invincibles vs Trent Rockets (Upcoming)
  {
    id: 'oi-vs-tr-hundred-2026',
    name: 'Oval Invincibles vs Trent Rockets',
    series: 'The Hundred 2026',
    leagueId: 'the-hundred',
    matchType: 'league',
    category: 'league',
    format: 'The Hundred (100 Balls)',
    status: '📅 Upcoming · Kia Oval, London · Starts at 6:30 PM BST',
    isLive: false,
    isCompleted: false,
    venue: 'The Kia Oval, London',
    date: '2026-09-07T17:30:00.000Z',
    team1: { name: 'Oval Invincibles', shortName: 'OVI', flag: '⚡', score: null, details: 'Match starts at 6:30 PM' },
    team2: { name: 'Trent Rockets', shortName: 'TRN', flag: '🚀', score: null, details: 'Match starts at 6:30 PM' },
    scorecard: [],
    commentary: [],
    squads: { team1: [], team2: [] },
  },
];

// Helper: Filter matches
function filterMatches(matches, tab, type, league, search) {
  let list = [...matches];

  // Tab filter: live / upcoming / recent (completed) / all
  if (tab === 'live') {
    list = list.filter((m) => m.isLive);
  } else if (tab === 'upcoming') {
    list = list.filter((m) => !m.isLive && !m.isCompleted);
  } else if (tab === 'recent') {
    list = list.filter((m) => m.isCompleted);
  }

  // League / competition filter
  if (league && league !== 'all') {
    if (league === 'international') {
      list = list.filter((m) => m.leagueId === 'international' || ['test', 'odi', 't20'].includes(m.matchType));
    } else {
      list = list.filter((m) => m.leagueId === league || m.series?.toLowerCase().includes(league.toLowerCase()));
    }
  }

  // Format filter (test, odi, t20, league)
  if (type && type !== 'all') {
    list = list.filter((m) => m.category === type || m.matchType === type);
  }

  // Search filter (team, tournament, venue, etc.)
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      m.series.toLowerCase().includes(q) ||
      m.team1.name.toLowerCase().includes(q) ||
      m.team2.name.toLowerCase().includes(q) ||
      (m.venue && m.venue.toLowerCase().includes(q))
    );
  }

  return list;
}

// ---------------------------------------------------------------------------
// External API Fetcher (with CricAPI if API Key present)
// ---------------------------------------------------------------------------
async function fetchFromCricApi(endpoint) {
  if (!process.env.CRICKET_API_KEY) return null;
  try {
    const url = `${CRICAPI_BASE}/${endpoint}?apikey=${process.env.CRICKET_API_KEY}&offset=0`;
    const data = await cachedFetch(endpoint, url);
    return data?.data || null;
  } catch (err) {
    console.warn('CricAPI fetch warning:', err.message);
    return null;
  }
}

function normalizeCricApiMatch(m) {
  const teams = m.teams || [];
  const scoreFor = (teamName) => (m.score || []).find((s) => s.inning?.toLowerCase().includes((teamName || '').toLowerCase()));

  const matchType = (m.matchType || 't20').toLowerCase();
  let category = 't20';
  if (matchType.includes('test')) category = 'test';
  else if (matchType.includes('odi')) category = 'odi';
  else if (matchType.includes('women')) category = 'women';

  return {
    id: m.id,
    name: m.name,
    series: m.series || m.name || '',
    matchType: matchType,
    category: category,
    format: category.toUpperCase(),
    leagueId: matchType.includes('league') ? 'ipl' : 'international',
    status: m.status || (m.matchStarted ? (m.matchEnded ? 'Completed' : 'LIVE') : 'Upcoming'),
    isLive: Boolean(m.matchStarted && !m.matchEnded),
    isCompleted: Boolean(m.matchEnded),
    venue: m.venue || '',
    date: m.date || m.dateTimeGMT || null,
    toss: m.tossWinner ? `${m.tossWinner} won the toss` : '',
    winProbability: { team1: 50, team2: 50 },
    team1: {
      name: teams[0] || 'Team A',
      shortName: teams[0]?.slice(0, 3)?.toUpperCase() || 'TMA',
      flag: '🏏',
      score: scoreFor(teams[0]) ? `${scoreFor(teams[0]).r}/${scoreFor(teams[0]).w} (${scoreFor(teams[0]).o} ov)` : null,
      details: '',
    },
    team2: {
      name: teams[1] || 'Team B',
      shortName: teams[1]?.slice(0, 3)?.toUpperCase() || 'TMB',
      flag: '🏏',
      score: scoreFor(teams[1]) ? `${scoreFor(teams[1]).r}/${scoreFor(teams[1]).w} (${scoreFor(teams[1]).o} ov)` : null,
      details: '',
    },
    currentBatters: [],
    currentBowler: null,
    currentOver: null,
    recentOvers: [],
    scorecard: [],
    commentary: [],
    squads: { team1: [], team2: [] },
  };
}

// ---------------------------------------------------------------------------
// ROUTES
// ---------------------------------------------------------------------------

// 1. Get List of Leagues/Competitions
router.get('/leagues', (req, res) => {
  res.json(LEAGUES_REGISTRY);
});

// 2. Get All Matches (with rich tabs, leagues, formats, search)
router.get('/all', async (req, res) => {
  const { tab = 'all', type = 'all', league = 'all', search = '' } = req.query;
  const externalData = await fetchFromCricApi('currentMatches');

  let allMatches = [...MOCK_CRICKET_MATCHES];

  if (externalData && externalData.length > 0) {
    const fetched = externalData.map(normalizeCricApiMatch);
    const fetchedIds = new Set(fetched.map((m) => String(m.id)));
    const uniqueMocks = MOCK_CRICKET_MATCHES.filter((m) => !fetchedIds.has(String(m.id)));
    allMatches = [...fetched, ...uniqueMocks];
  }

  const result = filterMatches(allMatches, tab, type, league, search);
  res.json(result);
});

// 3. Live Matches Only
router.get('/live', async (req, res) => {
  const { type = 'all', league = 'all', search = '' } = req.query;
  const externalData = await fetchFromCricApi('currentMatches');
  let allMatches = [...MOCK_CRICKET_MATCHES];

  if (externalData && externalData.length > 0) {
    const fetched = externalData.map(normalizeCricApiMatch);
    const fetchedIds = new Set(fetched.map((m) => String(m.id)));
    allMatches = [...fetched, ...MOCK_CRICKET_MATCHES.filter((m) => !fetchedIds.has(String(m.id)))];
  }

  const result = filterMatches(allMatches, 'live', type, league, search);
  res.json(result);
});

// 4. Upcoming Matches
router.get('/upcoming', async (req, res) => {
  const { type = 'all', league = 'all', search = '' } = req.query;
  const result = filterMatches(MOCK_CRICKET_MATCHES, 'upcoming', type, league, search);
  res.json(result);
});

// 5. Recent / Completed Matches
router.get('/recent', async (req, res) => {
  const { type = 'all', league = 'all', search = '' } = req.query;
  const result = filterMatches(MOCK_CRICKET_MATCHES, 'recent', type, league, search);
  res.json(result);
});

// 6. Single Match Detailed View
router.get('/matches/:id', async (req, res) => {
  const { id } = req.params;

  const mockMatch = MOCK_CRICKET_MATCHES.find((m) => String(m.id) === String(id));
  if (mockMatch) {
    return res.json(mockMatch);
  }

  // CricAPI fallback
  if (process.env.CRICKET_API_KEY) {
    try {
      const url = `${CRICAPI_BASE}/match_scorecard?apikey=${process.env.CRICKET_API_KEY}&id=${id}`;
      const data = await cachedFetch(`match:${id}`, url);
      const m = data?.data;
      if (m) {
        const normalized = normalizeCricApiMatch(m);
        normalized.scorecard = (m.scorecard || []).map((inning) => ({
          inningName: inning.inning,
          teamName: inning.inning?.split(' ')[0] || '',
          runs: inning.r,
          wickets: inning.w,
          overs: inning.o,
          batting: (inning.batting || []).map((b) => ({
            name: b.batsman?.name,
            dismissal: b['dismissal-text'],
            runs: b.r,
            balls: b.b,
            fours: b['4s'],
            sixes: b['6s'],
            strikeRate: b.sr,
          })),
          bowling: (inning.bowling || []).map((b) => ({
            name: b.bowler?.name,
            overs: b.o,
            maidens: b.m,
            runs: b.r,
            wickets: b.w,
            economy: b.eco,
          })),
        }));
        return res.json(normalized);
      }
    } catch (err) {
      console.warn('CricAPI match fetch error:', err.message);
    }
  }

  return res.status(404).json({ message: 'Match details not found' });
});

module.exports = router;