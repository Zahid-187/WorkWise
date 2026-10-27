'use strict';
const express   = require('express');
const path      = require('path');
const { getDb, initSchema } = require('./db');
const { seed }  = require('./seed');

const app  = express();
const PORT = process.env.PORT || 3000;
const { securityHeaders, rateLimiter } = require('./middleware/security');

// Security Hardening: hide express signature, apply headers, limit payload size
app.disable('x-powered-by');
app.use(securityHeaders);
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Global API rate limiter (120 requests per minute)
app.use('/api', rateLimiter({ windowMs: 60000, max: 120 }));

// Boot: init schema, auto-seed if empty, then mount routes
initSchema().then(async () => {
  const db = await getDb();
  const workerCount = db.get('SELECT COUNT(*) AS count FROM workers')?.count || 0;
  if (workerCount === 0) {
    console.log('📦 Database empty. Auto-seeding initial demo data...');
    await seed();
    console.log('✅ Auto-seed completed successfully.');
  }

  // API routes
  app.use('/api/workers',    require('./routes/workers'));
  app.use('/api/shifts',     require('./routes/shifts'));
  app.use('/api/grievances', require('./routes/grievances'));
  app.use('/api/feedback',   require('./routes/feedback'));
  app.use('/api/insights',   require('./routes/insights'));
  app.use('/api/ai',         require('./routes/insights')); // alias for backwards compatibility

  // Reset / Seed endpoints with strict rate limiting
  const seedLimiter = rateLimiter({ windowMs: 60000, max: 6, message: 'Too many reset requests. Please wait a minute.' });
  app.post('/api/system/reset', seedLimiter, async (req, res) => {
    try {
      await seed();
      res.json({ message: 'Database reset and seeded successfully' });
    } catch(err) {
      console.error('Reset failed:', err);
      res.status(500).json({ error: 'Failed to reset database' });
    }
  });
  app.post('/api/seed', seedLimiter, async (req, res) => {
    try {
      await seed();
      res.json({ message: 'Database seeded successfully' });
    } catch(err) {
      console.error('Seed failed:', err);
      res.status(500).json({ error: 'Failed to seed database' });
    }
  });

  // Direct clean URL routes
  app.get('/worker',   (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'worker.html')));
  app.get('/employer', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'employer.html')));
  app.get('/payslip',  (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'payslip.html')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`\n🚀 WorkWise running at http://localhost:${PORT}`);
    console.log(`   Industry modes: Construction 🏗️  |  College 🎓`);
    console.log(`   Operational Intelligence: 100% Rule-Based (Zero API Keys Required)\n`);
  });
}).catch(err => {
  console.error('Failed to initialise database:', err);
  process.exit(1);
});
