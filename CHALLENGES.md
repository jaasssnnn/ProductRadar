# ChurnRadar — Technical Challenges

Real problems encountered while building this project, and how they were solved. Written for portfolio context — these represent the kind of decisions and debugging that don't show up in screenshots.

---

## 1. Vite → Next.js 15 App Router Migration

**The problem:** The original prototype was built on Vite + React Router. Moving to Next.js 15 with the App Router wasn't a drop-in migration — it required rethinking routing, data fetching, and component architecture simultaneously.

**Specific friction points:**
- React Router's `useNavigate`, `useParams`, and `NavLink` had to be replaced with Next.js equivalents (`useRouter`, `useParams` from `next/navigation`, `Link` + `usePathname`)
- All interactive components needed `'use client'` directives — easy to miss on deeply nested components, hard to debug because the error messages point to the wrong file
- Next.js treats `src/pages/` as the Pages Router. Since components were originally organized under `src/pages/`, they had to move to `src/views/` to avoid a routing conflict
- PostCSS config had to convert from ESM (`export default`) to CommonJS (`module.exports`) for Turbopack compatibility
- React 19 disallows defining components inside other components. Two cases — `SortHeader` in `RiskTable` and `CopyButton` in `InterventionPanel` — caused hydration errors that were fixed by moving them to module scope

**What was learned:** App Router is powerful but assumes you're building top-down. Migrating an existing component tree into it requires auditing every file for routing calls, client/server boundaries, and implicit React patterns that React 19 tightens up.

---

## 2. Supabase SSR Middleware — Root vs. src/ Split

**The problem:** Next.js requires middleware to live at the project root (`middleware.js`). But during local development with Turbopack, it resolves from `src/middleware.js`. Running in production only, with middleware at root, worked fine. Running locally only, with middleware at `src/`, worked fine. Deploying broke local, and vice versa.

**The fix:** A two-file split. `middleware.js` at the root re-exports from `src/middleware.js` where the actual logic lives. This satisfies both environments without duplicating any code.

**Why it matters:** Middleware handles every authenticated request — getting this wrong means every user gets bounced to login or, worse, the auth guard is silently skipped.

---

## 3. Scoring Engine: Absent Data ≠ Churn Signal

**The problem:** When Stripe sync was added, it only provides billing and customer data — no activity or support. The original scoring engine treated missing activity rows as "999 days since last activity," immediately firing the inactivity and low-adoption factors. An account synced from Stripe with no CSV activity would score 50+ on its first load, before any behavioral data was present.

**The fix:** A `dataPresence` parameter was added to `scoreAccount()`. Each factor now checks whether its required data source was actually loaded before firing. Missing activity means those three factors are skipped — not zero'd, but fully absent from the score. The partial-data confidence banner on the dashboard communicates this to the user explicitly.

**Why it matters:** A churn risk tool that cries wolf before it has data is worse than useless — it trains users to ignore it. The fix keeps scores honest and makes the "Phase A → Phase B" demo narrative work: Stripe sync produces a low score based on billing only, then adding activity CSVs escalates it to Critical as the full picture emerges.

---

## 4. Usage Decline: Binary Drop vs. Trend-Based Slope

**The problem:** The first version of the usage decline factor compared the two most recent weeks against the two prior weeks and fired if usage dropped ≥50%. This produced false positives for accounts that had a single quiet week sandwiched between active periods, and missed accounts with a steady but gradual downward trend.

**The fix:** Replaced the binary comparison with a 4-week **linear least-squares slope**:

```
slope = (−1.5·w1 − 0.5·w2 + 0.5·w3 + 1.5·w4) / 5
normalizedSlope = slope / weeklyMean
```

The factor fires on `normalizedSlope < −0.10`, meaning a sustained directional decline, not a single anomalous week. Normalizing against the mean prevents low-volume accounts (2 events/week) from being treated identically to high-volume accounts (200 events/week) with the same absolute drop.

The same `weeklyActivity` array powers the sparklines rendered in the dashboard risk table — so the trend the scoring engine sees is the same trend the user sees.

---

## 5. Stripe Test Clock Customers Not Appearing in API Responses

**The problem:** Three demo customers were seeded into Stripe test mode using a test clock (to simulate time advancement for renewal scenarios). They were visible in the Stripe dashboard but `stripe.customers.list()` returned an empty array. Same for `stripe.subscriptions.list()`.

