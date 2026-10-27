'use strict';

/**
 * WorkWise Security & Hardening Middleware
 * - Security HTTP Headers
 * - Request payload sizing
 * - In-memory IP Rate Limiting
 * - HTML string sanitization (prevent XSS)
 * - Input validation helpers
 */

// ── 1. HTTP Security Headers ────────────────────────────────────────────────
function securityHeaders(req, res, next) {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Cross-site scripting filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Restrict referrer leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Restrict device permissions
  res.setHeader('Permissions-Policy', 'microphone=(self), camera=(), geolocation=()');
  // Content Security Policy allowing required local scripts and fonts
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';"
  );
  next();
}

// ── 2. In-Memory Rate Limiting ──────────────────────────────────────────────
const requestHits = new Map();

function rateLimiter({ windowMs = 60000, max = 60, message = 'Too many requests, please try again later.' } = {}) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.baseUrl || req.path}`;
    const now = Date.now();

    const record = requestHits.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count++;
    }

    requestHits.set(key, record);

    // Clean up stale entries every 1000 items
    if (requestHits.size > 1000) {
      for (const [k, v] of requestHits.entries()) {
        if (now > v.resetTime) requestHits.delete(k);
      }
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));

    if (record.count > max) {
      return res.status(429).json({ error: message });
    }

    next();
  };
}

// ── 3. HTML Sanitization ────────────────────────────────────────────────────
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// ── 4. Whitelist Validators ─────────────────────────────────────────────────
const VALID_INDUSTRIES = new Set(['construction', 'college']);
const VALID_STATUSES   = new Set(['open', 'under_review', 'resolved']);
const VALID_SEVERITIES = new Set(['low', 'medium', 'high']);
const VALID_SENTIMENTS = new Set(['positive', 'neutral', 'negative']);

function isValidIndustry(val) {
  return VALID_INDUSTRIES.has(String(val).toLowerCase());
}

function isValidStatus(val) {
  return VALID_STATUSES.has(String(val).toLowerCase());
}

function isValidSeverity(val) {
  return VALID_SEVERITIES.has(String(val).toLowerCase());
}

function isValidSentiment(val) {
  return VALID_SENTIMENTS.has(String(val).toLowerCase());
}

module.exports = {
  securityHeaders,
  rateLimiter,
  sanitizeText,
  isValidIndustry,
  isValidStatus,
  isValidSeverity,
  isValidSentiment,
};
