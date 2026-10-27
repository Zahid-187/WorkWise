'use strict';
const express   = require('express');
const { getDb } = require('../db');
const router    = express.Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { industry, status, category } = req.query;
  let sql = `
    SELECT g.*, w.name AS worker_name, w.avatar_emoji
    FROM grievances g JOIN workers w ON w.id = g.worker_id WHERE 1=1
  `;
  const params = [];
  if (industry) { sql += ' AND g.industry = ?'; params.push(industry); }
  if (status)   { sql += ' AND g.status = ?';   params.push(status); }
  if (category) { sql += ' AND g.category = ?'; params.push(category); }
  sql += ' ORDER BY g.created_at DESC';
  res.json(db.all(sql, params));
});

router.get('/worker/:worker_id', async (req, res) => {
  const db = await getDb();
  res.json(db.all('SELECT * FROM grievances WHERE worker_id = ? ORDER BY created_at DESC', [req.params.worker_id]));
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { worker_id, category, description, severity, is_payslip_dispute } = req.body;
  if (!worker_id || !description) return res.status(400).json({ error: 'worker_id and description required' });
  const worker = db.get('SELECT * FROM workers WHERE id = ?', [worker_id]);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  const info = db.prepare(`
    INSERT INTO grievances (worker_id, industry, category, description, severity, is_payslip_dispute)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(worker_id, worker.industry, category || 'other', description, severity || 'medium', is_payslip_dispute ? 1 : 0);
  res.status(201).json({ message: 'Grievance submitted', id: info.lastInsertRowid });
});

router.patch('/:id', async (req, res) => {
  const db = await getDb();
  const { status, severity } = req.body;
  const g = db.get('SELECT * FROM grievances WHERE id = ?', [req.params.id]);
  if (!g) return res.status(404).json({ error: 'Not found' });
  const resolved_at = status === 'resolved'
    ? new Date().toISOString().replace('T',' ').slice(0,19)
    : g.resolved_at;
  db.prepare('UPDATE grievances SET status = ?, severity = ?, resolved_at = ? WHERE id = ?')
    .run(status || g.status, severity || g.severity, resolved_at, req.params.id);
  res.json({ message: 'Updated' });
});

module.exports = router;