**Root cause:** Stripe intentionally excludes test-clock-associated objects from standard list endpoints. This is documented but easy to miss — the dashboard shows them, the API doesn't, which makes it look like an authentication or key problem.

**The fix:** The direct-sync route now does a two-pass fetch:
1. `stripe.customers.list()` — gets regular customers
2. `stripe.testHelpers.testClocks.list()` — enumerates all test clocks
3. For each clock: `stripe.customers.list({ test_clock: clockId })` — gets clock-associated customers
4. Subscriptions and invoices are fetched per-customer rather than via global list (same exclusion issue applies)

**Side effect:** This is also more robust for production — per-customer fetching avoids pagination limits on the global subscription list.

---

## 6. Stripe Connect OAuth Not Available in India

**The problem:** The original plan was to use Stripe Connect OAuth so users could connect their own Stripe accounts. Stripe Connect requires an application review and is not available to Indian Stripe accounts without an invite. The OAuth flow could be built but never authorized.

**The fix:** A direct-sync mode was added as the default. `STRIPE_SECRET_KEY` is read from `.env` on the server side and the sync runs against the developer's own Stripe account. This is sufficient for a portfolio demo where the goal is to show the data flow, not multi-tenant isolation. Connect OAuth code is preserved and activates when `NEXT_PUBLIC_STRIPE_CONNECT_CONFIGURED=true`.

**What was learned:** Third-party OAuth integrations have geographic and account-tier restrictions that don't show up in documentation until you try to activate them. Building a fallback before the OAuth path is proven is the right instinct.

---

## 7. Groq vs. Gemini — Provider Switch

**The problem:** The AI layer was originally built for Google Gemini. After shipping, the Gemini free tier quota was exhausted within a few days of development use, with no clear reset time and a slow rate limit that made the UI feel broken during testing.

**The fix:** Switched to Groq API (`llama-3.3-70b-versatile`). Groq's free tier is significantly more generous, response times are faster, and the API is OpenAI-compatible so the switch required only changing the base URL, model name, and API key — not the prompt structure or response parsing.

**Why it matters for portfolio:** The AI layer has a mock fallback that activates when no key is present, so the app is fully demoable without any AI cost. But the real AI path needs to actually work during development without hitting quotas every afternoon.

---

## 8. Serverless State — tokenStore.js In-Memory Map

**The problem:** The Stripe Connect OAuth flow requires storing an access token between the `/auth` redirect and the `/callback` exchange. A simple in-memory Map works locally (single process). On Vercel, each serverless function invocation may run in a separate container, so the token stored in `/auth` is invisible to the process handling `/callback`.

**Current state:** The in-memory store works for local development and single-instance deploys. It's documented as a known limitation.

**The right fix:** Replace the Map with Vercel KV (Redis-backed, edge-available) or short-lived encrypted cookies. Not implemented because the Connect OAuth path isn't the primary demo flow — direct sync is. This is a pre-production TODO, not a shipped bug.

---

## 9. React 19 Component-Inside-Component Rule

**The problem:** Two components — `SortHeader` (inside `RiskTable`) and `CopyButton` (inside `InterventionPanel`) — were defined as inner functions. React 19 tightens component identity rules: components defined inside other components get a new identity on every render, causing hydration mismatches and state loss.

**The fix:** Both components were moved to module scope (outside the parent function). No logic changed — just extraction. The hydration errors disappeared.

**Why it's worth noting:** This is a React 19 breaking change from React 18 behavior where inner components worked (poorly, but without errors). It surfaces late in a migration because it only breaks at runtime during hydration, not at build time.

---

## 11. Moving Beyond Pure Heuristics — Adding Machine Learning

**The problem:** The original scoring engine was entirely hand-tuned: billing issues always worth 15 points, inactivity always worth 25. Those weights were based on industry research and intuition, not on what actually predicts churn in a specific account base. Two problems emerge at scale:

1. **Generalisation failure** — a product with high-touch enterprise contracts has a completely different churn signature than a self-serve PLG tool. Fixed weights built for one segment misfire on the other.
2. **No feedback loop** — CS teams record outcomes (saved, churned, expanded) but none of that information fed back into the scoring. The tool got smarter at surfacing risk signals but not at weighting them correctly.

