const { clerkClient, getAuth } = require('@clerk/express');
const { verifyToken } = require('@clerk/backend');
const User = require('../models/User');
const { getDisplayName } = require('../utils/displayName');

async function findOrSyncUserByClerkId(clerkId) {
  let user = await User.findOne({ clerkId });
  if (user) return user;

  const clerkUser = await clerkClient.users.getUser(clerkId);
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses?.[0]?.emailAddress;

  if (!email) return null;

  const normalizedEmail = email.toLowerCase();
  const name = clerkUser.firstName
    ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim()
    : getDisplayName(email);

  // A doc with this clerkId doesn't exist, but one with this email might
  // (e.g. stale test data, or the user deleted and recreated their Clerk
  // account, getting a new clerkId for the same email). Attach the new
  // clerkId to that existing record instead of trying to insert a second
  // doc, which would collide on the unique email index.
  const existingByEmail = await User.findOne({ email: normalizedEmail });
  if (existingByEmail) {
    existingByEmail.clerkId = clerkId;
    existingByEmail.name = existingByEmail.name || name;
    await existingByEmail.save();
    return existingByEmail;
  }

  try {
    return await User.create({ clerkId, email: normalizedEmail, name });
  } catch (err) {
    // Race condition: two requests hit this at the same time and both
    // passed the check above. Whoever loses the insert just re-fetches.
    if (err.code === 11000) {
      return User.findOne({ clerkId }) || User.findOne({ email: normalizedEmail });
    }
    throw err;
  }
}

// Requires clerkMiddleware() to be mounted globally in server.js BEFORE this.
async function requireAuth(req, res, next) {
  try {
    const auth = getAuth(req);

    if (!auth || !auth.userId) {
      return res.status(401).json({ message: 'Authentication required. Please log in.' });
    }

    const user = await findOrSyncUserByClerkId(auth.userId);
    if (!user) {
      return res.status(401).json({ message: 'No email associated with this account.' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }
}

// For Socket.io events (submitVote), which aren't regular Express requests
// and so can't use getAuth()/clerkMiddleware(). The client sends its Clerk
// session token as part of the event payload; we verify it directly here.
async function verifySocketUser(token) {
  if (!token) return null;

  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    if (!payload?.sub) return null;
    return await findOrSyncUserByClerkId(payload.sub);
  } catch (err) {
    console.error('Socket auth error:', err.message);
    return null;
  }
}

module.exports = { requireAuth, verifySocketUser };