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
// Fallback Rich Cricbuzz Data Store
// Provides hyper-realistic Cricbuzz match data when API key is unconfigured or rate limited
// ---------------------------------------------------------------------------
const MOCK_CRICKET_MATCHES = [
  {
    id: 'ind-vs-sl-test-1',
    name: 'India vs Sri Lanka, 1st Test',
    series: 'Sri Lanka tour of India, 2026',
    matchType: 'test', // test, odi, t20, league, women
    category: 'test',
    status: '🔴 Day 4 - LIVE: Sri Lanka need 214 runs to win (Target: 423)',
    isLive: true,
    isCompleted: false,
    venue: 'M. Chinnaswamy Stadium, Bengaluru',
    date: '2026-08-18T04:00:00.000Z',
    toss: 'India won the toss and elected to bat first',
    umpires: 'Richard Illingworth, Nitin Menon',
    referee: 'Javagal Srinath',
    winProbability: { team1: 92, team2: 8 },
    team1: {
      name: 'India',
      shortName: 'IND',
      flag: '🇮🇳',
      score: '445 & 252/9d',
      details: '445/10 (118.2 ov) & 252/9d (68.5 ov)',
    },
    team2: {
      name: 'Sri Lanka',
      shortName: 'SL',
      flag: '🇱🇰',
      score: '174 & 208',
      details: '174/10 (65.0 ov) & 208/10 (59.3 ov)',
    },
    scorecard: [
      {
        inningName: 'India 1st Innings',
        teamName: 'India',
        runs: 445,
        wickets: 10,
        overs: '118.2',
        batting: [
          { name: 'Rohit Sharma (C)', dismissal: 'c Mendis b Jayasuriya', runs: 120, balls: 194, fours: 14, sixes: 3, strikeRate: '61.86' },
          { name: 'Yashasvi Jaiswal', dismissal: 'b Rajitha', runs: 54, balls: 88, fours: 7, sixes: 1, strikeRate: '61.36' },
          { name: 'Shubman Gill', dismissal: 'lbw b Jayasuriya', runs: 32, balls: 56, fours: 4, sixes: 0, strikeRate: '57.14' },
          { name: 'Virat Kohli', dismissal: 'lbw b Dhananjaya', runs: 89, balls: 142, fours: 9, sixes: 1, strikeRate: '62.68' },
          { name: 'Rishabh Pant (WK)', dismissal: 'c & b Jayasuriya', runs: 96, balls: 97, fours: 11, sixes: 4, strikeRate: '98.97' },
          { name: 'Shreyas Iyer', dismissal: 'c Dickwella b Jayasuriya', runs: 27, balls: 45, fours: 3, sixes: 0, strikeRate: '60.00' },
          { name: 'Ravindra Jadeja', dismissal: 'c Karunaratne b Fernando', runs: 18, balls: 34, fours: 2, sixes: 0, strikeRate: '52.94' },
          { name: 'Ravichandran Ashwin', dismissal: 'b Jayasuriya', runs: 6, balls: 15, fours: 1, sixes: 0, strikeRate: '40.00' },
          { name: 'Kuldeep Yadav', dismissal: 'not out', runs: 12, balls: 28, fours: 1, sixes: 0, strikeRate: '42.86' },
          { name: 'Jasprit Bumrah', dismissal: 'c Mendis b Rajitha', runs: 2, balls: 8, fours: 0, sixes: 0, strikeRate: '25.00' },
          { name: 'Mohammed Siraj', dismissal: 'b Fernando', runs: 0, balls: 2, fours: 0, sixes: 0, strikeRate: '0.00' }
        ],
        bowling: [
          { name: 'Kasun Rajitha', overs: '22.0', maidens: 4, runs: 78, wickets: 2, economy: '3.55' },
          { name: 'Vishwa Fernando', overs: '18.2', maidens: 3, runs: 69, wickets: 2, economy: '3.76' },
          { name: 'Prabath Jayasuriya', overs: '42.0', maidens: 8, runs: 145, wickets: 5, economy: '3.45' },
          { name: 'Dhananjaya de Silva', overs: '21.0', maidens: 2, runs: 82, wickets: 1, economy: '3.90' },
          { name: 'Ramesh Mendis', overs: '15.0', maidens: 1, runs: 61, wickets: 0, economy: '4.07' }
        ]
      },
      {
        inningName: 'Sri Lanka 1st Innings',
        teamName: 'Sri Lanka',
        runs: 174,
        wickets: 10,
        overs: '65.0',
        batting: [
          { name: 'Dimuth Karunaratne (C)', dismissal: 'b Shami', runs: 28, balls: 52, fours: 4, sixes: 0, strikeRate: '53.85' },
          { name: 'Pathum Nissanka', dismissal: 'c Pant b Bumrah', runs: 61, balls: 110, fours: 8, sixes: 1, strikeRate: '55.45' },
          { name: 'Kusal Mendis', dismissal: 'c Kohli b Ashwin', runs: 38, balls: 64, fours: 5, sixes: 0, strikeRate: '59.38' },
          { name: 'Angelo Mathews', dismissal: 'c Rohit b Bumrah', runs: 12, balls: 30, fours: 1, sixes: 0, strikeRate: '40.00' },
          { name: 'Dhananjaya de Silva', dismissal: 'lbw b Ashwin', runs: 10, balls: 25, fours: 1, sixes: 0, strikeRate: '40.00' },
          { name: 'Charith Asalanka', dismissal: 'c & b Bumrah', runs: 5, balls: 16, fours: 0, sixes: 0, strikeRate: '31.25' },
          { name: 'Niroshan Dickwella (WK)', dismissal: 'c Pant b Jadeja', runs: 14, balls: 28, fours: 2, sixes: 0, strikeRate: '50.00' },
          { name: 'Prabath Jayasuriya', dismissal: 'b Bumrah', runs: 0, balls: 4, fours: 0, sixes: 0, strikeRate: '0.00' },
          { name: 'Ramesh Mendis', dismissal: 'b Ashwin', runs: 2, balls: 12, fours: 0, sixes: 0, strikeRate: '16.67' },
          { name: 'Vishwa Fernando', dismissal: 'not out', runs: 0, balls: 6, fours: 0, sixes: 0, strikeRate: '0.00' },
          { name: 'Kasun Rajitha', dismissal: 'b Bumrah', runs: 0, balls: 3, fours: 0, sixes: 0, strikeRate: '0.00' }
        ],
        bowling: [
          { name: 'Jasprit Bumrah', overs: '17.0', maidens: 6, runs: 24, wickets: 5, economy: '1.41' },
          { name: 'Mohammed Siraj', overs: '10.0', maidens: 2, runs: 38, wickets: 1, economy: '3.80' },
          { name: 'Ravichandran Ashwin', overs: '20.0', maidens: 5, runs: 46, wickets: 3, economy: '2.30' },
          { name: 'Ravindra Jadeja', overs: '12.0', maidens: 3, runs: 32, wickets: 1, economy: '2.67' },
          { name: 'Kuldeep Yadav', overs: '6.0', maidens: 1, runs: 28, wickets: 0, economy: '4.67' }
        ]
      },
      {
        inningName: 'India 2nd Innings',
        teamName: 'India',
        runs: 252,
        wickets: 9,
        overs: '68.5',
        batting: [
          { name: 'Mayank Agarwal', dismissal: 'run out (Sub)', runs: 22, balls: 40, fours: 3, sixes: 0, strikeRate: '55.00' },
          { name: 'Rohit Sharma (C)', dismissal: 'c Mathews b Dhananjaya', runs: 46, balls: 79, fours: 4, sixes: 1, strikeRate: '58.23' },
          { name: 'Hanuma Vihari', dismissal: 'b Praveen', runs: 35, balls: 74, fours: 4, sixes: 0, strikeRate: '47.30' },
          { name: 'Virat Kohli', dismissal: 'lbw b Praveen', runs: 13, balls: 31, fours: 1, sixes: 0, strikeRate: '41.94' },
          { name: 'Rishabh Pant (WK)', dismissal: 'c & b Praveen', runs: 50, balls: 31, fours: 7, sixes: 2, strikeRate: '161.29' },
          { name: 'Shreyas Iyer', dismissal: 'lbw b Jayasuriya', runs: 92, balls: 111, fours: 9, sixes: 0, strikeRate: '82.88' },
          { name: 'Ravindra Jadeja', dismissal: 'b Vishwa', runs: 22, balls: 45, fours: 2, sixes: 0, strikeRate: '48.89' },
          { name: 'Ravichandran Ashwin', dismissal: 'c Dickwella b Jayasuriya', runs: 13, balls: 19, fours: 1, sixes: 0, strikeRate: '68.42' },
          { name: 'Axar Patel', dismissal: 'b Suranga', runs: 9, balls: 12, fours: 1, sixes: 0, strikeRate: '75.00' },
          { name: 'Mohammed Shami', dismissal: 'not out', runs: 16, balls: 10, fours: 2, sixes: 1, strikeRate: '160.00' }
        ],
        bowling: [
          { name: 'Suranga Lakmal', overs: '10.0', maidens: 1, runs: 34, wickets: 1, economy: '3.40' },
          { name: 'Vishwa Fernando', overs: '9.0', maidens: 0, runs: 48, wickets: 1, economy: '5.33' },
          { name: 'Praveen Jayawickrama', overs: '19.0', maidens: 2, runs: 78, wickets: 4, economy: '4.11' },
          { name: 'Dhananjaya de Silva', overs: '12.0', maidens: 1, runs: 42, wickets: 1, economy: '3.50' },
          { name: 'Prabath Jayasuriya', overs: '18.5', maidens: 3, runs: 48, wickets: 2, economy: '2.55' }
        ]
      },
      {
        inningName: 'Sri Lanka 2nd Innings',
        teamName: 'Sri Lanka',
        runs: 208,
        wickets: 10,
        overs: '59.3',
        batting: [
          { name: 'Dimuth Karunaratne (C)', dismissal: 'b Bumrah', runs: 107, balls: 174, fours: 15, sixes: 0, strikeRate: '61.49' },
          { name: 'Lahiru Thirimanne', dismissal: 'lbw b Shami', runs: 0, balls: 6, fours: 0, sixes: 0, strikeRate: '0.00' },
          { name: 'Kusal Mendis', dismissal: 'st Pant b Ashwin', runs: 54, balls: 60, fours: 8, sixes: 0, strikeRate: '90.00' },
          { name: 'Angelo Mathews', dismissal: 'b Jadeja', runs: 1, balls: 5, fours: 0, sixes: 0, strikeRate: '20.00' },
          { name: 'Dhananjaya de Silva', dismissal: 'c Vihari b Ashwin', runs: 4, balls: 21, fours: 0, sixes: 0, strikeRate: '19.05' },
          { name: 'Niroshan Dickwella', dismissal: 'st Pant b Axar', runs: 12, balls: 19, fours: 1, sixes: 0, strikeRate: '63.16' },
          { name: 'Charith Asalanka', dismissal: 'c Rohit b Axar', runs: 5, balls: 18, fours: 1, sixes: 0, strikeRate: '27.78' },
          { name: 'Lasith Embuldeniya', dismissal: 'lbw b Ashwin', runs: 2, balls: 11, fours: 0, sixes: 0, strikeRate: '18.18' },
          { name: 'Suranga Lakmal', dismissal: 'b Jasprit', runs: 1, balls: 3, fours: 0, sixes: 0, strikeRate: '33.33' },
          { name: 'Praveen Jayawickrama', dismissal: 'c substitute b Ashwin', runs: 0, balls: 7, fours: 0, sixes: 0, strikeRate: '0.00' },
          { name: 'Vishwa Fernando', dismissal: 'not out', runs: 2, balls: 3, fours: 0, sixes: 0, strikeRate: '66.67' }
        ],
        bowling: [
          { name: 'Jasprit Bumrah', overs: '9.0', maidens: 1, runs: 23, wickets: 3, economy: '2.56' },
          { name: 'Mohammed Shami', overs: '6.0', maidens: 0, runs: 26, wickets: 1, economy: '4.33' },
          { name: 'Ravichandran Ashwin', overs: '19.3', maidens: 3, runs: 55, wickets: 4, economy: '2.82' },
          { name: 'Ravindra Jadeja', overs: '14.0', maidens: 2, runs: 48, wickets: 1, economy: '3.43' },
          { name: 'Axar Patel', overs: '11.0', maidens: 1, runs: 42, wickets: 2, economy: '3.82' }
        ]
      }
    ],
    commentary: [
      { over: '59.3', text: 'OUT! Cleaned him up! Ashwin gets the final wicket! PraveenJayawickrama steps out, misses completely and India win by 238 runs!', event: 'wicket' },
      { over: '59.1', text: 'Ashwin into the attack. Full length around off, defended forward.', event: 'dot' },
      { over: '58.6', text: 'Bumrah bowls a blistering yorker! Blocked nicely by Karunaratne.', event: 'dot' },
      { over: '58.4', text: 'FOUR! Driven beautifully through extra cover! Dimuth Karunaratne completes a sensational Test hundred!', event: 'four' },
      { over: '57.2', text: 'SIX! Rishabh Pant steps out and lofts Jayasuriya over long-on for a huge six!', event: 'six' }
    ],
    squads: {
      team1: ['Rohit Sharma (C)', 'Yashasvi Jaiswal', 'Shubman Gill', 'Virat Kohli', 'Rishabh Pant (WK)', 'Shreyas Iyer', 'Ravindra Jadeja', 'Ravichandran Ashwin', 'Kuldeep Yadav', 'Jasprit Bumrah', 'Mohammed Siraj'],
      team2: ['Dimuth Karunaratne (C)', 'Pathum Nissanka', 'Kusal Mendis', 'Angelo Mathews', 'Dhananjaya de Silva', 'Charith Asalanka', 'Niroshan Dickwella (WK)', 'Prabath Jayasuriya', 'Ramesh Mendis', 'Vishwa Fernando', 'Kasun Rajitha']
    }
  },
  {
    id: 'ind-vs-aus-t20-2',
    name: 'India vs Australia, 2nd T20I',
    series: 'Australia tour of India, 2026',
    matchType: 't20',
    category: 't20',
    status: '🔴 LIVE: India need 28 runs in 18 balls',
    isLive: true,
    isCompleted: false,
    venue: 'Wankhede Stadium, Mumbai',
    date: '2026-08-19T13:30:00.000Z',
    toss: 'India won the toss and elected to field',
    umpires: 'K. N. Ananthapadmanabhan, Rohan Pandit',
    referee: 'Javagal Srinath',
    winProbability: { team1: 76, team2: 24 },
    team1: {
      name: 'India',
      shortName: 'IND',
      flag: '🇮🇳',
      score: '159/3 (17.0 ov)',
      details: 'Target: 187 runs',
    },
    team2: {
      name: 'Australia',
      shortName: 'AUS',
      flag: '🇦🇺',
      score: '186/6 (20.0 ov)',
      details: '186/6 (20.0 ov)',
    },
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
          { name: 'Tim David', dismissal: 'b Bumrah', runs: 12, balls: 8, fours: 1, sixes: 1, strikeRate: '150.00' }
        ],
        bowling: [
          { name: 'Jasprit Bumrah', overs: '4.0', maidens: 0, runs: 28, wickets: 2, economy: '7.00' },
          { name: 'Arshdeep Singh', overs: '4.0', maidens: 0, runs: 42, wickets: 2, economy: '10.50' },
          { name: 'Axar Patel', overs: '4.0', maidens: 0, runs: 34, wickets: 1, economy: '8.50' },
          { name: 'Kuldeep Yadav', overs: '4.0', maidens: 0, runs: 38, wickets: 1, economy: '9.50' },
          { name: 'Hardik Pandya', overs: '4.0', maidens: 0, runs: 40, wickets: 0, economy: '10.00' }
        ]
      },
      {
        inningName: 'India Innings (Chasing)',
        teamName: 'India',
        runs: 159,
        wickets: 3,
        overs: '17.0',
        batting: [
          { name: 'Yashasvi Jaiswal', dismissal: 'c Stoinis b Zampa', runs: 36, balls: 21, fours: 5, sixes: 1, strikeRate: '171.43' },
          { name: 'Abhishek Sharma', dismissal: 'c Head b Cummins', runs: 22, balls: 14, fours: 3, sixes: 1, strikeRate: '157.14' },
          { name: 'Suryakumar Yadav (C)', dismissal: 'not out', runs: 68, balls: 39, fours: 6, sixes: 4, strikeRate: '174.36' },
          { name: 'Sanju Samson (WK)', dismissal: 'b Ellis', runs: 14, balls: 12, fours: 1, sixes: 0, strikeRate: '116.67' },
          { name: 'Hardik Pandya', dismissal: 'not out', runs: 16, balls: 11, fours: 1, sixes: 1, strikeRate: '145.45' }
        ],
        bowling: [
          { name: 'Pat Cummins', overs: '4.0', maidens: 0, runs: 36, wickets: 1, economy: '9.00' },
          { name: 'Mitchell Starc', overs: '3.0', maidens: 0, runs: 32, wickets: 0, economy: '10.67' },
          { name: 'Adam Zampa', overs: '4.0', maidens: 0, runs: 34, wickets: 1, economy: '8.50' },
          { name: 'Nathan Ellis', overs: '3.0', maidens: 0, runs: 28, wickets: 1, economy: '9.33' },
          { name: 'Marcus Stoinis', overs: '3.0', maidens: 0, runs: 28, wickets: 0, economy: '9.33' }
        ]
      }
    ],
    commentary: [
      { over: '16.6', text: 'FOUR! Scoop shot over short fine leg by Suryakumar Yadav! Pure class!', event: 'four' },
      { over: '16.4', text: 'SIX! Hardik Pandya sends Cummins straight back over his head into the stands!', event: 'six' },
      { over: '15.3', text: 'Single taken towards deep cover. India keep the scoreboard ticking.', event: 'dot' },
      { over: '14.1', text: 'FIFTY for Suryakumar Yadav off just 31 balls! High quality innings.', event: 'four' }
    ],
    squads: {
      team1: ['Suryakumar Yadav (C)', 'Yashasvi Jaiswal', 'Abhishek Sharma', 'Sanju Samson (WK)', 'Hardik Pandya', 'Rinku Singh', 'Axar Patel', 'Kuldeep Yadav', 'Jasprit Bumrah', 'Arshdeep Singh', 'Ravi Bishnoi'],
      team2: ['Mitchell Marsh (C)', 'Travis Head', 'Josh Inglis (WK)', 'Glenn Maxwell', 'Marcus Stoinis', 'Tim David', 'Matthew Short', 'Pat Cummins', 'Mitchell Starc', 'Adam Zampa', 'Nathan Ellis']
    }
  },
  {
    id: 'eng-vs-sa-odi-3',
    name: 'England vs South Africa, 3rd ODI',
    series: 'South Africa tour of England, 2026',
    matchType: 'odi',
    category: 'odi',
    status: '✅ England won by 42 runs',
    isLive: false,
    isCompleted: true,
    venue: "Lord's, London",
    date: '2026-08-17T10:00:00.000Z',
    toss: 'England won the toss and elected to bat',
    umpires: 'Kumar Dharmasena, Alex Wharf',
    referee: 'Richie Richardson',
    winProbability: { team1: 100, team2: 0 },
    team1: {
      name: 'England',
      shortName: 'ENG',
      flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      score: '312/7 (50.0 ov)',
      details: '312/7 (50.0 ov)',
    },
    team2: {
      name: 'South Africa',
      shortName: 'SA',
      flag: '🇿🇦',
      score: '270/10 (47.1 ov)',
      details: 'Target: 313 runs',
    },
    scorecard: [
      {
        inningName: 'England Innings',
        teamName: 'England',
        runs: 312,
        wickets: 7,
        overs: '50.0',
        batting: [
          { name: 'Phil Salt (WK)', dismissal: 'c Klaasen b Rabada', runs: 74, balls: 62, fours: 9, sixes: 2, strikeRate: '119.35' },
          { name: 'Harry Brook (C)', dismissal: 'c Jansen b Shamsi', runs: 110, balls: 98, fours: 12, sixes: 3, strikeRate: '112.24' },
          { name: 'Liam Livingstone', dismissal: 'not out', runs: 45, balls: 28, fours: 3, sixes: 3, strikeRate: '160.71' }
        ],
        bowling: [
          { name: 'Kagiso Rabada', overs: '10.0', maidens: 1, runs: 58, wickets: 3, economy: '5.80' },
          { name: 'Anrich Nortje', overs: '10.0', maidens: 0, runs: 64, wickets: 2, economy: '6.40' }
        ]
      },
      {
        inningName: 'South Africa Innings',
        teamName: 'South Africa',
        runs: 270,
        wickets: 10,
        overs: '47.1',
        batting: [
          { name: 'Aiden Markram (C)', dismissal: 'c Buttler b Rashid', runs: 82, balls: 84, fours: 8, sixes: 2, strikeRate: '97.62' },
          { name: 'Heinrich Klaasen', dismissal: 'c Brook b Wood', runs: 65, balls: 52, fours: 5, sixes: 4, strikeRate: '125.00' }
        ],
        bowling: [
          { name: 'Adil Rashid', overs: '10.0', maidens: 0, runs: 48, wickets: 4, economy: '4.80' },
          { name: 'Mark Wood', overs: '8.1', maidens: 1, runs: 42, wickets: 3, economy: '5.14' }
        ]
      }
    ],
    commentary: [
      { over: '47.1', text: 'OUT! Mark Wood cleans up Rabada! England win by 42 runs and seal the ODI series 2-1!', event: 'wicket' }
    ],
    squads: {
      team1: ['Harry Brook (C)', 'Phil Salt (WK)', 'Ben Duckett', 'Joe Root', 'Liam Livingstone', 'Sam Curran', 'Adil Rashid', 'Mark Wood'],
      team2: ['Aiden Markram (C)', 'Quinton de Kock (WK)', 'Rassie van der Dussen', 'Heinrich Klaasen', 'David Miller', 'Marco Jansen', 'Kagiso Rabada']
    }
  },
  {
    id: 'mi-vs-csk-ipl-2026',
    name: 'Mumbai Indians vs Chennai Super Kings, Match 18',
    series: 'Indian Premier League 2026',
    matchType: 'league',
    category: 'league',
    status: '📅 Upcoming · Starts tomorrow at 7:30 PM IST',
    isLive: false,
    isCompleted: false,
    venue: 'Wankhede Stadium, Mumbai',
    date: '2026-08-20T14:00:00.000Z',
    toss: 'Toss at 7:00 PM IST',
    umpires: 'TBD',
    referee: 'TBD',
    winProbability: { team1: 50, team2: 50 },
    team1: { name: 'Mumbai Indians', shortName: 'MI', flag: '🟦', score: null, details: 'Match starts at 7:30 PM' },
    team2: { name: 'Chennai Super Kings', shortName: 'CSK', flag: '🟨', score: null, details: 'Match starts at 7:30 PM' },
    scorecard: [],
    commentary: [],
    squads: {
      team1: ['Hardik Pandya (C)', 'Rohit Sharma', 'Suryakumar Yadav', 'Ishan Kishan (WK)', 'Jasprit Bumrah', 'Tilak Varma'],
      team2: ['Ruturaj Gaikwad (C)', 'MS Dhoni (WK)', 'Ravindra Jadeja', 'Shivam Dube', 'Matheesha Pathirana', 'Rachin Ravindra']
    }
  },
  {
    id: 'aus-w-vs-ind-w-odi-1',
    name: 'Australia Women vs India Women, 1st ODI',
    series: 'India Women tour of Australia, 2026',
    matchType: 'women',
    category: 'women',
    status: '🔴 LIVE: Australia Women batting in 1st Innings',
    isLive: true,
    isCompleted: false,
    venue: 'MCG, Melbourne',
    date: '2026-08-19T06:00:00.000Z',
    toss: 'Australia Women won the toss and elected to bat',
    umpires: 'Claire Polosak, Eloise Sheridan',
    referee: 'GS Lakshmi',
    winProbability: { team1: 65, team2: 35 },
    team1: { name: 'Australia Women', shortName: 'AUS-W', flag: '🇦🇺', score: '215/4 (40.2 ov)', details: '215/4 (40.2 ov)' },
    team2: { name: 'India Women', shortName: 'IND-W', flag: '🇮🇳', score: 'Yet to bat', details: 'Yet to bat' },
    scorecard: [
      {
        inningName: 'Australia Women 1st Innings',
        teamName: 'Australia Women',
        runs: 215,
        wickets: 4,
        overs: '40.2',
        batting: [
          { name: 'Alyssa Healy (C & WK)', dismissal: 'c Mandhana b Deepti', runs: 64, balls: 72, fours: 8, sixes: 1, strikeRate: '88.89' },
          { name: 'Beth Mooney', dismissal: 'not out', runs: 78, balls: 85, fours: 9, sixes: 0, strikeRate: '91.76' },
          { name: 'Ellyse Perry', dismissal: 'c Harmanpreet b Renuka', runs: 32, balls: 40, fours: 4, sixes: 0, strikeRate: '80.00' }
        ],
        bowling: [
          { name: 'Deepti Sharma', overs: '9.0', maidens: 1, runs: 42, wickets: 2, economy: '4.67' },
          { name: 'Renuka Singh', overs: '8.0', maidens: 0, runs: 38, wickets: 1, economy: '4.75' }
        ]
      }
    ],
    commentary: [
      { over: '40.2', text: 'FOUR! Beth Mooney cuts it fine past third man for four runs!', event: 'four' }
    ],
    squads: {
      team1: ['Alyssa Healy (C & WK)', 'Beth Mooney', 'Ellyse Perry', 'Ashleigh Gardner', 'Tahlia McGrath', 'Megan Schutt'],
      team2: ['Harmanpreet Kaur (C)', 'Smriti Mandhana', 'Shafali Verma', 'Jemimah Rodrigues', 'Deepti Sharma', 'Richa Ghosh (WK)']
    }
  }
];

