<div align="center">

# 🗳️ PollVerse.AI

### Real-time, AI-powered polling & prediction platform

Create polls · Predict outcomes · Follow live cricket · Earn credits · Climb the leaderboard 🏆

![Node](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-black?logo=socket.io)
![License](https://img.shields.io/badge/License-MIT-blue)
![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen)
![Status](https://img.shields.io/badge/status-active-success)

<br/>

<a href="#-getting-started"><img src="https://img.shields.io/badge/🚀_Quick_Start-black?style=for-the-badge" /></a>
<a href="#-screenshots"><img src="https://img.shields.io/badge/📸_Screenshots-black?style=for-the-badge" /></a>
<a href="#-features"><img src="https://img.shields.io/badge/✨_Features-black?style=for-the-badge" /></a>
<a href="#️-roadmap"><img src="https://img.shields.io/badge/🗺️_Roadmap-black?style=for-the-badge" /></a>

<br/><br/>

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=22&pause=1000&color=2EA3F7&center=true&vCenter=true&width=650&lines=Create+polls.+Predict+outcomes.+Win+credits.;Follow+live+cricket+scores+in+real+time.;Powered+by+AI+insights+%26+Socket.IO.;Built+on+the+MERN+stack+%E2%9A%A1" alt="Typing SVG" />

</div>

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:2EA3F7,100:47A248&height=120&section=header" width="100%"/>
</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Screenshots](#-screenshots)
- [Features](#-features)
  - [Polling & Predictions](#️-polling--predictions)
  - [Cricket](#-cricket)
- [Tech Stack](#-tech-stack)
- [Cloud Technologies](#️-cloud-technologies)
- [Getting Started](#-getting-started)
- [How It Works](#-how-it-works)
- [Scripts](#-scripts)
- [Roadmap](#️-roadmap)
- [License](#-license)

---

## 🔎 Overview

**PollVerse.AI** is a real-time, AI-powered polling and prediction platform built on the MERN stack. Admins create polls, users log in via passwordless email OTP, cast predictions, and earn credits for getting it right. AI-generated insights help users make smarter predictions, while a live leaderboard keeps the competition going — across both **general polls** and **live cricket matches**.

<div align="center">

⭐ **If you like this project, consider giving it a star!** ⭐

</div>

---

## 📸 Screenshots

> All images live in the [`/screensorts`](./screensorts) folder — drop your `.png` / `.jpg` files there and they'll render automatically below.

<div align="center">

| Home / Dashboard | Live Poll Results |
|:---:|:---:|
| <img src="./screensorts/Prointro.png" width="400" alt="Home dashboard"/> | <img src="./screensorts/PollSection.png" width="400" alt="Live poll results"/> |

| Cricket Live Match | Leaderboard |
|:---:|:---:|
| <img src="./screensorts/CrickINterface.png" width="400" alt="Live cricket dashboard"/> | <img src="./screensorts/Leaderbord.png" width="400" alt="Leaderboard"/> |

| AI Insights | Admin |
|:---:|:---:|
| <img src="./screensorts/AIInsight.png" width="400" alt="AI insights panel"/> | <img src="./screensorts/Admin.png" width="400" alt="Admin panel"/> |

| Cricket Intro | Players Profile |
|:---:|:---:|
| <img src="./screensorts/CrickIntro.png" width="400" alt="Cricket intro"/> | <img src="./screensorts/playerProfile.png" width="400" alt="Player profile"/> |

</div>

<details>
<summary>📂 Expected screenshots folder structure</summary>

```
screensorts/
├── Prointro.png
├── PollSection.png
├── CrickINterface.png
├── Leaderbord.png
├── AIInsight.png
├── Admin.png
├── CrickIntro.png
└── playerProfile.png
```

> Tip: keep screenshots under ~500KB each (PNG, 1280px wide) so the README stays fast to load.

</details>

---

## ✨ Features

### 🗳️ Polling & Predictions
- 🔐 Passwordless **email OTP login** (JWT-based)
- ⚡ Admins create polls in seconds; all verified users get **instant email alerts**
- 📡 **Live results** streamed in real time via Socket.IO — no refresh needed
- 🎯 Users **predict outcomes**, not just vote — correct predictions earn **credits**
- 🤖 **AI-powered insights** — win-probability hints and smart suggestions before you commit a prediction
- 📊 **Leaderboard & stats** — global rank, personal accuracy history, credit balance

### 🏏 Cricket
- 🔴 **Live match dashboard** with real-time score updates (runs, overs, run rate, status)
- 🏆 **Match predictions** — pick the winner, top scorer, or total runs before/during a match
- 💰 Correct cricket predictions earn the **same credits** as regular polls and count toward the **same leaderboard**
- 🔔 **Follow your favorite teams** to get notified the moment their match goes live
- 🏏 Ball-by-ball score updates pushed over the same Socket.IO channel used for poll results

---

## 🧱 Tech Stack

<div align="center">

| Layer | Technology |
|:---|:---|
| 🎨 Frontend | React, React Router, Socket.IO Client, GSAP |
| ⚙️ Backend | Express.js, Socket.IO, Mongoose, Nodemailer, JWT |
| 🗄️ Database | MongoDB (Atlas) + DynamoDB |
| 🤖 AI Insights | LLM-based prediction/insight service |
| 🏏 Live Cricket Data | Third-party Cricket Score API (server-polled, broadcast via Socket.IO) |

</div>

---

## ☁️ Cloud Technologies

<div align="center">

![AWS EC2](https://img.shields.io/badge/AWS_EC2-Virtual_Machine-FF9900?style=for-the-badge&logo=amazonec2&logoColor=white)
![DynamoDB](https://img.shields.io/badge/DynamoDB-NoSQL_Database-4053D6?style=for-the-badge&logo=amazondynamodb&logoColor=white)
![Amazon S3](https://img.shields.io/badge/Amazon_S3-Image_Storage-569A31?style=for-the-badge&logo=amazons3&logoColor=white)
![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-Cloud_Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Media_Storage-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

</div>

| Cloud Service | Purpose |
|:---|:---|
| 🖥️ **AWS EC2** | Virtual machine instance hosting the Node.js/Express backend & Socket.IO server |
| ⚡ **DynamoDB** | NoSQL cloud database, connected alongside MongoDB for high-speed reads (leaderboard/session data) |
| ☁️ **MongoDB Atlas** | Primary cloud database for polls, predictions, users & core app data |
| 🖼️ **Amazon S3** | Cloud object storage for uploaded images & poll assets |
| 🖼️ **Cloudinary** | Media storage/delivery & on-the-fly image transformations |
| 🔄 **GitHub Actions** | CI/CD pipeline — auto build & deploy to EC2 on every push |

> 💡 The backend runs on an **AWS EC2** instance, with **DynamoDB** running alongside **MongoDB Atlas** for fast, low-latency lookups (leaderboard & session caching), while all poll/screenshot images are stored in **Amazon S3**. This hybrid cloud setup keeps PollVerse.AI fast and horizontally scalable — even during a cricket match final over!

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm run install-all

# 2. Configure environment
cp server/.env.example server/.env
```

<details>
<summary>⚙️ <strong>.env essentials</strong> (click to expand)</summary>

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_16_char_app_password

CRICKET_API_KEY=your_cricket_api_key
CRICKET_POLL_INTERVAL=15

# AWS
AWS_REGION=your_aws_region
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
DYNAMODB_TABLE_NAME=your_dynamodb_table
S3_BUCKET_NAME=your_s3_bucket_name
```

</details>

```bash
# 3. Run it
npm start
```

| Service | URL |
|---|---|
| 🎨 Frontend | http://localhost:3000 |
| ⚙️ Backend | http://localhost:5000 |

---

## ⚙️ How It Works

```mermaid
flowchart LR
    A[📧 Enter Email] --> B[🔢 Receive OTP]
    B --> C[✅ Verified & Stored in MongoDB]
    C --> D[🗳️ Poll Created]
    D --> E[📩 Instant Email Alert]
    E --> F[🎯 User Predicts Outcome]
    F --> G[🤖 AI Insight Shown]
    G --> H[📡 Live Updates via Socket.IO]
    H --> I[💰 Credits + Leaderboard Update]
```

1. **Login** — user enters email → receives a 6-digit OTP → verified and stored in MongoDB.
2. **Poll created** — every verified user gets an email notification instantly.
3. **Predict** — users predict the poll outcome or a live cricket match result; AI insights are shown alongside each option.
4. **Live updates** — poll results and cricket scores update in real time via Socket.IO.
5. **Credits & Leaderboard** — correct predictions add credits to the user's balance, and the global leaderboard updates accordingly.

---

## 📦 Scripts

| Command | Description |
|---|---|
| `npm start` | Start frontend + backend together |
| `npm run server` | Backend only |
| `npm run client` | Frontend only |
| `npm run build` | Production build of the React client |

---

## 🗺️ Roadmap

- [ ] 🔔 Web push notifications alongside email
- [ ] 🏈 Multi-sport predictions (football, kabaddi)
- [ ] 🔥 Prediction streaks and badges
- [ ] 🌙 Dark mode

---

## 📄 License

MIT

---

## 💖 Show Some Love

<div align="center">

If you like this project, **star the repo** — it really helps! ⭐

<a href="../../stargazers">
  <img src="https://img.shields.io/github/stars/your-username/pollverse-ai?style=social" alt="GitHub stars"/>
</a>
&nbsp;
<a href="../../network/members">
  <img src="https://img.shields.io/github/forks/your-username/pollverse-ai?style=social" alt="GitHub forks"/>
</a>
&nbsp;
<a href="../../watchers">
  <img src="https://img.shields.io/github/watchers/your-username/pollverse-ai?style=social" alt="GitHub watchers"/>
</a>

<br/><br/>

<img src="https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" width="160" alt="thank you gif"/>

<br/><br/>

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=18&pause=1200&color=47A248&center=true&vCenter=true&width=500&lines=Thanks+for+checking+out+PollVerse.AI!;Star+%E2%AD%90+%7C+Fork+%F0%9F%8D%B4+%7C+Contribute+%F0%9F%92%BB" alt="thanks typing svg" />

</div>

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:47A248,100:2EA3F7&height=100&section=footer" width="100%"/>
</div>

<div align="center">

Made with ❤️ for poll & cricket fans

</div>
