const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

function isAdminUser(user) {
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  return adminEmail && user.email.toLowerCase() === adminEmail;
}

function toUserResponse(user) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    credits: user.credits,
    isAdmin: isAdminUser(user),
  };
}

// POST /api/auth/sync
// Call this from the frontend right after a successful Clerk sign-in.
// requireAuth already upserts the Mongo User record from the Clerk session —
// this just forces it and hands back the saved record.
router.post('/sync', requireAuth, async (req, res) => {
  res.json({
    message: 'User synced to MongoDB',
    user: toUserResponse(req.user),
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: toUserResponse(req.user) });
});

module.exports = router;