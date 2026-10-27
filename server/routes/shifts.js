'use strict';
const express   = require('express');
const { getDb } = require('../db');
const { sanitizeText, isValidIndustry, rateLimiter } = require('../middleware/security');
const router    = express.Router();

function currentWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

async function detectFatigue(db, workerId) {
  const weekStart = currentWeekStart();
  const row = db.get(
    'SELECT COALESCE(SUM(hours_worked), 0) AS total_hours FROM shifts WHERE worker_id = ? AND date >= ?',
    [workerId, weekStart]
  );
  const fatigueWeekly = (row?.total_hours || 0) > 60;

  const recent = db.all(
    `SELECT date, clock_in, clock_out FROM shifts
     WHERE worker_id = ? AND clock_out IS NOT NULL
     ORDER BY date ASC, clock_in ASC`,
    [workerId]
  );

  let fatigueConsecutive = false;
  for (let i = 0; i < recent.length - 1; i++) {
    const prev = recent[i];
    const curr = recent[i + 1];
    if (!prev.clock_out || !curr.clock_in) continue;
    const gapH = (new Date(curr.clock_in.replace(' ','T')) - new Date(prev.clock_out.replace(' ','T'))) / 3600000;
    if (gapH >= 0 && gapH < 10) { fatigueConsecutive = true; break; }
  }
  return {
    total_hours_this_week: Math.round((row?.total_hours || 0) * 100) / 100,
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
  if (worker_id) {
    const wid = parseInt(worker_id, 10);
    if (!isNaN(wid)) { sql += ' AND worker_id = ?'; params.push(wid); }
  }
  if (week && /^\d{4}-\d{2}-\d{2}$/.test(String(week))) {
    sql += ' AND date >= ?';
    params.push(String(week));
  }
  sql += ' ORDER BY date DESC, clock_in DESC';
  res.json(db.all(sql, params));
});

// GET /api/shifts/summary?industry=
router.get('/summary', async (req, res) => {
  const db = await getDb();
  const { industry } = req.query;
  const cleanInd = (industry && isValidIndustry(industry)) ? industry.toLowerCase() : 'construction';
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
  `, [weekStart, cleanInd]);

  const result = await Promise.all(rows.map(async r => ({
    ...r,
    total_hours:    Math.round((r.total_hours || 0)    * 100) / 100,
    total_overtime: Math.round((r.total_overtime || 0) * 100) / 100,
    ...(await detectFatigue(db, r.id)),
  })));
  res.json(result);
});

// GET /api/shifts/status/:worker_id
router.get('/status/:worker_id', async (req, res) => {
  const db = await getDb();
  const wid = parseInt(req.params.worker_id, 10);
  if (isNaN(wid)) return res.status(400).json({ error: 'Invalid worker ID' });
  const shift = db.get(
    'SELECT * FROM shifts WHERE worker_id = ? AND clock_out IS NULL ORDER BY id DESC LIMIT 1',
    [wid]
  );
  res.json({ clocked_in: !!shift, shift: shift || null });
});

// POST /api/shifts/clockin
router.post('/clockin', rateLimiter({ windowMs: 60000, max: 30 }), async (req, res) => {
  const db = await getDb();
  const wid = parseInt(req.body?.worker_id, 10);
  if (isNaN(wid)) return res.status(400).json({ error: 'Valid worker_id required' });

  const worker = db.get('SELECT id FROM workers WHERE id = ?', [wid]);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const existing = db.get('SELECT id FROM shifts WHERE worker_id = ? AND clock_out IS NULL', [wid]);
  if (existing) return res.status(409).json({ error: 'Already clocked in', shift_id: existing.id });

  const now  = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const date = now.slice(0, 10);
  const info = db.prepare('INSERT INTO shifts (worker_id, date, clock_in) VALUES (?, ?, ?)').run(wid, date, now);
  res.json({ message: 'Clocked in', shift_id: info.lastInsertRowid, clock_in: now });
});

// POST /api/shifts/clockout
router.post('/clockout', rateLimiter({ windowMs: 60000, max: 30 }), async (req, res) => {
  const db = await getDb();
  const wid = parseInt(req.body?.worker_id, 10);
  if (isNaN(wid)) return res.status(400).json({ error: 'Valid worker_id required' });

  const open = db.get('SELECT * FROM shifts WHERE worker_id = ? AND clock_out IS NULL ORDER BY id DESC LIMIT 1', [wid]);
  if (!open) return res.status(409).json({ error: 'Not clocked in' });

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const hw  = Math.max(0, (new Date(now.replace(' ','T')) - new Date(open.clock_in.replace(' ','T'))) / 3600000);
  const ot  = Math.max(0, hw - 8);

  db.prepare('UPDATE shifts SET clock_out = ?, hours_worked = ?, overtime_hours = ? WHERE id = ?')
    .run(now, Math.round(hw * 100) / 100, Math.round(ot * 100) / 100, open.id);

  const fatigue = await detectFatigue(db, wid);
  res.json({
    message: 'Clocked out', shift_id: open.id, clock_out: now,
    hours_worked:   Math.round(hw * 100) / 100,
    overtime_hours: Math.round(ot * 100) / 100,
    ...fatigue,
  });
});

// POST /api/shifts/simulate – helper for interactive hackathon demonstration
router.post('/simulate', rateLimiter({ windowMs: 60000, max: 30 }), async (req, res) => {
  const db = await getDb();
  const wid = parseInt(req.body?.worker_id, 10);
  if (isNaN(wid)) return res.status(400).json({ error: 'Valid worker_id required' });

  const numHours = Math.min(24, Math.max(0.25, Number(req.body?.hours || 8)));
  const shiftDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.date))
    ? req.body.date
    : new Date().toISOString().slice(0, 10);
  const cleanNotes = sanitizeText(String(req.body?.notes || 'Simulated Demo Shift').slice(0, 200));

  const startHour = 8;
  const cin = `${shiftDate} ${String(startHour).padStart(2, '0')}:00:00`;
  const endHour = startHour + Math.floor(numHours);
  const endMin = Math.round((numHours % 1) * 60);
  const cout = `${shiftDate} ${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;
  const hw = Math.round(numHours * 100) / 100;
  const ot = Math.round(Math.max(0, hw - 8) * 100) / 100;

  const info = db.prepare(`
    INSERT INTO shifts (worker_id, date, clock_in, clock_out, hours_worked, overtime_hours, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(wid, shiftDate, cin, cout, hw, ot, cleanNotes);

  const fatigue = await detectFatigue(db, wid);
  res.json({
    message: 'Shift logged',
    shift_id: info.lastInsertRowid,
    date: shiftDate,
    hours_worked: hw,
    overtime_hours: ot,
    ...fatigue,
  });
});

module.exports = router;
