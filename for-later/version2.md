# ProductRadar — Version 2 Roadmap & Change Log

## What This Document Is

A running record of everything planned, in progress, and completed for Version 2 of ProductRadar.
Covers what existed before, what changed, what was added, and what still needs to be done.

---

## What Existed Before (Version 1 — ChurnRadar)

**Original app:** ChurnRadar — a portfolio-ready B2B SaaS churn risk detection tool.

**Core features in V1:**
- CSV upload for 4 data types: customers, activity, billing, support
- Heuristic scoring engine (6 factors, max 100 pts)
- Dashboard with KPI cards, risk table, risk factor bar chart
- Account detail page with AI intervention panel (Groq)
- Insights page with AI-generated insights, cluster cards, outcome tracking
- Changes page showing risk band movements between analysis runs
- Stripe direct sync (with test clock two-pass fetch fix)
- Supabase auth (Google OAuth)
- Outcome-calibrated weight learning (kicks in at 5+ resolved accounts)
- K-means clustering for risk profile segmentation

**What it lacked:**
- No activation, retention, or cost metrics
- No Mixpanel integration
- No proactive AI — only on-demand per account
- Branding was ChurnRadar, not ProductRadar

---

## Phase 1 — Rebrand: ChurnRadar → ProductRadar

**Goal:** Rename everywhere so the portfolio presents a single consistent product name.

| Change | Status |
|--------|--------|
| Sidebar logo label | ✓ Done |
| Login page heading | ✓ Done |
| App documentation (APP_DOCUMENTATION.md) | ✓ Done |
| GitHub repo renamed to ProductRadar | ✓ Done |
| Vercel project renamed to Product Radar | ✓ Done |
| Live URL: product-radar-mu.vercel.app | ✓ Done |
| Source file strings (any remaining "ChurnRadar") | ⚠ Not fully verified |

---

## Phase 2 — New Metrics Modules

**Goal:** Add three new analytical pages — Activation, Retention, Cost per User — each as a standalone
page under the "Metrics" section of the sidebar. Uses existing CSV data where possible; new data
sources added only where needed.

---

### 2A — Retention

**What was there before:** Nothing. Retention was not tracked at all.

**What was added:**
- `src/lib/retention.js` — cohort engine
  - Groups customers by signup month
  - Computes retention at D7, D14, D30, D60, D90 per cohort
  - Weighted average curves across all cohorts
- `src/views/RetentionPage.jsx` — full page
  - 3 KPI cards: Day-7, Day-30, Day-90 overall retention rates
  - Overall retention curve (line chart)
  - Per-cohort retention curves (multi-line chart, one line per cohort month)
  - Cohort heatmap table with color coding (green ≥70%, amber ≥50%, orange ≥30%, red <30%)
- Route: `app/(main)/retention/page.js`

**Data needed:** Customers CSV (with `signup_date`) + Activity CSV. No new CSV type required.

**Updates:**
- ✓ Explicit D30 Churn Rate column added to cohort heatmap (100 − D30 retention, shown in red)
- Rolling retention heatmap by week (currently by month cohort only — not yet done)

---

### 2B — Activation

**What was there before:** Nothing. Activation was not tracked at all.

**What was added:**
- `src/lib/activation.js` — activation engine
  - Auto-detects activation events: looks for `activated`, `activation`, `onboarding_complete`,
    `first_login`, `setup_complete`, `feature_use` in the activity CSV
  - Falls back to first-ever activity event if no dedicated activation events found
  - Computes: 7-day activation rate, 30-day activation rate, avg TTFV, median TTFV
  - Breaks down by plan and by cohort month
- `src/views/ActivationPage.jsx` — full page
  - 3 KPI cards: 7-Day Activation Rate, 30-Day Activation Rate, Avg Time to First Value (with median)
  - Bar chart: activation rate by plan (7-day vs 30-day grouped bars)
  - Bar chart: activation rate by cohort month
  - Cohort breakdown table
  - Notice banner when no dedicated activation events are detected (proxy mode)
- Route: `app/(main)/activation/page.js`

**Data needed:** Customers CSV (with `signup_date`) + Activity CSV.
For richer activation: add `event_name = "activated"` or `"onboarding_complete"` rows to activity CSV.

**Still missing from spec:**
- Mixpanel funnel data input (planned in Phase 3)
- Onboarding funnel step-by-step visualization (funnel chart, not just a rate)

---

### 2C — Cost per User

**What was there before:** Nothing. Unit economics were not tracked at all.

**What was added:**
- `src/lib/cost.js` — cost engine
  - MRR / active users (customers with at least one activity event)
  - MRR / total customers (ARPU)
  - Estimated LTV = ARPU × 24 months (default lifespan assumption)
  - CAC: manual input OR derived from spend CSV (total spend / new customers)
  - LTV:CAC ratio
  - ARPU breakdown by plan
  - Spend by channel (if channel column present in spend CSV)
