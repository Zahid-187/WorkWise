'use strict';
const express   = require('express');
const { getDb } = require('../db');
const { sanitizeText, isValidSentiment, isValidIndustry, rateLimiter } = require('../middleware/security');
const router    = express.Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { industry, sentiment, category } = req.query;
  let sql = 'SELECT * FROM feedback WHERE 1=1';
  const params = [];
  if (industry && isValidIndustry(industry)) { sql += ' AND industry = ?'; params.push(industry); }
  if (sentiment && isValidSentiment(sentiment)) { sql += ' AND sentiment = ?'; params.push(sentiment); }
  if (category) { sql += ' AND category = ?'; params.push(String(category).slice(0, 50)); }
  sql += ' ORDER BY created_at DESC';
  res.json(db.all(sql, params));
});

router.post('/', rateLimiter({ windowMs: 60000, max: 30 }), async (req, res) => {
  const db = await getDb();
  const { industry, category, sentiment, message } = req.body;
  if (!industry || !message) return res.status(400).json({ error: 'industry and message required' });

  const cleanIndustry = isValidIndustry(industry) ? industry.toLowerCase() : 'construction';
  const cleanSentiment = isValidSentiment(sentiment) ? sentiment.toLowerCase() : 'neutral';
  const cleanCategory = String(category || 'other').toLowerCase().slice(0, 50);
  const cleanMessage = sanitizeText(String(message).slice(0, 1500));

  if (!cleanMessage) return res.status(400).json({ error: 'Message cannot be empty' });

  const info = db.prepare('INSERT INTO feedback (industry, category, sentiment, message) VALUES (?, ?, ?, ?)')
    .run(cleanIndustry, cleanCategory, cleanSentiment, cleanMessage);
  res.status(201).json({ message: 'Feedback submitted anonymously', id: info.lastInsertRowid });
});

module.exports = router;
