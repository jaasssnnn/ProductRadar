# ProductRadar — Handoff Document

## What This Is
ProductRadar is a portfolio-ready B2B SaaS analytics web app. Users connect their data (CSV uploads, Stripe sync, or Mixpanel sync), the app scores each customer account for churn risk, and surfaces AI-powered insights, retention curves, activation funnels, and unit economics. Built to demonstrate senior PM skills: product thinking, AI integration, B2B UX, full-stack shipping.

**Live URL:** https://product-radar-mu.vercel.app  
**GitHub:** https://github.com/jaasssnnn/ProductRadar  
**Local path:** `/Users/jasonabhishek/Desktop/VS/Churnrader/productradar/`

---

## Tech Stack
- **Framework:** Next.js 15, App Router
- **Auth:** Supabase Auth (Google OAuth via `@supabase/ssr`)
- **Database:** Supabase Postgres (account states, snapshots — workflow data only)
- **Session data:** localStorage (CSV/scored data — clears on sign-out)
- **Charts:** Recharts
- **CSV parsing:** PapaParse
- **AI:** Groq API (`llama-3.3-70b-versatile`) — real API, no mock
- **Billing data:** Stripe Node SDK (direct sync + Connect OAuth)
- **Animations:** Framer Motion
- **Hosting:** Vercel (free tier)

---

## Environment Variables (set in Vercel)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_BASE_URL=https://product-radar-mu.vercel.app
NEXT_PUBLIC_GROQ_API_KEY
NEXT_PUBLIC_USE_MOCK_AI=false
STRIPE_SECRET_KEY
STRIPE_CONNECT_CLIENT_ID
```

---

## Pages & Features Built

### Core Pages
| Page | Route | What it does |
|------|-------|-------------|
| Login | `/login` | Google OAuth via Supabase |
| Upload | `/upload` | CSV upload, Stripe sync, Mixpanel sync |
| Dashboard | `/dashboard` | KPI cards, risk table, AI weekly digest, anomaly banner |
| Account Detail | `/account/[id]` | Per-account risk breakdown, AI intervention panel |
| Insights | `/insights` | AI insights, clusters, outcome tracking, conversational AI query |
| Changes | `/changes` | Risk band movements between analysis runs |
| Retention | `/retention` | D7/14/30/60/90 cohort curves, heatmap, churn rate by cohort |
| Activation | `/activation` | 7/30-day activation rates, TTFV, by plan and cohort |
| Cost | `/cost` | MRR/user, LTV, LTV:CAC, ARPU by plan, spend CSV |

### Data Sources
- **CSV upload** — auto-detects type by column headers (customers, activity, billing, support)
- **Stripe direct sync** — `/api/stripe/direct-sync` — handles test clock customers (two-pass fetch)
- **Mixpanel sync** — `/api/mixpanel/sync` — pulls events, maps to activity shape, no credentials stored

### Scoring Engine (`src/lib/scoring.js`)
6 heuristic factors, max 100 pts:
- Inactivity +25, Usage Decline +20, Billing Issue +15, Support Friction +15, Renewal Risk +10, Low Adoption +10
- Risk bands: Critical ≥75, High ≥50, Medium ≥25, Low <25
- Outcome-calibrated weight learning kicks in at 5+ resolved accounts
- K-means clustering for risk profile segmentation (`src/lib/clustering.js`)

### AI Features (all using real Groq API)
| Feature | Where | How it triggers |
|---------|-------|----------------|
| Account Recommendation | Account Detail | On-demand button click |
| Portfolio Insights | Insights page | On page load |
| Weekly Digest | Dashboard | Once per ISO week, cached in localStorage |
| Anomaly Banner | Dashboard | Detects critical +2, at-risk +3, MRR at risk +20% jumps |
| Conversational Query | Insights page | User types natural language question |
| Root Cause Panel | Retention + Activation | Metric drops ≥5/10 pts vs previous run |

### Supabase Tables
- `account_states` — status, notes, outcome, owner, due_date per account per user
- `snapshots` — previous analysis run for Changes page diffing

---

## Key Files
```
src/lib/scoring.js          — heuristic engine + weight learning
src/lib/retention.js        — cohort retention engine
src/lib/activation.js       — activation funnel engine
src/lib/cost.js             — unit economics engine
src/lib/clustering.js       — k-means risk profile segmentation
src/lib/claudeApi.js        — all Groq API calls (6 functions)
src/lib/csvParser.js        — PapaParse + auto-detect file type
src/lib/stripeMapper.js     — maps Stripe API objects to CSV shape
src/context/AppContext.jsx  — global state, localStorage + Supabase sync
middleware.js               — Supabase auth guard (1.5s timeout to prevent 504)
app/api/mixpanel/sync/      — Mixpanel Data Export API route
app/api/stripe/             — Stripe direct-sync, Connect OAuth routes
```

---

## Known Issues / Watch Out For
- **Supabase free tier** auto-pauses after 7 days inactivity. Restore at supabase.com/dashboard. Middleware now has 1.5s timeout so it fails fast instead of 504.
- **Anomaly banner + root cause panel** need two analysis runs to compare — won't fire on first session.
- **Weekly digest** cached per ISO week in localStorage (`cr_weekly_digest`). Clear localStorage to force regeneration.
- **Mixpanel sync** maps `distinct_id` / `$user_id` to `customer_id` — must match the customer CSV's `customer_id` column for scoring to link correctly.

---

## What's Done
- ✓ Phase 1 — Rebrand ChurnRadar → ProductRadar
- ✓ Phase 2 — Retention, Activation, Cost per User metric modules
- ✓ Phase 3 — Mixpanel Data Export integration
- ✓ Phase 4 — AI as primary interface (digest, anomaly, query, root cause)

## What's Next (potential)
- Mobile responsiveness polish
- Loading skeleton states
- Vercel KV for Stripe Connect token persistence across serverless instances
- Persist cluster labels to Supabase (currently re-computed, non-deterministic)
- Deauthorization webhook for Stripe Connect (`account.application.deauthorized`)
- Export / share functionality
- Real case study — run on actual churned account data, document as README
