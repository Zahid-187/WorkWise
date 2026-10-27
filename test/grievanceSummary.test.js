'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { summarizeGrievances } = require('../server/lib/grievanceSummary');

describe('Grievance Summary (Rule-based Operational Breakdown)', () => {
  const baseTime = new Date('2026-10-27T10:00:00Z');

  test('handles empty grievance list', () => {
    const summary = summarizeGrievances([], baseTime);
    assert.equal(summary.total, 0);
    assert.equal(summary.overdueCount, 0);
    assert.equal(summary.byStatus.open, 0);
    assert.equal(summary.bySeverity.high, 0);
  });

  test('accurately calculates categories, statuses, and severities', () => {
    const grievances = [
      { id: 1, category: 'safety', status: 'open', severity: 'high', created_at: '2026-10-26 10:00:00' },
      { id: 2, category: 'safety', status: 'under_review', severity: 'medium', created_at: '2026-10-25 10:00:00' },
      { id: 3, category: 'pay', status: 'resolved', severity: 'low', created_at: '2026-10-20 10:00:00' },
    ];

    const summary = summarizeGrievances(grievances, baseTime);

    assert.equal(summary.total, 3);
    assert.equal(summary.byCategory.safety, 2);
    assert.equal(summary.byCategory.pay, 1);
    assert.equal(summary.byStatus.open, 1);
    assert.equal(summary.byStatus.under_review, 1);
    assert.equal(summary.byStatus.resolved, 1);
    assert.equal(summary.bySeverity.high, 1);
    assert.equal(summary.bySeverity.medium, 1);
    assert.equal(summary.bySeverity.low, 1);
  });

  test('flags grievances open for more than 3 days as overdue', () => {
    const grievances = [
      // Created 5 days before baseTime -> OVERDUE
      { id: 1, worker_name: 'Raj', category: 'safety', status: 'open', severity: 'high', created_at: '2026-10-22 10:00:00' },
      // Created 1 day before baseTime -> NOT overdue
      { id: 2, worker_name: 'Priya', category: 'pay', status: 'open', severity: 'medium', created_at: '2026-10-26 10:00:00' },
      // Created 6 days before baseTime but RESOLVED -> NOT overdue
      { id: 3, worker_name: 'Selvam', category: 'workload', status: 'resolved', severity: 'low', created_at: '2026-10-21 10:00:00' },
    ];

    const summary = summarizeGrievances(grievances, baseTime);

    assert.equal(summary.overdueCount, 1);
    assert.equal(summary.overdueGrievances.length, 1);
    assert.equal(summary.overdueGrievances[0].id, 1);
    assert.equal(summary.overdueGrievances[0].daysOpen, 5);
    assert.ok(summary.summaryText.includes('1 grievance overdue'));
  });
});
