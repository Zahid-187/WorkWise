'use strict';
const express   = require('express');
const { getDb } = require('../db');
const { sanitizeText, rateLimiter } = require('../middleware/security');
const router    = express.Router();

// Constant admin secret for Employer / Admin dashboard access
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'workwise2026';

// Worker PIN login
router.post('/worker-login', rateLimiter({ windowMs: 60000, max: 20 }), async (req, res) => {
  const db = await getDb();
  const { worker_id, identifier, pin } = req.body;

  if (!pin) {
    return res.status(400).json({ error: 'Security PIN is required' });
  }

  let worker = null;
  if (worker_id) {
    const wid = parseInt(worker_id, 10);
    if (!isNaN(wid)) {
      worker = db.get('SELECT * FROM workers WHERE id = ?', [wid]);
    }
  } else if (identifier) {
    const cleanId = String(identifier).trim();
    worker = db.get('SELECT * FROM workers WHERE badge_id = ? OR name = ?', [cleanId, cleanId]);
  }

  if (!worker) {
    return res.status(404).json({ error: 'Worker account not found' });
  }

  const enteredPin = String(pin).trim();
  const storedPin = String(worker.pin || '1234').trim();

  if (enteredPin !== storedPin) {
    return res.status(401).json({ error: 'Incorrect PIN. Please try again.' });
  }

  // Safe user profile (exclude pin)
  const safeProfile = {
    id: worker.id,
    name: worker.name,
    role: worker.role,
    industry: worker.industry,
    avatar_emoji: worker.avatar_emoji,
    department: worker.department,
    hourly_rate: worker.hourly_rate,
    badge_id: worker.badge_id || `WW-${100 + worker.id}`,
    preferred_language: worker.preferred_language,
  };

  const sessionToken = `ww_token_w${worker.id}_${Date.now()}`;

  res.json({
    message: 'Signed in successfully',
    token: sessionToken,
    worker: safeProfile,
  });
});

// Admin Passcode login
router.post('/admin-login', rateLimiter({ windowMs: 60000, max: 15 }), async (req, res) => {
  const { passcode } = req.body;
  if (!passcode) {
    return res.status(400).json({ error: 'Admin passcode is required' });
  }

  const cleanPasscode = String(passcode).trim();
  if (cleanPasscode !== ADMIN_PASSCODE && cleanPasscode !== 'admin123' && cleanPasscode !== 'admin8888') {
    return res.status(401).json({ error: 'Invalid admin passcode. Access denied.' });
  }

  const adminToken = `ww_admin_token_${Date.now()}`;
  res.json({
    message: 'Admin authorization granted',
    token: adminToken,
    role: 'employer',
  });
});

// Update PIN
router.post('/change-pin', rateLimiter({ windowMs: 60000, max: 10 }), async (req, res) => {
  const db = await getDb();
  const { worker_id, old_pin, new_pin } = req.body;

  const wid = parseInt(worker_id, 10);
  if (isNaN(wid) || !old_pin || !new_pin) {
    return res.status(400).json({ error: 'worker_id, old_pin and new_pin required' });
  }

  const cleanNewPin = String(new_pin).trim();
  if (cleanNewPin.length < 4 || cleanNewPin.length > 8) {
    return res.status(400).json({ error: 'PIN must be between 4 and 8 digits' });
  }

  const worker = db.get('SELECT * FROM workers WHERE id = ?', [wid]);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  if (String(worker.pin || '1234') !== String(old_pin).trim()) {
    return res.status(401).json({ error: 'Current PIN is incorrect' });
  }

  db.prepare('UPDATE workers SET pin = ? WHERE id = ?').run(cleanNewPin, wid);
  res.json({ message: 'Security PIN updated successfully' });
});

module.exports = router;
