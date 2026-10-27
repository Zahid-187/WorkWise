'use strict';
const express = require('express');
const path    = require('path');
const { initSchema } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Boot: init schema, then mount routes
initSchema().then(() => {
  app.use('/api/workers',    require('./routes/workers'));
  app.use('/api/shifts',     require('./routes/shifts'));
  app.use('/api/grievances', require('./routes/grievances'));
  app.use('/api/feedback',   require('./routes/feedback'));
  app.use('/api/insights',   require('./routes/insights'));
  app.use('/api/ai',         require('./routes/insights')); // alias for backwards compatibility

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
