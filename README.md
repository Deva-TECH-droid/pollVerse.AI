# LivePoll Realtime Voting App

LivePoll is a real-time voting application where users log in with email OTP, create polls, and vote instantly. Registered users receive email alerts when new polls go live.

## Features

- Email OTP authentication (JWT-based)
- Automatic email notifications when a new poll is created
- One-time voting with live results via Socket.IO
- Polls auto-close after 12 hours
- Create polls with 2 to 6 options
- Responsive React UI with GSAP animations

## Tech Stack

- Frontend: React, React Router, Socket.IO Client, GSAP
- Backend: Express.js, Socket.IO, Mongoose, Nodemailer, JWT
- Database: MongoDB

## Getting Started

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

**Required for real emails (OTP + poll notifications):**
- `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` — SMTP credentials

**Gmail setup:** Create an [App Password](https://myaccount.google.com/apppasswords) and use:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_16_char_app_password
```

### 3. Start the app

```bash
npm start
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## How Authentication & Notifications Work

1. User enters email on `/login` → receives a 6-digit OTP at that email
2. After OTP verification, their email is stored in MongoDB as a verified user
3. When any logged-in user creates a poll, **all verified users** receive an email like:

```
Subject: 📢 New Poll is Live!

Hello John,

Devansh has just started a new poll.

Poll: Who is the greatest football player?

Cast your vote before the poll closes in 12 hours.

Vote Now: http://localhost:3000/poll/12345
```

## Available Scripts

- `npm start` — start both frontend and backend
- `npm run server` — backend only
- `npm run client` — frontend only
- `npm run build` — build React client
