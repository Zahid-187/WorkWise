'use strict';
const express   = require('express');
const { getDb } = require('../db');
const router    = express.Router();

function currentWeekStart() {
  const now = new Date();
  const day  = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon  = new Date(now);
  mon.setDate(now.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon.toISOString().slice(0, 10);
}

async function detectFatigue(db, workerId) {
  const weekStart = currentWeekStart();
  const row = db.get(
    'SELECT COALESCE(SUM(hours_worked), 0) AS total_hours FROM shifts WHERE worker_id = ? AND date >= ?',
    [workerId, weekStart]
  );
  const fatigueWeekly = row.total_hours > 60;

  const recent = db.all(
    `SELECT date, clock_in, clock_out FROM shifts
     WHERE worker_id = ? AND clock_out IS NOT NULL
     ORDER BY date DESC LIMIT 7`,
    [workerId]
  );

  let fatigueConsecutive = false;
  for (let i = 0; i < recent.length - 1; i++) {
    const prev = recent[i + 1];
    const curr = recent[i];
    if (!prev.clock_out || !curr.clock_in) continue;
    const gapH = (new Date(curr.clock_in.replace(' ','T')) - new Date(prev.clock_out.replace(' ','T'))) / 3600000;
    if (gapH < 10) { fatigueConsecutive = true; break; }
  }
  return {
    total_hours_this_week: Math.round((row.total_hours || 0) * 100) / 100,
    fatigue_weekly:       fatigueWeekly,
    fatigue_consecutive:  fatigueConsecutive,
  };
}

// GET /api/shifts?worker_id=&week=
router.get('/', async (req, res) => {
  const db = await getDb();
  const { worker_id, week } = req.query;
  let sql = 'SELECT * FROM shifts WHERE 1=1';
  const params = [];
  if (worker_id) { sql += ' AND worker_id = ?'; params.push(worker_id); }
  if (week)      { sql += ' AND date >= ?';     params.push(week); }
  sql += ' ORDER BY date DESC, clock_in DESC';
  res.json(db.all(sql, params));
});

// GET /api/shifts/summary?industry=
router.get('/summary', async (req, res) => {
  const db = await getDb();
  const { industry } = req.query;
  const weekStart = currentWeekStart();
  const rows = db.all(`
    SELECT w.id, w.name, w.role, w.avatar_emoji, w.hourly_rate,
           COALESCE(SUM(s.hours_worked),   0) AS total_hours,
           COALESCE(SUM(s.overtime_hours), 0) AS total_overtime
    FROM workers w
    LEFT JOIN shifts s ON s.worker_id = w.id AND s.date >= ?
    WHERE w.industry = ?
    GROUP BY w.id
    ORDER BY total_hours DESC
  `, [weekStart, industry || 'construction']);

  const result = await Promise.all(rows.map(async r => ({
    ...r,
    total_hours:    Math.round(r.total_hours    * 100) / 100,
    total_overtime: Math.round(r.total_overtime * 100) / 100,
    ...(await detectFatigue(db, r.id)),
  })));
  res.json(result);
});

// GET /api/shifts/status/:worker_id
router.get('/status/:worker_id', async (req, res) => {
  const db = await getDb();
  const shift = db.get(
    'SELECT * FROM shifts WHERE worker_id = ? AND clock_out IS NULL ORDER BY id DESC LIMIT 1',
    [req.params.worker_id]
  );
  res.json({ clocked_in: !!shift, shift: shift || null });
});

// POST /api/shifts/clockin
router.post('/clockin', async (req, res) => {
  const db = await getDb();
  const { worker_id } = req.body;
  if (!worker_id) return res.status(400).json({ error: 'worker_id required' });

  const existing = db.get('SELECT id FROM shifts WHERE worker_id = ? AND clock_out IS NULL', [worker_id]);
  if (existing) return res.status(409).json({ error: 'Already clocked in', shift_id: existing.id });

  const now  = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const date = now.slice(0, 10);
  const info = db.prepare('INSERT INTO shifts (worker_id, date, clock_in) VALUES (?, ?, ?)').run(worker_id, date, now);
  res.json({ message: 'Clocked in', shift_id: info.lastInsertRowid, clock_in: now });
});

// POST /api/shifts/clockout
router.post('/clockout', async (req, res) => {
  const db = await getDb();
  const { worker_id } = req.body;
  if (!worker_id) return res.status(400).json({ error: 'worker_id required' });

  const open = db.get('SELECT * FROM shifts WHERE worker_id = ? AND clock_out IS NULL ORDER BY id DESC LIMIT 1', [worker_id]);
  if (!open) return res.status(409).json({ error: 'Not clocked in' });

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const hw  = (new Date(now.replace(' ','T')) - new Date(open.clock_in.replace(' ','T'))) / 3600000;
  const ot  = Math.max(0, hw - 8);

  db.prepare('UPDATE shifts SET clock_out = ?, hours_worked = ?, overtime_hours = ? WHERE id = ?')
    .run(now, Math.round(hw * 100) / 100, Math.round(ot * 100) / 100, open.id);

  const fatigue = await detectFatigue(db, worker_id);
  res.json({
    message: 'Clocked out', shift_id: open.id, clock_out: now,
    hours_worked:   Math.round(hw * 100) / 100,
    overtime_hours: Math.round(ot * 100) / 100,
    ...fatigue,
  });
});

module.exports = router;