The question was which algorithm to add without making the system a black box. A complex model (gradient boosting, neural net) would improve accuracy but make it impossible to explain to a non-technical PM or CS rep why a score changed. That defeats the purpose of a tool designed to build trust with those audiences.

**Two algorithms chosen, for different reasons:**

**Outcome-calibrated weight learning** (`computeLearnedWeights` in `src/lib/scoring.js`): A Bayesian-inspired frequency approach. For each factor, compute how often it appears in churned accounts vs saved accounts. Compare that rate to the baseline churn rate across all resolved outcomes. The ratio is used to scale the base weight up or down — clamped at 0.25×–3× so a single outlier can't break the system. All weights are then rescaled to keep the sum constant, preserving the 0–100 score range. The result is interpretable: "billing issues now score 22 points instead of 15 because in your data, accounts with billing issues churned 80% of the time vs a 40% baseline." That's a statement a CS rep can act on.

**K-means clustering** (`src/lib/clustering.js`): Unsupervised, so it doesn't need outcome labels. It groups accounts by the pattern of signals they exhibit — their 6-dimensional binary risk vector. This surfaces cohort-level insight that the individual account score doesn't: "these 4 accounts all have the same combination of billing issues + inactivity — treat them as one intervention cohort, not four separate cases." K-means was chosen over DBSCAN or hierarchical clustering because it scales cleanly to small datasets (12–200 accounts), is trivial to implement in JS without a library, and produces a fixed number of segments that's easy to display as a card grid.

**Key design decisions:**

- **Threshold of 5 outcomes before learning activates.** With fewer samples, churn rate estimates are too noisy — a single churned account with a billing issue would set `factorChurnRate = 1.0` and triple that factor's weight. Five provides a minimal stabilising denominator. The UI shows a countdown ("needs 3 more outcomes to activate") so the feature feels like it's building toward something, not just absent.

- **Only Churned and Saved count as training signal, not Expanded.** Expanded accounts are a different motion — they didn't churn, but they also didn't require intervention to retain. Including them as "saved" would dilute the signal; excluding them keeps the model focused on identifying and reversing genuine churn risk.

- **K-means++** initialization instead of random. Pure random centroid seeding can produce degenerate clusters when feature vectors are sparse binary values — two centroids can end up identical, collapsing two clusters into one. K-means++ seeds the second centroid as far as possible from the first, the third as far as possible from both, and so on. This gives consistent cluster structure across runs.

- **Auto-named clusters, not numbered segments.** Cluster 0 / Cluster 1 / Cluster 2 is technically accurate but useless in a CS workflow. The naming function inspects each centroid for dominant factors (> 0.5 threshold), looks them up in a combination table ("Billing Issue + Inactive" → "Disengaged & Delinquent"), and falls back to listing factor names directly for novel combinations. A named segment can be acted on; a numbered one can't.

- **Weights flow automatically into every scoring run.** `learnedWeights` lives in AppContext computed via `useMemo`, so it recomputes whenever outcomes change. The Upload page's `runScoring` function accepts a `weights` parameter and always receives the current learned weights from context — no manual "recalibrate" button, no stale state. The first time a CS rep marks an account as Churned, the next analysis run already reflects it.

**What was learned:** Adding ML to an existing deterministic system is a backwards-compatibility problem. The new system had to produce the same scores as the old system when there's no outcome data (verified: `computeLearnedWeights` returns `BASE_WEIGHTS` unchanged below the threshold). The normalization step — rescaling learned weights to the same sum as base weights — was the key to making this true. Without it, learned scores would be on a different scale than heuristic scores, breaking the Changes page diff logic which compares scores across runs.

---

## 10. MRR at Risk — What the Number Should Mean

**The design problem:** The first version of "MRR at Risk" summed the full MRR of every account with score ≥50. A portfolio with one Critical account at $10,000/month and nine Low accounts would show $10,000 — accurate only if you're certain all High/Critical accounts will churn.

**The fix:** Weighted formula: `Σ (mrr × score / 100)`. A Critical account at score 90 contributes $9,000. A High account at score 55 contributes $5,500. The KPI card subtitle was changed to "expected loss" to communicate what the number represents.

This same formula is used in the Insights page stat card and the MRR at Risk by Plan bar chart, so the numbers are consistent everywhere in the product.
