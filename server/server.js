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
const feedbackRoutes = require('./routes/feedback');
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
  ? [process.env.CLIENT_URL, 'https://livepollverse.vercel.app'].filter(Boolean)
  : ['http://localhost:3000'];

// Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ 
  origin: allowedOrigins,
  credentials: true 
}));

// Clerk webhook needs the RAW body to verify its signature, so it's mounted
// here, BEFORE express.json() applies JSON parsing to everything else.
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());
app.use(clerkMiddleware()); // populates req.auth for every request

// REST Routes
app.use('/api/polls', pollRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/feedback', feedbackRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'PollVerse server is running 🚀', env: process.env.NODE_ENV });
});

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

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 LivePoll server running on http://localhost:${PORT}`);
  startPollCloseJob();
});