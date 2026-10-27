'use strict';
const express   = require('express');
const { getDb } = require('../db');
const router    = express.Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { industry } = req.query;
  const workers = industry
    ? db.all('SELECT * FROM workers WHERE industry = ? ORDER BY name', [industry])
    : db.all('SELECT * FROM workers ORDER BY industry, name');
  res.json(workers);
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const worker = db.get('SELECT * FROM workers WHERE id = ?', [req.params.id]);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  res.json(worker);
});

module.exports = router;
