const express = require('express');
const router = express.Router();
const { Webhook } = require('svix');
const User = require('../models/User');
const { getDisplayName } = require('../utils/displayName');

// This route needs the RAW body (not JSON-parsed) to verify the Svix
// signature — see server.js for how it's mounted before express.json().
//
// Clerk dashboard → Webhooks → Add Endpoint:
//   URL: https://<your-backend-url>/api/webhooks/clerk
//   Events: user.created, user.updated, user.deleted
// Copy the Signing Secret into CLERK_WEBHOOK_SECRET in .env

router.post('/clerk', async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set.');
    return res.status(500).json({ message: 'Webhook secret not configured' });
  }

  const svixHeaders = {
    'svix-id': req.headers['svix-id'],
    'svix-timestamp': req.headers['svix-timestamp'],
    'svix-signature': req.headers['svix-signature'],
  };

  let evt;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    evt = wh.verify(req.body, svixHeaders);
  } catch (err) {
    console.error('Clerk webhook verification failed:', err.message);
    return res.status(400).json({ message: 'Invalid webhook signature' });
  }

  const { type, data } = evt;

  try {
    if (type === 'user.created' || type === 'user.updated') {
      const email =
        data.email_addresses?.find((e) => e.id === data.primary_email_address_id)
          ?.email_address || data.email_addresses?.[0]?.email_address;

      if (email) {
        const name = data.first_name
          ? `${data.first_name} ${data.last_name || ''}`.trim()
          : getDisplayName(email);
        const normalizedEmail = email.toLowerCase();

        // Same reasoning as middleware/auth.js: a doc with this clerkId may
        // not exist yet, but one with this email might (stale test data, or
        // a recreated Clerk account). Attach the clerkId to that record
        // instead of colliding on the unique email index.
        const existingByClerkId = await User.findOne({ clerkId: data.id });
        if (existingByClerkId) {
          existingByClerkId.email = normalizedEmail;
          existingByClerkId.name = name;
          await existingByClerkId.save();
        } else {
          const existingByEmail = await User.findOne({ email: normalizedEmail });
          if (existingByEmail) {
            existingByEmail.clerkId = data.id;
            existingByEmail.name = name;
            await existingByEmail.save();
          } else {
            await User.create({ clerkId: data.id, email: normalizedEmail, name });
          }
        }
        console.log(`✅ Synced user from Clerk (${type}): ${email}`);
      }
    }

    if (type === 'user.deleted') {
      await User.deleteOne({ clerkId: data.id });
      console.log(`🗑️  Removed user from Mongo (Clerk deleted): ${data.id}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error processing Clerk webhook:', err);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

module.exports = router;