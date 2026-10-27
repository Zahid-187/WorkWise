'use strict';

/**
 * Evaluates overwork fatigue and calculates attrition (flight) risk scores.
 *
 * Risk Factors:
 * - Overwork: >60 hours per week (+3 pts)
 * - Insufficient rest: <10 hours between consecutive shifts (+2 pts)
 * - High overtime: >10 hours (+1 pt)
 * - Open grievances: (+1 pt, or +2 pts if high severity)
 * - Overdue grievances: open >3 days (+3 pts)
 *
 * Risk Level:
 * - High: Score >= 4
 * - Medium: Score >= 2
 * - Low: Score < 2
 *
 * @param {Array<object>} workers
 * @param {Array<object>} shifts
 * @param {Array<object>} grievances
 * @param {object} [options]
 * @param {Date|string} [options.referenceDate=new Date()]
 * @param {number} [options.minRestHours=10]
 * @returns {Array<object>}
 */
function calculateAttritionRisk(workers = [], shifts = [], grievances = [], options = {}) {
  const minRestHours = options.minRestHours ?? 10;
  const refTime = new Date(options.referenceDate || new Date()).getTime();
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

  return workers.map(worker => {
    // 1. Gather worker shifts
    const workerShifts = shifts
      .filter(s => Number(s.worker_id) === Number(worker.id))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let totalHours = 0;
    let overtimeHours = 0;
    workerShifts.forEach(s => {
      totalHours += Number(s.hours_worked || 0);
      overtimeHours += Number(s.overtime_hours || 0);
    });
    totalHours = Math.round(totalHours * 10) / 10;
    overtimeHours = Math.round(overtimeHours * 10) / 10;

    // 2. Check for overwork flag (>60 hrs)
    const over60Hours = totalHours > 60;

    // 3. Check for back-to-back shifts with less than minRestHours (10 hrs) rest gap
    let backToBack = false;
    let shortestRestGap = null;

    for (let i = 0; i < workerShifts.length - 1; i++) {
      const prev = workerShifts[i];
      const next = workerShifts[i + 1];

      if (prev.clock_out && next.clock_in) {
        const prevEnd = new Date(String(prev.clock_out).replace(' ', 'T')).getTime();
        const nextStart = new Date(String(next.clock_in).replace(' ', 'T')).getTime();
        const gapHours = (nextStart - prevEnd) / (1000 * 60 * 60);

        if (gapHours >= 0) {
          if (shortestRestGap === null || gapHours < shortestRestGap) {
            shortestRestGap = Math.round(gapHours * 10) / 10;
          }
          if (gapHours < minRestHours) {
            backToBack = true;
          }
        }
      }
    }

    // 4. Gather worker grievances
    const workerGrievances = grievances.filter(g => Number(g.worker_id) === Number(worker.id));
    const openGrievances = workerGrievances.filter(g => g.status === 'open' || g.status === 'under_review');
    const overdueGrievances = openGrievances.filter(g => {
      if (g.status !== 'open' || !g.created_at) return false;
      const createdTime = new Date(String(g.created_at).replace(' ', 'T')).getTime();
      return (refTime - createdTime) > THREE_DAYS_MS;
    });

    // 5. Score calculation and reasons
    let score = 0;
    const reasons = [];

    if (over60Hours) {
      score += 3;
      reasons.push(`Overworked: ${totalHours} hrs worked this week (exceeds safe 60h threshold)`);
    }

    if (backToBack) {
      score += 2;
      const gapText = shortestRestGap !== null ? `${shortestRestGap}h` : '<10h';
      reasons.push(`Insufficient rest: back-to-back shifts with only ${gapText} rest gap (minimum required: ${minRestHours}h)`);
    }

    if (overtimeHours > 10) {
      score += 1;
      reasons.push(`Heavy overtime burden: ${overtimeHours} overtime hours accumulated`);
    }

    if (overdueGrievances.length > 0) {
      score += 3;
      const firstOverdue = overdueGrievances[0];
      reasons.push(`Unresolved grievance overdue (>3 days unattended): ${firstOverdue.category}`);
    }

    openGrievances.forEach(g => {
      // Avoid duplicate reason if already counted as overdue
      const isOverdue = overdueGrievances.some(og => og.id === g.id);
      if (!isOverdue) {
        if (g.severity === 'high') {
          score += 2;
          reasons.push(`High-severity grievance pending resolution: ${g.category}`);
        } else {
          score += 1;
          reasons.push(`Active grievance under review: ${g.category}`);
        }
      }
    });

    // Determine risk category
    let riskLevel = 'Low';
    if (score >= 4) {
      riskLevel = 'High';
    } else if (score >= 2) {
      riskLevel = 'Medium';
    }

    if (reasons.length === 0) {
      reasons.push('Hours within healthy limits; zero active grievances');
    }

    return {
      workerId: worker.id,
      name: worker.name,
      role: worker.role,
      avatar_emoji: worker.avatar_emoji || '👤',
      industry: worker.industry,
      totalHours,
      overtimeHours,
      shortestRestGap,
      fatigueFlags: {
        over60Hours,
        backToBack,
      },
      openGrievancesCount: openGrievances.length,
      overdueGrievancesCount: overdueGrievances.length,
      score,
      riskLevel,
      reasons,
    };
  }).sort((a, b) => b.score - a.score);
}

module.exports = {
  calculateAttritionRisk,
};
