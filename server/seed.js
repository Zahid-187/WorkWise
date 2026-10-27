'use strict';
const { initSchema } = require('./db');

// ── Helpers ──────────────────────────────────────────────────────────────────
function isoDate(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function isoDateTime(daysAgo = 0, hour = 8, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

async function seed() {
  const db = await initSchema();

  // Clear existing data
  db.exec(`
    DROP TABLE IF EXISTS ai_cache;
    DELETE FROM feedback;
    DELETE FROM grievances;
    DELETE FROM shifts;
    DELETE FROM workers;
    DELETE FROM sqlite_sequence WHERE name IN ('workers','shifts','grievances','feedback');
  `);

  // ── Workers ────────────────────────────────────────────────────────────────
  const insertWorker = db.prepare(`
    INSERT INTO workers (name, role, industry, avatar_emoji, department, hourly_rate, preferred_language, badge_id, pin)
    VALUES (@name, @role, @industry, @avatar_emoji, @department, @hourly_rate, @preferred_language, @badge_id, @pin)
  `);

  const constructionWorkers = [
    { name: 'Rajan Kumar',    role: 'Site Manager',    avatar_emoji: '👷',  department: 'Management',  hourly_rate: 28.00, preferred_language: 'hi', badge_id: 'WW-101', pin: '1234' },
    { name: 'Selvam Murugan', role: 'Mason',            avatar_emoji: '🧱',  department: 'Structural',  hourly_rate: 18.50, preferred_language: 'ta', badge_id: 'WW-102', pin: '1234' },
    { name: 'Arjun Patel',    role: 'Electrician',      avatar_emoji: '⚡',  department: 'Electrical',  hourly_rate: 22.00, preferred_language: 'hi', badge_id: 'WW-103', pin: '1234' },
    { name: 'Dinesh Raj',     role: 'Carpenter',        avatar_emoji: '🪚',  department: 'Structural',  hourly_rate: 19.00, preferred_language: 'ta', badge_id: 'WW-104', pin: '1234' },
    { name: 'Priya Nair',     role: 'Safety Officer',   avatar_emoji: '⛑️',  department: 'Safety',      hourly_rate: 24.00, preferred_language: 'en', badge_id: 'WW-105', pin: '1234' },
    { name: 'Suresh Babu',    role: 'Welder',           avatar_emoji: '🔥',  department: 'Structural',  hourly_rate: 20.00, preferred_language: 'ta', badge_id: 'WW-106', pin: '1234' },
    { name: 'Ramesh Yadav',   role: 'Plumber',          avatar_emoji: '🔧',  department: 'Plumbing',    hourly_rate: 19.50, preferred_language: 'hi', badge_id: 'WW-107', pin: '1234' },
    { name: 'Karthik Selvam', role: 'Scaffolder',       avatar_emoji: '🏗️',  department: 'Structural',  hourly_rate: 17.00, preferred_language: 'ta', badge_id: 'WW-108', pin: '1234' },
    { name: 'Mohan Das',      role: 'Crane Operator',   avatar_emoji: '🏋️',  department: 'Heavy Ops',   hourly_rate: 26.00, preferred_language: 'hi', badge_id: 'WW-109', pin: '1234' },
    { name: 'Vijay Anand',    role: 'General Labourer', avatar_emoji: '👷',  department: 'General',     hourly_rate: 14.50, preferred_language: 'ta', badge_id: 'WW-110', pin: '1234' },
  ];

  const collegeWorkers = [
    { name: 'Dr. Meena Iyer',   role: 'Principal',      avatar_emoji: '🎓',  department: 'Administration',  hourly_rate: 45.00, preferred_language: 'en', badge_id: 'WW-201', pin: '1234' },
    { name: 'Prof. Sanjay Das', role: 'Lecturer',        avatar_emoji: '👨‍🏫', department: 'Science',          hourly_rate: 32.00, preferred_language: 'hi', badge_id: 'WW-202', pin: '1234' },
    { name: 'Lakshmi Priya',    role: 'Lecturer',        avatar_emoji: '👩‍🏫', department: 'Arts',             hourly_rate: 30.00, preferred_language: 'ta', badge_id: 'WW-203', pin: '1234' },
    { name: 'Anbu Selvan',      role: 'Lecturer',        avatar_emoji: '👨‍🏫', department: 'Commerce',         hourly_rate: 30.00, preferred_language: 'ta', badge_id: 'WW-204', pin: '1234' },
    { name: 'Geetha Krishnan',  role: 'Admin Staff',     avatar_emoji: '💼',  department: 'Administration',  hourly_rate: 18.00, preferred_language: 'en', badge_id: 'WW-205', pin: '1234' },
    { name: 'Muthu Raman',      role: 'Lab Technician',  avatar_emoji: '🔬',  department: 'Science',          hourly_rate: 20.00, preferred_language: 'ta', badge_id: 'WW-206', pin: '1234' },
    { name: 'Saraswathi V',     role: 'Librarian',       avatar_emoji: '📚',  department: 'Library',          hourly_rate: 17.00, preferred_language: 'en', badge_id: 'WW-207', pin: '1234' },
    { name: 'Balamurugan K',    role: 'Counsellor',      avatar_emoji: '🤝',  department: 'Student Affairs',  hourly_rate: 22.00, preferred_language: 'ta', badge_id: 'WW-208', pin: '1234' },
    { name: 'Senthil Kumar',    role: 'Security Guard',  avatar_emoji: '🔒',  department: 'Security',         hourly_rate: 14.00, preferred_language: 'ta', badge_id: 'WW-209', pin: '1234' },
    { name: 'Rajeswari M',      role: 'Janitor',         avatar_emoji: '🧹',  department: 'Facilities',       hourly_rate: 12.50, preferred_language: 'ta', badge_id: 'WW-210', pin: '1234' },
  ];

  const ids = { construction: [], college: [] };

  for (const w of constructionWorkers) {
    const info = insertWorker.run({ ...w, industry: 'construction' });
    ids.construction.push(info.lastInsertRowid);
  }
  for (const w of collegeWorkers) {
    const info = insertWorker.run({ ...w, industry: 'college' });
    ids.college.push(info.lastInsertRowid);
  }
  console.log('✅ Workers:', ids);

  // ── Shifts ─────────────────────────────────────────────────────────────────
  const insertShift = db.prepare(`
    INSERT INTO shifts (worker_id, date, clock_in, clock_out, hours_worked, overtime_hours, notes)
    VALUES (@worker_id, @date, @clock_in, @clock_out, @hours_worked, @overtime_hours, @notes)
  `);

  function makeShift(workerId, daysAgo, clockInHour, durationHours, notes = '') {
    const cin  = isoDateTime(daysAgo, clockInHour, 0);
    const coutHour = clockInHour + Math.floor(durationHours);
    const coutMin  = Math.round((durationHours % 1) * 60);
    const cout = isoDateTime(daysAgo, coutHour, coutMin);
    const hw = Math.round(durationHours * 100) / 100;
    const ot = Math.round(Math.max(0, durationHours - 8) * 100) / 100;
    insertShift.run({ worker_id: workerId, date: isoDate(daysAgo), clock_in: cin, clock_out: cout, hours_worked: hw, overtime_hours: ot, notes });
  }

  for (let day = 0; day < 7; day++) {
    // Construction: workers [0,1,2] = overworked (60+ h)
    makeShift(ids.construction[0], day, 6,  10,  'Long day');
    makeShift(ids.construction[1], day, 7,   9.5, '');
    makeShift(ids.construction[2], day, 7,   9,   '');
    if (day < 5) {
      makeShift(ids.construction[3], day, 8, 8,   '');
      makeShift(ids.construction[4], day, 7, 8,   'Safety rounds');
      makeShift(ids.construction[6], day, 8, 8,   '');
      makeShift(ids.construction[7], day, 8, 7,   '');
      makeShift(ids.construction[8], day, 6, 9,   'Early crane ops');
      makeShift(ids.construction[9], day, 8, 7,   '');
    }
    // College: workers [0,1,2] = overworked
    makeShift(ids.college[0], day, 8,  10,  'Admin meetings');
    makeShift(ids.college[1], day, 8,   9,  'Marking season');
    makeShift(ids.college[2], day, 9,   9.5, '');
    if (day < 5) {
      makeShift(ids.college[3], day, 9,  8,   '');
      makeShift(ids.college[4], day, 9,  8,   '');
      makeShift(ids.college[5], day, 9,  7.5, '');
      makeShift(ids.college[6], day, 9,  7,   '');
      makeShift(ids.college[7], day, 10, 7,   '');
      makeShift(ids.college[9], day, 6,  7,   '');
    }
  }

  // Dedicated back-to-back shifts (<10h rest) for testing fatigue alerts
  // Construction: Suresh Babu (Welder) 15:00-23:00 then 06:00-14:00 (7h rest)
  makeShift(ids.construction[5], 2, 15, 8, 'Evening welding');
  makeShift(ids.construction[5], 1, 6,  8, 'Early morning structural fit');

  // College: Senthil Kumar (Security Guard) 15:00-23:00 then 06:00-14:00 (7h rest)
  makeShift(ids.college[8], 2, 15, 8, 'Evening campus patrol');
  makeShift(ids.college[8], 1, 6,  8, 'Early gate unlock');
  console.log('✅ Shifts seeded');

  // ── Grievances ─────────────────────────────────────────────────────────────
  const insertG = db.prepare(`
    INSERT INTO grievances (worker_id, industry, category, description, status, severity, is_payslip_dispute, created_at)
    VALUES (@worker_id, @industry, @category, @description, @status, @severity, @is_payslip_dispute, @created_at)
  `);

  const grievances = [
    { worker_id: ids.construction[7], industry: 'construction', category: 'safety',     severity: 'high',   status: 'open',         description: 'Scaffolding on Block C has loose joints. Reported twice with no action taken.', is_payslip_dispute: 0, created_at: isoDateTime(5,10) },
    { worker_id: ids.construction[9], industry: 'construction', category: 'pay',        severity: 'medium', status: 'under_review',  description: 'Overtime from last month (~18 hrs) not in payslip. Amount owed: ₹2,700.',       is_payslip_dispute: 1, created_at: isoDateTime(3,14) },
    { worker_id: ids.college[2],      industry: 'college',      category: 'harassment', severity: 'high',   status: 'open',         description: 'Senior colleague making inappropriate remarks during staff meetings.',            is_payslip_dispute: 0, created_at: isoDateTime(2,9)  },
    { worker_id: ids.college[3],      industry: 'college',      category: 'workload',   severity: 'low',    status: 'resolved',     description: 'Assigned three extra courses without pay during the semester.',                  is_payslip_dispute: 0, created_at: isoDateTime(10,11)},
    { worker_id: ids.construction[5], industry: 'construction', category: 'other',      severity: 'low',    status: 'resolved',     description: 'Canteen food quality has declined. Workers leaving site to find food.',          is_payslip_dispute: 0, created_at: isoDateTime(12,13)},
  ];
  for (const g of grievances) insertG.run(g);
  console.log('✅ Grievances seeded');

  // ── Feedback ───────────────────────────────────────────────────────────────
  const insertF = db.prepare(`
    INSERT INTO feedback (industry, category, sentiment, message, created_at)
    VALUES (@industry, @category, @sentiment, @message, @created_at)
  `);

  const feedback = [
    { industry: 'construction', category: 'safety',     sentiment: 'positive', message: 'New helmets and harnesses are much better quality. Feeling safer on site.',                   created_at: isoDateTime(1,9)  },
    { industry: 'construction', category: 'management', sentiment: 'positive', message: 'Site manager listened to our concerns about the break schedule. Improvements were made.',     created_at: isoDateTime(2,11) },
    { industry: 'college',      category: 'wellbeing',  sentiment: 'positive', message: 'The new rest room for staff is a great addition. Really helps during long days.',             created_at: isoDateTime(1,14) },
    { industry: 'college',      category: 'management', sentiment: 'positive', message: 'Department head is very supportive and transparent about decisions. Great leadership.',        created_at: isoDateTime(3,10) },
    { industry: 'construction', category: 'tools',      sentiment: 'positive', message: 'Power tools were serviced and upgraded. Work is much more efficient now.',                   created_at: isoDateTime(4,8)  },
    { industry: 'construction', category: 'other',      sentiment: 'neutral',  message: 'Break timings have changed. Would prefer the old schedule but manageable for now.',          created_at: isoDateTime(2,15) },
    { industry: 'college',      category: 'facilities', sentiment: 'neutral',  message: 'Projectors in classrooms work sometimes. Would be better to have reliable equipment.',      created_at: isoDateTime(5,12) },
    { industry: 'construction', category: 'wellbeing',  sentiment: 'neutral',  message: 'Water supply on site is okay but sometimes runs out by afternoon.',                         created_at: isoDateTime(3,9)  },
    { industry: 'college',      category: 'management', sentiment: 'neutral',  message: 'Communication about exam schedules is last minute. Planning is difficult.',                  created_at: isoDateTime(6,11) },
    { industry: 'college',      category: 'tools',      sentiment: 'neutral',  message: 'Library system was updated. Still learning the new interface.',                             created_at: isoDateTime(2,10) },
    { industry: 'construction', category: 'safety',     sentiment: 'negative', message: 'Portable toilets have not been cleaned in over a week. Completely unacceptable.',           created_at: isoDateTime(1,7)  },
    { industry: 'construction', category: 'wellbeing',  sentiment: 'negative', message: 'Working 12-hour days is exhausting. No one asks how we are doing.',                        created_at: isoDateTime(2,8)  },
    { industry: 'college',      category: 'wellbeing',  sentiment: 'negative', message: 'Staff meetings scheduled during lunch with no compensation. Very disrespectful.',           created_at: isoDateTime(1,13) },
    { industry: 'college',      category: 'facilities', sentiment: 'negative', message: 'AC in the staff room has been broken for 3 weeks. Very uncomfortable to work in.',         created_at: isoDateTime(4,15) },
    { industry: 'construction', category: 'management', sentiment: 'negative', message: 'Promises about overtime payment have not been kept for two months running.',               created_at: isoDateTime(3,16) },
  ];
  for (const f of feedback) insertF.run(f);
  console.log('✅ Feedback seeded');

  console.log('\n🎉 Database seeded! Run `npm start` to launch WorkWise at http://localhost:3000');
  return db;
}

module.exports = { seed };

if (require.main === module) {
  seed()
    .then(db => { if (db && typeof db.close === 'function') db.close(); })
    .catch(err => { console.error('Seed failed:', err); process.exit(1); });
}
