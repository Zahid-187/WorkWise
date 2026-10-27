'use strict';
const express   = require('express');
const { getDb } = require('../db');
const { isValidIndustry } = require('../middleware/security');
const router    = express.Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { industry } = req.query;
  const workers = (industry && isValidIndustry(industry))
    ? db.all('SELECT * FROM workers WHERE industry = ? ORDER BY name', [industry.toLowerCase()])
    : db.all('SELECT * FROM workers ORDER BY industry, name');
  res.json(workers);
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid worker ID' });
  const worker = db.get('SELECT * FROM workers WHERE id = ?', [id]);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  res.json(worker);
});

module.exports = router;
