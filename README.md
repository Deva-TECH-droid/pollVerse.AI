# 🗳️ PollVerse — Real-Time Voting & Live Cricket Scores

PollVerse is a real-time engagement platform that combines **instant polling** with **live cricket score tracking** in one seamless experience. Users log in with email OTP, create polls, vote instantly, and now also follow live cricket matches — all updated in real time via Socket.IO.

![Node](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-black?logo=socket.io)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## ✨ Features

### 🗳️ Polling
- Email OTP authentication (JWT-based, passwordless)
- Create polls with 2–6 options
- One-time voting with **live results** streamed via Socket.IO
- Polls auto-close after 12 hours
- Automatic email alerts to all verified users when a new poll goes live
- Responsive React UI with smooth GSAP animations

### 🏏 Live Cricket Scores
- **Live match dashboard** — ongoing, upcoming, and recently finished matches in one view
- **Real-time score updates** pushed over the same Socket.IO connection used for polls (no page refresh needed)
- **Match cards** showing team names/flags, current score, overs, run rate, and match status (Live / Upcoming / Completed)
- **Ball-by-ball commentary feed** for the match currently in focus
- **Match detail view** with batting/bowling scorecards, partnerships, and fall of wickets
- **Favorite teams** — follow specific teams and get an email/in-app alert when their match starts or ends
- **Poll ↔ Cricket crossover**: auto-suggested match-day polls (e.g., "Who wins today — India or Australia?") generated automatically when a followed match kicks off

---

## 🧱 Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React, React Router, Socket.IO Client, GSAP |
| Backend    | Express.js, Socket.IO, Mongoose, Nodemailer, JWT |
| Database   | MongoDB |
| Cricket Data | Third-party Cricket Live Score API (polled server-side, fanned out via Socket.IO) |

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm run install-all
```

### 2. Configure environment
Copy `server/.env.example` to `server/.env` and fill in your values:
```bash
cp server/.env.example server/.env
```

**Required:**
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — secret key for auth tokens

**Required for real emails (OTP + poll/match notifications):**
- `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` — SMTP credentials

**Gmail setup:** Create an [App Password](https://myaccount.google.com/apppasswords) and use:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_16_char_app_password
```

**Required for live cricket scores:**
- `CRICKET_API_KEY` — API key from your chosen cricket data provider
- `CRICKET_POLL_INTERVAL` — how often (in seconds) the backend polls the provider for score updates (default: `15`)

### 3. Start the app
```bash
npm start
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## 🔐 How Authentication & Poll Notifications Work

1. User enters email on `/login` → receives a 6-digit OTP at that email.
2. After OTP verification, their email is stored in MongoDB as a verified user.
3. When any logged-in user creates a poll, **all verified users** receive an email:

```
Subject: 📢 New Poll is Live!

Hello John,

Devansh has just started a new poll.

Poll: Who is the greatest football player?

Cast your vote before the poll closes in 12 hours.

Vote Now: http://localhost:3000/poll/12345
```

---

## 🏏 How Cricket Live Scores Work

1. A scheduled job on the backend polls the configured cricket data provider every `CRICKET_POLL_INTERVAL` seconds for matches that are currently **live**.
2. New score data is diffed against the last known state and, if changed, broadcast instantly to all connected clients on the `cricket:update` Socket.IO channel.
3. The `/cricket` dashboard subscribes to this channel and updates match cards, run rate, and the commentary feed without a page reload.
4. If a user has marked a team as a **favorite**, they receive an email when that team's match starts and again when it ends, in a style similar to the poll notification:

```
Subject: 🏏 Match Alert — India vs Australia is LIVE!

Hello John,

The match you're following has just started.

India vs Australia — 1st ODI
Venue: Wankhede Stadium, Mumbai

Follow live scores: http://localhost:3000/cricket/98765
```

5. Optionally, when a followed match begins, PollVerse can auto-create a companion poll (e.g., "Who will win today?") using the existing poll-creation pipeline, so voting and live scores stay in sync.

---

## 📦 Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start both frontend and backend |
| `npm run server` | Backend only |
| `npm run client` | Frontend only |
| `npm run build` | Build React client for production |

---

## 🗺️ Roadmap

- [ ] Push notifications (Web Push) in addition to email
- [ ] Match-by-match poll history and win-prediction accuracy leaderboard
- [ ] Multi-sport support (football, kabaddi) using the same live-score pipeline
- [ ] Dark mode

---

## 📄 License

MIT
