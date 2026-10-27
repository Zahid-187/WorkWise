'use strict';
const express   = require('express');
const { getDb } = require('../db');
const router    = express.Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { industry, sentiment, category } = req.query;
  let sql = 'SELECT * FROM feedback WHERE 1=1';
  const params = [];
  if (industry)  { sql += ' AND industry = ?';  params.push(industry); }
  if (sentiment) { sql += ' AND sentiment = ?'; params.push(sentiment); }
  if (category)  { sql += ' AND category = ?';  params.push(category); }
  sql += ' ORDER BY created_at DESC';
  res.json(db.all(sql, params));
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { industry, category, sentiment, message } = req.body;
  if (!industry || !message) return res.status(400).json({ error: 'industry and message required' });
  const info = db.prepare('INSERT INTO feedback (industry, category, sentiment, message) VALUES (?, ?, ?, ?)')
    .run(industry, category || 'other', sentiment || 'neutral', message);
  res.status(201).json({ message: 'Feedback submitted anonymously', id: info.lastInsertRowid });
});

module.exports = router;
