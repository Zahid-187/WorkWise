'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calculateAttritionRisk } = require('../server/lib/attritionRisk');

describe('Overwork and Attrition Risk (Rule-based Scoring)', () => {
  const referenceDate = new Date('2026-10-27T10:00:00Z');

  test('flags worker over 60 hours per week and assigns High risk if combined with active grievance', () => {
    const workers = [
      { id: 101, name: 'Rajan Kumar', role: 'Site Manager', industry: 'construction' },
    ];

    // 7 days * 10h = 70h (>60h)
    const shifts = [
      { worker_id: 101, date: '2026-10-21', clock_in: '2026-10-21 07:00:00', clock_out: '2026-10-21 17:00:00', hours_worked: 10, overtime_hours: 2 },
      { worker_id: 101, date: '2026-10-22', clock_in: '2026-10-22 07:00:00', clock_out: '2026-10-22 17:00:00', hours_worked: 10, overtime_hours: 2 },
      { worker_id: 101, date: '2026-10-23', clock_in: '2026-10-23 07:00:00', clock_out: '2026-10-23 17:00:00', hours_worked: 10, overtime_hours: 2 },
      { worker_id: 101, date: '2026-10-24', clock_in: '2026-10-24 07:00:00', clock_out: '2026-10-24 17:00:00', hours_worked: 10, overtime_hours: 2 },
      { worker_id: 101, date: '2026-10-25', clock_in: '2026-10-25 07:00:00', clock_out: '2026-10-25 17:00:00', hours_worked: 10, overtime_hours: 2 },
      { worker_id: 101, date: '2026-10-26', clock_in: '2026-10-26 07:00:00', clock_out: '2026-10-26 17:00:00', hours_worked: 10, overtime_hours: 2 },
      { worker_id: 101, date: '2026-10-27', clock_in: '2026-10-27 07:00:00', clock_out: '2026-10-27 17:00:00', hours_worked: 10, overtime_hours: 2 },
    ];

    const grievances = [
      { id: 1, worker_id: 101, category: 'workload', status: 'open', severity: 'high', created_at: '2026-10-26 09:00:00' },
    ];

    const results = calculateAttritionRisk(workers, shifts, grievances, { referenceDate });

    assert.equal(results.length, 1);
    const result = results[0];
    assert.equal(result.totalHours, 70);
    assert.equal(result.fatigueFlags.over60Hours, true);
    assert.equal(result.riskLevel, 'High');
    assert.ok(result.reasons.some(r => r.includes('60h threshold')));
    assert.ok(result.reasons.some(r => r.includes('grievance')));
  });

  test('flags back-to-back shifts with less than 10 hours rest', () => {
    const workers = [
      { id: 102, name: 'Suresh Babu', role: 'Welder', industry: 'construction' },
    ];

    // Day 1 shift ends at 23:00, Day 2 shift starts at 06:00 -> 7 hours gap (<10h)
    const shifts = [
      { worker_id: 102, date: '2026-10-25', clock_in: '2026-10-25 15:00:00', clock_out: '2026-10-25 23:00:00', hours_worked: 8, overtime_hours: 0 },
      { worker_id: 102, date: '2026-10-26', clock_in: '2026-10-26 06:00:00', clock_out: '2026-10-26 14:00:00', hours_worked: 8, overtime_hours: 0 },
    ];

    const results = calculateAttritionRisk(workers, shifts, [], { referenceDate, minRestHours: 10 });
    const result = results[0];

    assert.equal(result.fatigueFlags.backToBack, true);
    assert.equal(result.shortestRestGap, 7);
    assert.equal(result.riskLevel, 'Medium');
    assert.ok(result.reasons.some(r => r.includes('back-to-back shifts with only 7h rest gap')));
  });

  test('assigns Low risk to workers within standard hours and no grievances', () => {
    const workers = [
      { id: 103, name: 'Geetha', role: 'Admin Staff', industry: 'college' },
    ];

    const shifts = [
      { worker_id: 103, date: '2026-10-25', clock_in: '2026-10-25 09:00:00', clock_out: '2026-10-25 17:00:00', hours_worked: 8, overtime_hours: 0 },
      { worker_id: 103, date: '2026-10-26', clock_in: '2026-10-26 09:00:00', clock_out: '2026-10-26 17:00:00', hours_worked: 8, overtime_hours: 0 },
    ];

    const results = calculateAttritionRisk(workers, shifts, [], { referenceDate });
    const result = results[0];

    assert.equal(result.riskLevel, 'Low');
    assert.equal(result.score, 0);
    assert.ok(result.reasons.some(r => r.includes('healthy limits')));
  });
});
