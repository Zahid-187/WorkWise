/* app.js – shared utilities, industry config, i18n fetch helpers */
'use strict';

// ─── Industry config (mirrors server-side config) ────────────────────────────
const INDUSTRIES = {
  construction: {
    label: 'Construction Site', icon: '🏗️',
    workerLabel: 'Worker', shiftLabel: 'Shift',
    categories: [
      { key: 'safety',     label: 'Safety',     icon: '⛑️'  },
      { key: 'pay',        label: 'Pay',         icon: '💰'  },
      { key: 'harassment', label: 'Harassment',  icon: '🚫'  },
      { key: 'equipment',  label: 'Equipment',   icon: '🔧'  },
      { key: 'other',      label: 'Other',       icon: '📝'  },
    ],
    primary: '#F97316',
  },
  college: {
    label: 'College', icon: '🎓',
    workerLabel: 'Staff Member', shiftLabel: 'Session',
    categories: [
      { key: 'workload',   label: 'Workload',    icon: '📚'  },
      { key: 'harassment', label: 'Harassment',  icon: '🚫'  },
      { key: 'pay',        label: 'Pay',         icon: '💰'  },
      { key: 'facilities', label: 'Facilities',  icon: '🏛️'  },
      { key: 'other',      label: 'Other',       icon: '📝'  },
    ],
    primary: '#4F46E5',
  },
};

// ─── Query param helper ──────────────────────────────────────────────────────
function getQueryParam(name) {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  } catch(e) { return null; }
}

// ─── Session helpers ─────────────────────────────────────────────────────────
const Session = {
  get industry()   { return getQueryParam('industry') || sessionStorage.getItem('ww_industry') || 'construction'; },
  set industry(v)  { sessionStorage.setItem('ww_industry', v); },
  get workerId()   { return getQueryParam('worker_id') || sessionStorage.getItem('ww_worker_id'); },
  set workerId(v)  { sessionStorage.setItem('ww_worker_id', v); },
  get workerName() { return sessionStorage.getItem('ww_worker_name'); },
  set workerName(v){ sessionStorage.setItem('ww_worker_name', v); },
  get role()       { return getQueryParam('role') || sessionStorage.getItem('ww_role') || 'worker'; },
  set role(v)      { sessionStorage.setItem('ww_role', v); },
};

// ─── Fetch helpers ───────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ─── Apply industry theme to document ────────────────────────────────────────
function applyIndustryTheme(industry) {
  document.body.setAttribute('data-industry', industry);
  const cfg = INDUSTRIES[industry];
  document.documentElement.style.setProperty('--primary', cfg.primary);
}

// ─── Format helpers ──────────────────────────────────────────────────────────
function fmtHours(h) {
  if (h == null) return '—';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}

function fmtCurrency(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function weekStartISO() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}

// ─── Export globals ───────────────────────────────────────────────────────────
window.WW = { INDUSTRIES, Session, apiFetch, applyIndustryTheme, fmtHours, fmtCurrency, todayISO, weekStartISO };
