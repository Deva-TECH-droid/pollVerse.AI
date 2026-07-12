const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { requireAuth } = require('../middleware/auth');
const { sendFeedbackEmail } = require('../utils/email');
const { getDisplayName } = require('../utils/displayName');

// POST /api/feedback — any logged-in user can send feedback to the admin
router.post('/', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    const trimmed = (message || '').trim();

    if (!trimmed) {
      return res.status(400).json({ message: 'Feedback message cannot be empty.' });
    }
    if (trimmed.length > 2000) {
      return res.status(400).json({ message: 'Feedback is too long (max 2000 characters).' });
    }

    const adminEmail = process.env.ADMIN_EMAIL;

    const feedback = await Feedback.create({
      userId: req.user._id,
      email: req.user.email,
      name: req.user.name || getDisplayName(req.user.email),
      message: trimmed,
    });

    if (adminEmail) {
      sendFeedbackEmail({
        to: adminEmail,
        fromName: feedback.name,
        fromEmail: feedback.email,
        message: trimmed,
      }).catch((err) => {
        console.error('Failed to send feedback email:', err);
      });
    }

    res.status(201).json({ message: 'Feedback sent. Thank you!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;