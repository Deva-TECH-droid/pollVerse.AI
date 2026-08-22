require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { clerkMiddleware } = require('@clerk/express');
const connectDB = require('./db');
const pollRoutes = require('./routes/polls');
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhooks');
const rewardRoutes = require('./routes/rewards');
const feedbackRoutes = require('./routes/Feedback');
const leaderboardRoutes = require('./routes/leaderboard');
const { verifySocketUser } = require('./middleware/auth');
const { startPollCloseJob } = require('./jobs/closePolls');
const Poll = require('./models/Poll');
const Vote = require('./models/Vote');

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = http.createServer(app);

const isProduction = process.env.NODE_ENV === 'production';

// Allowed origins: Vercel frontend in prod, localhost in dev
const allowedOrigins = isProduction
  ? [process.env.CLIENT_URL, 'https://livepollverse.vercel.app', 'https://poll-verse-ai-delta.vercel.app'].filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:3001'];


// Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Expose io on the app so route handlers (e.g. routes/comments.js) can grab
// it via req.app.get('io') and broadcast to a poll's room.
app.set('io', io);

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Clerk webhook needs the RAW body to verify its signature, so it's mounted
// here, BEFORE express.json() applies JSON parsing to everything else.
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());
// authorizedParties tells Clerk which frontend origins are allowed to
// send session tokens — must match the `azp` claim in the JWT.
const authorizedParties = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.CLIENT_URL,
  'https://livepollverse.vercel.app',
  'https://poll-verse-ai-d2f3.vercel.app',
  'https://poll-verse-ai-delta.vercel.app',
].filter(Boolean);

app.use(clerkMiddleware({ clockSkewInMs: 30000 }));
// REST Routes
app.use('/api/polls', pollRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/comments', require('./routes/comments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/gully-cricket', require('./routes/gullyCricket'));
app.use('/api/gully-cricket/tournaments', require('./routes/tournament'));
app.use('/api/cricket', require('./routes/internationalCricket'));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'PollVerse server is running 🚀', env: process.env.NODE_ENV });
});

// ---------------------------------------------------------------------------
// Live spectator count for Gully Cricket matches — simple in-memory
// tracking (fine for a single server; no Redis needed at this scale).
// matchViewers: matchId -> Map<viewerId, activeSocketCount>
// The per-viewer socket count is what makes multi-tab correct: the same
// person opening 3 tabs still counts as 1 viewer, and the count only drops
// once ALL of their tabs have closed/disconnected.
// ---------------------------------------------------------------------------
const matchViewers = new Map();
// socket.id -> { matchId, viewerId } so disconnect can find what to clean up.
const socketViewerInfo = new Map();

function getMatchViewerCount(matchId) {
  const viewers = matchViewers.get(matchId);
  return viewers ? viewers.size : 0;
}

function broadcastViewerCount(matchId) {
  io.to(`viewers:${matchId}`).emit('viewerCountUpdate', { matchId, count: getMatchViewerCount(matchId) });
}

function addViewer(matchId, viewerId, socketId) {
  if (!matchViewers.has(matchId)) matchViewers.set(matchId, new Map());
  const viewers = matchViewers.get(matchId);
  const wasNew = !viewers.has(viewerId);
  viewers.set(viewerId, (viewers.get(viewerId) || 0) + 1);
  socketViewerInfo.set(socketId, { matchId, viewerId });
  if (wasNew) broadcastViewerCount(matchId);
}

function removeViewerBySocket(socketId) {
  const info = socketViewerInfo.get(socketId);
  if (!info) return;
  socketViewerInfo.delete(socketId);

  const { matchId, viewerId } = info;
  const viewers = matchViewers.get(matchId);
  if (!viewers || !viewers.has(viewerId)) return;

  const remaining = viewers.get(viewerId) - 1;
  if (remaining <= 0) {
    viewers.delete(viewerId);
    if (viewers.size === 0) matchViewers.delete(matchId);
    broadcastViewerCount(matchId);
  } else {
    viewers.set(viewerId, remaining);
  }
}

// Socket.io events
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('joinPoll', (pollId) => {
    socket.join(pollId);
    console.log(`Socket ${socket.id} joined room: ${pollId}`);
  });

  socket.on('submitVote', async ({ pollId, optionIndex, token }) => {
    try {
      const user = await verifySocketUser(token);
      if (!user) {
        socket.emit('voteError', { message: 'Please log in to vote.' });
        return;
      }

      const poll = await Poll.findById(pollId);
      if (!poll) {
        socket.emit('voteError', { message: 'Poll not found.' });
        return;
      }

      if (poll.isClosed || (poll.closesAt && new Date() > poll.closesAt)) {
        socket.emit('voteError', { message: 'This poll has closed.' });
        return;
      }

      if (optionIndex === undefined || optionIndex < 0 || optionIndex >= poll.options.length) {
        socket.emit('voteError', { message: 'Invalid option.' });
        return;
      }

      const existingVote = await Vote.findOne({ pollId: poll._id, userId: user._id });
      if (existingVote) {
        socket.emit('voteError', { message: 'You have already voted on this poll. Votes cannot be changed.' });
        return;
      }

      try {
        await Vote.create({ pollId: poll._id, userId: user._id, optionIndex });
      } catch (err) {
        if (err.code === 11000) {
          socket.emit('voteError', { message: 'You have already voted on this poll. Votes cannot be changed.' });
          return;
        }
        throw err;
      }

      poll.options[optionIndex].votes += 1;
      poll.totalVotes += 1;
      await poll.save();

      io.to(pollId).emit('pollUpdated', poll);
    } catch (err) {
      console.error('Vote error:', err.message);
      socket.emit('voteError', { message: 'Something went wrong. Please try again.' });
    }
  });

  socket.on('joinMatchViewer', async ({ matchId, token }) => {
    if (!matchId) return;
    // Logged-in users get a stable id (so multi-tab collapses to 1 viewer);
    // guests fall back to this socket's own id, matching the socket 1:1.
    let viewerId = socket.id;
    if (token) {
      try {
        const user = await verifySocketUser(token);
        if (user) viewerId = String(user._id);
      } catch (err) {
        // Invalid/expired token — just treat them as a guest viewer.
      }
    }
    socket.join(`viewers:${matchId}`);
    addViewer(matchId, viewerId, socket.id);
    socket.emit('viewerCountUpdate', { matchId, count: getMatchViewerCount(matchId) });
  });

  socket.on('leaveMatchViewer', () => {
    removeViewerBySocket(socket.id);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    removeViewerBySocket(socket.id);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 LivePoll server running on http://localhost:${PORT}`);
  startPollCloseJob();
});