- `src/views/CostPage.jsx` — full page
  - 3 KPI cards: MRR/Active User, Estimated LTV, LTV:CAC ratio (color coded — amber if <3x)
  - Manual CAC input field (dollar amount)
  - Spend CSV upload (columns: `spend`, `new_customers`, optional: `channel`, `month`)
  - Summary stats: Total MRR, Total Customers, Active Users, Total Tickets
  - ARPU by plan bar chart
  - Spend by channel bar chart (if channel data present)
  - Plan breakdown table
- Route: `app/(main)/cost/page.js`

**Data needed:** Customers CSV (MRR). Activity CSV for active user count. Manual CAC input OR
spend CSV with columns: `spend` / `total_spend`, `new_customers` / `new_signups`.

**Updates:**
- ✓ Manual support cost per ticket input added ($/ticket field, shows total support cost = tickets × cost)
- Support cost per ticket surfaced in summary stats row

---

### Sidebar Changes (Phase 2)

**Before:** Upload, Dashboard, Insights, Changes (4 items, one section)

**After:** Same 4 items under "Main", plus a new "Metrics" section with:
- Retention (RefreshCw icon)
- Activation (Rocket icon)
- Cost (DollarSign icon)

---

## Phase 3 — Mixpanel Integration

**Status: ✓ Complete**

**Goal:** Pull event data directly from Mixpanel so users don't need to export/upload activity CSVs manually.

**What was built:**
- `app/api/mixpanel/sync/route.js` — server-side POST route
  - Accepts `{ apiSecret, fromDate, toDate }` from the client
  - Calls Mixpanel Data Export API (`https://data.mixpanel.com/api/2.0/export/`)
  - Auth: Basic auth with API secret — credentials never stored, used once per request
  - Parses NDJSON response (one event per line)
  - Maps to activity CSV shape: `{ customer_id, event_name, timestamp, count }`
  - Aggregates by customer_id + event_name + date, counts occurrences
  - Uses `$user_id` or `distinct_id` as `customer_id`
- `src/components/upload/MixpanelConnect.jsx` — collapsible panel on Upload page
  - API secret input (password field), date range picker (defaults last 30 days)
  - On success: activity rows merged into Upload state, replaces existing activity slot
  - Shows last sync summary after successful pull
- No env vars needed — credentials entered per-sync, not stored

**How it feeds existing engines:** Mixpanel events land in the same activity slot as a CSV upload.
Scoring, retention, and activation engines consume them identically — no downstream changes needed.

---

## Phase 4 — AI as Primary Interface

**Status: Not started**

**Goal:** Shift AI from on-demand (per-account intervention panel) to proactive and conversational.

**Planned features:**

### 4A — Proactive Weekly Digest
- Every Monday, AI generates a portfolio summary: what improved, what deteriorated, what needs
  action this week
- Pushed to the Dashboard as a persistent card (above the KPI cards)
- Uses Groq to analyze the latest scored accounts and compare to previous snapshot
- Triggered by a scheduled cron job or on first Dashboard visit each week

### 4B — Anomaly Push
- After every analysis run, AI scans for significant metric changes across all four modules
  (churn risk, activation, retention, cost)
- Surfaces unprompted alerts: "Activation dropped 23% for Enterprise accounts this week"
- Shown as a dismissible banner or notification panel on the Dashboard

### 4C — Conversational Query
- Natural language input bar (on Insights or a dedicated AI page):
  "Which cohort has the worst 30-day retention?"
  "Show me accounts with billing issues and declining usage"
- AI queries the in-memory data and returns an answer + relevant chart
- Powered by Groq function calling or structured prompt with JSON output

### 4D — Root Cause Panel
- When a metric drops between runs, AI hypothesizes why based on correlated signals:
  "Activation fell from 68% to 41% — 6 accounts in the March cohort had no feature_use events
  in their first 7 days, coinciding with a spike in support tickets for the onboarding flow"
- Shown on the Retention and Activation pages when a decline is detected vs previous snapshot

---

## Phase 2 Status Summary

| Item | Status |
|------|--------|
| Retention page + engine | ✓ Done |
| Activation page + engine | ✓ Done |
| Cost page + engine | ✓ Done |
| Churn rate by cohort (explicit column) | ✓ Done |
| Support cost per ticket (manual input) | ✓ Done |
| Sidebar Metrics section | ✓ Done |

**Phase 2 complete. Ready to move to Phase 3.**

---

## Files Added in Version 2

```
src/lib/retention.js
src/lib/activation.js
src/lib/cost.js
src/views/RetentionPage.jsx
src/views/ActivationPage.jsx
src/views/CostPage.jsx
app/(main)/retention/page.js
app/(main)/activation/page.js
app/(main)/cost/page.js
middleware.js          (fixed: api routes now excluded from auth middleware)
for-later/seed-demo-data.md
for-later/version2.md  (this file)
```

## Files Modified in Version 2

```
src/components/layout/Sidebar.jsx  (added Metrics section + 3 nav items)
```