function filterMatches(matches, tab, type, search) {
  let list = [...matches];

  if (tab === 'live') {
    list = list.filter((m) => m.isLive);
  } else if (tab === 'upcoming') {
    list = list.filter((m) => !m.isLive && !m.isCompleted);
  } else if (tab === 'recent') {
    list = list.filter((m) => m.isCompleted);
  }

  if (type && type !== 'all') {
    list = list.filter((m) => m.category === type || m.matchType === type);
  }

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
    scorecard: [],
    commentary: [],
    squads: { team1: [], team2: [] }
  };
}

// --- Routes ----------------------------------------------------------------

// Get matches for list/grid view with filters
router.get('/all', async (req, res) => {
  const { tab = 'all', type = 'all', search = '' } = req.query;
  const externalData = await fetchFromCricApi('currentMatches');

  let allMatches = [...MOCK_CRICKET_MATCHES];

  if (externalData && externalData.length > 0) {
    const fetched = externalData.map(normalizeCricApiMatch);
    // Combine fetched with fallback list without duplication
    const fetchedIds = new Set(fetched.map((m) => String(m.id)));
    const uniqueMocks = MOCK_CRICKET_MATCHES.filter((m) => !fetchedIds.has(String(m.id)));
    allMatches = [...fetched, ...uniqueMocks];
  }

  const result = filterMatches(allMatches, tab, type, search);
  res.json(result);
});

