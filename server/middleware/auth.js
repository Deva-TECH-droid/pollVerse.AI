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
    if (err.code === 11000) {
      return User.findOne({ clerkId }) || User.findOne({ email: normalizedEmail });
    }
    throw err;
  }
}

// Requires clerkMiddleware() to be mounted globally in server.js BEFORE this.
async function requireAuth(req, res, next) {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const rawHeader = req.headers.authorization;
    console.log('🔍 Raw Authorization header at Express level:', rawHeader ? `${rawHeader.slice(0, 30)}... (length ${rawHeader.length})` : rawHeader);
  }

  try {
    let clerkUserId = null;

    // Primary path: clerkMiddleware() already parsed the token into req.auth
    const auth = getAuth(req);
    if (auth?.userId) {
      clerkUserId = auth.userId;
    }

    // Fallback: clerkMiddleware may have rejected the token due to an azp
    // (authorized party) mismatch in dev. Manually verify the Bearer token
    // so local development always works.
    if (!clerkUserId) {
      const rawToken = req.headers.authorization?.replace('Bearer ', '').trim();
      if (rawToken) {
        try {
         const payload = await verifyToken(rawToken, {
            secretKey: process.env.CLERK_SECRET_KEY,
            authorizedParties: [],
            clockSkewInMs: 30000,
          });
          if (payload?.sub) {
            clerkUserId = payload.sub;
            if (isDev) console.log('✅ Fallback token verification succeeded for', clerkUserId);
          }
        } catch (verifyErr) {
          if (isDev) console.log('⚠️  Fallback token verification failed:', verifyErr.message);
        }
      }
    }

    if (!clerkUserId) {
      return res.status(401).json({
        message: 'Authentication required. Please log in.',
        ...(isDev
          ? {
              debug: 'Could not extract userId from token — token missing, malformed, or expired.',
              rawAuthHeaderReceived: Boolean(req.headers.authorization),
              rawAuthHeaderPreview: req.headers.authorization ? req.headers.authorization.slice(0, 30) : null,
            }
          : {}),
      });
    }

    const user = await findOrSyncUserByClerkId(clerkUserId);
    if (!user) {
      return res.status(401).json({
        message: 'No email associated with this account.',
        ...(isDev ? { debug: `Clerk user ${clerkUserId} has no email address.` } : {}),
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({
      message: 'Invalid or expired session. Please log in again.',
      ...(isDev ? { debug: err.message, stack: err.stack } : {}),
    });
  }
}

// For Socket.io events (submitVote), which aren't regular Express requests
// and so can't use getAuth()/clerkMiddleware(). The client sends its Clerk
// session token as part of the event payload; we verify it directly here.
async function verifySocketUser(token) {
  if (!token) return null;

  try {
  const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      clockSkewInMs: 30000,
    });
    if (!payload?.sub) return null;
    return await findOrSyncUserByClerkId(payload.sub);
  } catch (err) {
    console.error('Socket auth error:', err.message);
    return null;
  }
}

module.exports = { requireAuth, verifySocketUser };