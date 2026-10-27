'use strict';
const express = require('express');
const { getDb } = require('../db');
const { analyzeFeedbackThemes } = require('../lib/feedbackThemes');
const { summarizeGrievances } = require('../lib/grievanceSummary');
const { calculateAttritionRisk } = require('../lib/attritionRisk');

const router = express.Router();

// Helper to extract industry from req.body or req.query safely
function resolveIndustry(req) {
  const ind = String(req.body?.industry || req.query?.industry || 'construction').toLowerCase();
  return (ind === 'college') ? 'college' : 'construction';
}

/**
 * 1. Feedback Themes: keyword-based thematic grouping, sentiment split & urgent flag
 * POST or GET /api/insights/feedback-themes
 */
async function handleFeedbackThemes(req, res) {
  const db = await getDb();
  const industry = resolveIndustry(req);

  const feedback = db.all(
    'SELECT id, industry, category, sentiment, message, created_at FROM feedback WHERE industry = ? ORDER BY created_at DESC',
    [industry]
  );

  const themes = analyzeFeedbackThemes(feedback);
  res.json({ result: themes });
}

router.post('/feedback-themes', handleFeedbackThemes);
router.get('/feedback-themes', handleFeedbackThemes);

/**
 * 2. Grievance Summary: counts by category, status, severity & overdue (>3 days) items
 * POST or GET /api/insights/grievance-summary (and alias summarise-grievances)
 */
async function handleGrievanceSummary(req, res) {
  const db = await getDb();
  const industry = resolveIndustry(req);

  const grievances = db.all(
    `SELECT g.*, w.name AS worker_name, w.avatar_emoji
     FROM grievances g
     JOIN workers w ON w.id = g.worker_id
     WHERE g.industry = ?
     ORDER BY g.created_at DESC`,
    [industry]
  );

  const summary = summarizeGrievances(grievances);
  res.json({ result: summary });
}

router.post('/grievance-summary', handleGrievanceSummary);
router.get('/grievance-summary', handleGrievanceSummary);
router.post('/summarise-grievances', handleGrievanceSummary);
router.get('/summarise-grievances', handleGrievanceSummary);

/**
 * 3. Overwork & Retention Risk: flags workers over 60h/week, <10h rest gap, and calculates Low/Medium/High risk
 * POST or GET /api/insights/retention-risk (and alias attrition-risk)
 */
async function handleRetentionRisk(req, res) {
  const db = await getDb();
  const industry = resolveIndustry(req);

  const workers = db.all(
    'SELECT id, name, role, industry, avatar_emoji, hourly_rate FROM workers WHERE industry = ? ORDER BY name',
    [industry]
  );

  const shifts = db.all(
    `SELECT s.* FROM shifts s
     JOIN workers w ON w.id = s.worker_id
     WHERE w.industry = ?
     ORDER BY s.date ASC, s.clock_in ASC`,
    [industry]
  );

  const grievances = db.all(
    `SELECT g.*, w.name AS worker_name
     FROM grievances g
     JOIN workers w ON w.id = g.worker_id
     WHERE g.industry = ?`,
    [industry]
  );

  const riskData = calculateAttritionRisk(workers, shifts, grievances, { minRestHours: 10 });
  res.json({ result: riskData });
}

router.post('/retention-risk', handleRetentionRisk);
router.get('/retention-risk', handleRetentionRisk);
router.post('/attrition-risk', handleRetentionRisk);
router.get('/attrition-risk', handleRetentionRisk);

module.exports = router;