router.get('/live', async (req, res) => {
  const { type = 'all', search = '' } = req.query;
  const externalData = await fetchFromCricApi('currentMatches');
  let allMatches = [...MOCK_CRICKET_MATCHES];

  if (externalData && externalData.length > 0) {
    const fetched = externalData.map(normalizeCricApiMatch);
    const fetchedIds = new Set(fetched.map((m) => String(m.id)));
    allMatches = [...fetched, ...MOCK_CRICKET_MATCHES.filter((m) => !fetchedIds.has(String(m.id)))];
  }

  const result = filterMatches(allMatches, 'live', type, search);
  res.json(result);
});

router.get('/upcoming', async (req, res) => {
  const { type = 'all', search = '' } = req.query;
  const externalData = await fetchFromCricApi('currentMatches');
  let allMatches = [...MOCK_CRICKET_MATCHES];

  if (externalData && externalData.length > 0) {
    const fetched = externalData.map(normalizeCricApiMatch);
    const fetchedIds = new Set(fetched.map((m) => String(m.id)));
    allMatches = [...fetched, ...MOCK_CRICKET_MATCHES.filter((m) => !fetchedIds.has(String(m.id)))];
  }

  const result = filterMatches(allMatches, 'upcoming', type, search);
  res.json(result);
});

router.get('/recent', async (req, res) => {
  const { type = 'all', search = '' } = req.query;
  const externalData = await fetchFromCricApi('currentMatches');
  let allMatches = [...MOCK_CRICKET_MATCHES];

  if (externalData && externalData.length > 0) {
    const fetched = externalData.map(normalizeCricApiMatch);
    const fetchedIds = new Set(fetched.map((m) => String(m.id)));
    allMatches = [...fetched, ...MOCK_CRICKET_MATCHES.filter((m) => !fetchedIds.has(String(m.id)))];
  }

  const result = filterMatches(allMatches, 'recent', type, search);
  res.json(result);
});

// Single Match Detailed Endpoint (Scorecard, Info, Commentary, Squads)
router.get('/matches/:id', async (req, res) => {
  const { id } = req.params;

  // Check fallback store first for instant high-detail matches (like India vs Sri Lanka Test)
  const mockMatch = MOCK_CRICKET_MATCHES.find((m) => String(m.id) === String(id));
  if (mockMatch) {
    return res.json(mockMatch);
  }

  // If not found in mock, try CricAPI if key present
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