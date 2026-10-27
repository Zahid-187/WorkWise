'use strict';

/**
 * Computes statistical and operational summaries for grievances.
 *
 * @param {Array<object>} grievances - List of grievance records from database
 * @param {Date|string} [referenceDate=new Date()] - Reference timestamp for overdue calculation (defaults to now)
 * @returns {object} Aggregated summary object
 */
function summarizeGrievances(grievances = [], referenceDate = new Date()) {
  const refTime = new Date(referenceDate).getTime();
  const OVERDUE_DAYS_THRESHOLD = 3;
  const THREE_DAYS_MS = OVERDUE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000;

  const summary = {
    total: grievances.length,
    byCategory: {},
    byStatus: {
      open: 0,
      under_review: 0,
      resolved: 0,
    },
    bySeverity: {
      high: 0,
      medium: 0,
      low: 0,
    },
    overdueCount: 0,
    overdueThresholdDays: OVERDUE_DAYS_THRESHOLD,
    overdueGrievances: [],
    categories: [],
  };

  for (const g of grievances) {
    // 1. Status count
    const statusKey = (g.status || 'open').toLowerCase();
    summary.byStatus[statusKey] = (summary.byStatus[statusKey] || 0) + 1;

    // 2. Severity count
    const severityKey = (g.severity || 'medium').toLowerCase();
    summary.bySeverity[severityKey] = (summary.bySeverity[severityKey] || 0) + 1;

    // 3. Category count
    const categoryKey = (g.category || 'other').toLowerCase();
    summary.byCategory[categoryKey] = (summary.byCategory[categoryKey] || 0) + 1;

    // 4. Overdue check: open for more than 3 days
    if (statusKey === 'open' && g.created_at) {
      // Normalize SQLite date string (e.g. "2026-10-22 10:00:00" -> ISO)
      const createdDate = new Date(String(g.created_at).replace(' ', 'T'));
      const ageMs = refTime - createdDate.getTime();
      const ageDays = ageMs / (24 * 60 * 60 * 1000);

      if (ageMs > THREE_DAYS_MS) {
        summary.overdueCount++;
        summary.overdueGrievances.push({
          id: g.id,
          worker_id: g.worker_id,
          worker_name: g.worker_name || 'Anonymous',
          category: g.category,
          severity: g.severity,
          description: g.description,
          created_at: g.created_at,
          daysOpen: Math.max(1, Math.floor(ageDays)),
        });
      }
    }
  }

  summary.categories = Object.keys(summary.byCategory).map(cat => ({
    name: cat,
    count: summary.byCategory[cat],
  })).sort((a, b) => b.count - a.count);

  // Generate plain-language executive summary text
  const openCount = summary.byStatus.open || 0;
  const reviewCount = summary.byStatus.under_review || 0;
  const resolvedCount = summary.byStatus.resolved || 0;
  const highSev = summary.bySeverity.high || 0;

  summary.summaryText = [
    `Total of ${summary.total} grievance${summary.total === 1 ? '' : 's'} recorded.`,
    `${openCount} open, ${reviewCount} under review, and ${resolvedCount} resolved.`,
    highSev > 0 ? `⚠️ ${highSev} high-severity issue${highSev === 1 ? '' : 's'} require immediate intervention.` : 'No high-severity grievances.',
    summary.overdueCount > 0 ? `🚨 ${summary.overdueCount} grievance${summary.overdueCount === 1 ? '' : 's'} overdue (>3 days without resolution).` : 'All grievances are within target resolution windows.',
  ].join(' ');

  return summary;
}

module.exports = {
  summarizeGrievances,
};
