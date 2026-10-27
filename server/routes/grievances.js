'use strict';
const express   = require('express');
const { getDb } = require('../db');
const { sanitizeText, isValidStatus, isValidSeverity, rateLimiter } = require('../middleware/security');
const router    = express.Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { industry, status, category } = req.query;
  let sql = `
    SELECT g.*, w.name AS worker_name, w.avatar_emoji
    FROM grievances g JOIN workers w ON w.id = g.worker_id WHERE 1=1
  `;
  const params = [];
  if (industry) { sql += ' AND g.industry = ?'; params.push(String(industry).slice(0, 50)); }
  if (status && isValidStatus(status)) { sql += ' AND g.status = ?'; params.push(status); }
  if (category) { sql += ' AND g.category = ?'; params.push(String(category).slice(0, 50)); }
  sql += ' ORDER BY g.created_at DESC';
  res.json(db.all(sql, params));
});

router.get('/worker/:worker_id', async (req, res) => {
  const db = await getDb();
  const workerId = parseInt(req.params.worker_id, 10);
  if (isNaN(workerId)) return res.status(400).json({ error: 'Invalid worker ID' });
  res.json(db.all('SELECT * FROM grievances WHERE worker_id = ? ORDER BY created_at DESC', [workerId]));
});

// Protect submission with a rate limiter (max 20 per minute)
router.post('/', rateLimiter({ windowMs: 60000, max: 20 }), async (req, res) => {
  const db = await getDb();
  const { worker_id, category, description, severity, is_payslip_dispute } = req.body;
  const wid = parseInt(worker_id, 10);
  if (isNaN(wid) || !description) {
    return res.status(400).json({ error: 'Valid worker_id and description required' });
  }

  // Prevent XSS & payload overflow
  const cleanDesc = sanitizeText(String(description).slice(0, 3000));
  if (!cleanDesc) return res.status(400).json({ error: 'Description cannot be empty' });

  const cleanCat = String(category || 'other').toLowerCase().slice(0, 50);
  const cleanSev = isValidSeverity(severity) ? severity : 'medium';

  const worker = db.get('SELECT * FROM workers WHERE id = ?', [wid]);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const info = db.prepare(`
    INSERT INTO grievances (worker_id, industry, category, description, severity, is_payslip_dispute)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(wid, worker.industry, cleanCat, cleanDesc, cleanSev, is_payslip_dispute ? 1 : 0);
  res.status(201).json({ message: 'Grievance submitted', id: info.lastInsertRowid });
});

router.patch('/:id', async (req, res) => {
  const db = await getDb();
  const gid = parseInt(req.params.id, 10);
  if (isNaN(gid)) return res.status(400).json({ error: 'Invalid grievance ID' });

  const { status, severity, resolution_note } = req.body;
  const g = db.get('SELECT * FROM grievances WHERE id = ?', [gid]);
  if (!g) return res.status(404).json({ error: 'Not found' });

  const cleanStatus = isValidStatus(status) ? status : g.status;
  const cleanSev    = isValidSeverity(severity) ? severity : g.severity;
  const cleanNote   = resolution_note !== undefined ? sanitizeText(String(resolution_note).slice(0, 2000)) : (g.resolution_note || '');

  const resolved_at = cleanStatus === 'resolved'
    ? (g.resolved_at || new Date().toISOString().replace('T',' ').slice(0,19))
    : null;

  db.prepare('UPDATE grievances SET status = ?, severity = ?, resolved_at = ?, resolution_note = ? WHERE id = ?')
    .run(cleanStatus, cleanSev, resolved_at, cleanNote, gid);
  res.json({ message: 'Updated', status: cleanStatus, severity: cleanSev, resolution_note: cleanNote });
});

module.exports = router;
