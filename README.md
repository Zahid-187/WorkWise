# WorkWise 🏗️🎓

> **Fair · Safe · Transparent · SDG 8: Decent Work & Economic Growth**  
> Hackathon: Prompt Wars 2026

WorkWise makes work fairer, safer, and more transparent for workers — and gives employers actionable operational insights computed directly from workplace data.

> [!NOTE]
> **No API Keys or .env Required**: WorkWise operates completely self-contained with zero external dependencies, no cloud API keys, and no `.env` file needed.

---

## Features

### For Workers 👷
| Feature | Details |
|---|---|
| **Check In / Check Out** | Large tactile button records clock-in/out; hours & overtime calculated automatically |
| **Weekly Summary** | Bar chart showing daily hours; overtime shown in red |
| **Fatigue Alerts** | Rule-based: warns when >60 hrs/week or back-to-back shifts with insufficient rest (<10h) |
| **Raise a Grievance** | Category icon grid + mic button (voice-to-text via Web Speech API) |
| **Anonymous Feedback** | Sentiment picker; no worker ID stored |
| **Payslip Page** | Base pay, overtime (1.5×), deductions in plain words |
| **Language Switcher** | English / Tamil (தமிழ்) / Hindi (हिंदी) |
| **Listen Button** | Reads payslip aloud via browser SpeechSynthesis API |
| **Dispute Payslip** | One tap creates a grievance pre-tagged as a payslip dispute |

### For Employers / Admin 📊
| Feature | Details |
|---|---|
| **Roster** | Weekly hours chart; red = overtime; fatigue badges |
| **Grievance Inbox** | Filter by status & severity; mark under review / resolve / escalate |
| **Feedback Wall** | Sentiment-tagged anonymous feedback |
| **Feedback Themes** | Keyword engine across pay, safety, equipment, management, workload, wellbeing with sentiment split and urgent safety alerts |
| **Grievance Summary** | Breakdown by category, status, severity, and overdue items (>3 days open) |
| **Overwork & Retention Risk** | Multi-factor flight risk scoring (Low / Medium / High) based on hours (>60h), back-to-back shifts (<10h rest), and unresolved grievances |

---

## Quick Start

### 1. Clone & install
```bash
git clone <repo-url>
cd WorkWise
npm install
```

### 2. Seed the database
```bash
npm run seed
```
This initializes `workwise.db` with:
- 20 workers (10 construction, 10 college)
- 1 week of shifts (with workers crossing 60+ hours & back-to-back shifts)
- 5 grievances (with open, overdue, and resolved states)
- 15 anonymous feedback entries across positive, neutral, and negative sentiments

### 3. Start the server
```bash
npm start
```
Open **http://localhost:3000** in your browser.

### 4. Run Unit Tests
```bash
npm test
```
Runs 10 comprehensive unit tests using the native Node.js test runner (`node:test`) covering all pure functions in `server/lib/`.

---

## Industry Toggle

Switch between **Construction Site 🏗️** and **College 🎓** on any screen with one tap. Each industry features custom:
- Workers, roles, and avatars
- Grievance categories (safety/equipment vs. workload/facilities)
- Theme palettes (orange/navy vs. indigo/teal)
- Feedback & operational analysis

---

## Project Structure

```
WorkWise/
├── server/
│   ├── index.js                  Express server entry point (PORT=3000 default)
│   ├── db.js                     SQLite connection & schema (sql.js)
│   ├── seed.js                   Database seeder
│   ├── config/
│   │   └── industries.js         Industry config (labels, categories, colours)
│   ├── lib/                      Pure rule-based analytical functions (100% testable)
│   │   ├── feedbackThemes.js     Keyword matching, sentiment split & urgent flags
│   │   ├── grievanceSummary.js   Category, status, severity & overdue calculations
│   │   └── attritionRisk.js      Fatigue detection (>60h, <10h rest) & retention risk scoring
│   └── routes/
│       ├── workers.js            Worker profile endpoints
│       ├── shifts.js             Clock-in/out, hours computation, fatigue detection
│       ├── grievances.js         Grievance submission and lifecycle management
│       ├── feedback.js           Anonymous feedback collection
│       └── insights.js           Employer insight endpoints (rule-based intelligence)
├── public/
│   ├── index.html                Landing & role selector (Worker / Employer)
│   ├── worker.html               Worker dashboard with clock-in/out & voice input
│   ├── employer.html             Employer dashboard with roster & operational insights
│   ├── payslip.html              Payslip breakdown with TTS & multi-language support
│   ├── css/style.css             Accessible high-contrast styles (≥48px tap targets)
│   ├── js/app.js                 Shared utilities & session helpers
│   └── vendor/                   Offline frontend assets (Alpine.js, Tailwind, Chart.js)
└── test/                         Unit test suites (node:test)
    ├── feedbackThemes.test.js
    ├── grievanceSummary.test.js
    └── attritionRisk.test.js
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/workers` | List workers (`?industry=`) |
| GET | `/api/workers/:id` | Single worker |
| GET | `/api/shifts` | Shifts list (`?worker_id=&week=`) |
| GET | `/api/shifts/summary` | Weekly totals + fatigue flags (`?industry=`) |
| GET | `/api/shifts/status/:id` | Check current clock-in state |
| POST | `/api/shifts/clockin` | Record clock-in timestamp |
| POST | `/api/shifts/clockout` | Record clock-out timestamp and compute hours |
| GET | `/api/grievances` | List grievances (`?industry=&status=&category=`) |
| GET | `/api/grievances/worker/:id` | Worker's own grievance history |
| POST | `/api/grievances` | Submit new grievance |
| PATCH | `/api/grievances/:id` | Update grievance status/severity |
| GET | `/api/feedback` | Anonymous feedback list (`?industry=&sentiment=`) |
| POST | `/api/feedback` | Submit anonymous feedback |
| GET/POST | `/api/insights/feedback-themes` | Keyword analysis with sentiment & urgency |
| GET/POST | `/api/insights/grievance-summary` | Breakdown by status, severity, and overdue |
| GET/POST | `/api/insights/retention-risk` | Overwork flags and attrition risk ratings |

---

## Accessibility & Offline-First

- All touch targets adhere to WCAG 2.5.5 (≥ 48px).
- High-contrast visual palette (≥ 4.5:1 ratio).
- Multi-modal input/output: SpeechRecognition for grievance voice input, SpeechSynthesis for payslip readouts.
- Zero external CDN dependencies at runtime; vendor assets are bundled locally in `public/vendor/`.

---

*Built for Prompt Wars 2026 · SDG 8: Decent Work and Economic Growth*
