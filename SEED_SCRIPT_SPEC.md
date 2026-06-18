# Seed Script + Demo Enablement Spec

## Goal

Produce an end-to-end, honest demo:

1. **Integrity moment (Phase A):** connect Stripe → sync → the hero account appears at a **low band with only the billing factor firing**, and the partial-data banner honestly flags that activity & support signals are missing.
2. **Wow moment (Phase B):** upload the companion activity + support CSVs (pre-keyed to the same Stripe customer IDs) → the **same account escalates to Critical** as the full factor stack assembles → the "Changed this week" view lights up the escalation and the sidebar badge increments.

This demonstrates three things in ~90 seconds: the live integration works, the app is honest about data limits, and the multi-source merge does what it claims.

---

## ⚠️ Three coordinated pieces — the seed script is only one

The seed script alone will NOT make this demo work. Two app-code prerequisites must land first.

### Prerequisite 1 — Scoring engine must not penalize absent data sources

**Problem (verified):** with no activity data, `scoreAccount` computes `daysSinceActivity = 999`, firing `inactivity (+25)`, and `totalFeatureCount = 0`, firing `low_adoption (+10)`. A Stripe-only account scores **50 = High**, and the confidence banner ("inactivity cannot be scored") becomes a lie.

**Fix:** pass an explicit `dataPresence` flag so factors only fire when their data source is actually loaded.

```js
// scoring.js
export function scoreAccount(customer, activityRows, billingRow, supportRow, dataPresence) {
  const present = dataPresence || {
    activity: Array.isArray(activityRows) && activityRows.length > 0,
    billing:  !!billingRow,
    support:  !!supportRow,
  };
  // Inactivity (+25): only if activity source present
  if (present.activity && daysSinceActivity >= 14) { ... }
  // Usage decline (+20): only if activity present  (already gated by w1+w2>0, but make explicit)
  if (present.activity && isTrendDeclining) { ... }
  // Low adoption (+10): only if activity present
  if (present.activity && totalFeatureCount < 3) { ... }
  // Support (+15): only if support present  (already guarded by `if (supportRow)`)
  // Billing (+15): unchanged, guarded by `if (billingRow)`
  // Renewal (+10): naturally gated — needs usageDropPercent ≥ 20, which is 0 without activity
}
```

**Callers must pass `dataPresence` from `loadedDataTypes`:**
- All-CSV path (`handleAnalyze`): all four present → identical to today's behavior.
- Stripe-only sync: `{ activity:false, billing:true, support:false }`.
- Stripe + CSV merge: `{ activity:true, billing:true, support:true }`.

**Product decision required (see chat):** treat absent activity as "unknown → skip" (recommended, honest, matches the banner) vs. "signal → fire inactivity" (current). This spec assumes **skip**.

**Resulting Phase A score for the hero:** billing only = **15 = Low**. (Low→Critical is a more dramatic, still-honest escalation than Medium→High.)

### Prerequisite 2 — Merge path: re-score when CSVs are added on top of an existing Stripe sync

**Problem:** `handleStripeSyncComplete` reads activity/support from files already uploaded *at sync time*. There is no path to upload CSVs *after* a Stripe sync and re-score — which is exactly the Phase A → Phase B order.

**Fix:** on the upload page, when a Stripe sync is already active, uploading CSVs should merge into the existing Stripe-derived `customers`/`billing`, re-score with `dataPresence` all-true, and call `setScoredAccounts` (which snapshots the Phase A run so the "Changed this week" diff fires). Keep customer-id join keyed on `cus_xxx`.

---

## The seed script (`scripts/seed-stripe.mjs`)

Built for **B** (superset of A). Run against a **Stripe test-mode** account only.

### Safety guards
- Read `STRIPE_SECRET_KEY` from env. **Abort unless it starts with `sk_test_`.**
- `--cleanup` flag: delete the test clock + all customers it created, then exit.

### What it creates (via a Stripe Test Clock)

Create one test clock at "now", attach all customers to it, create subscriptions, then advance the clock to force renewal-time billing behavior.

| Account | Stripe setup | Phase A (Stripe only) | Phase B (after CSV) |
|---------|-------------|----------------------|---------------------|
| **Atlas Freight** (hero) | Past-due sub, failing test card (`4000 0000 0000 0341`), renewal ~18 days out | billing → **Low (15)** | + inactivity, usage-decline, renewal, low-adoption, support → **Critical (~80)** |
| **Beacon Health** (healthy control) | Paid sub, card OK, renewal far out | clean → **Low (0)** | healthy activity/positive support → stays **Low** |
| **Cirrus Retail** (mixed) | Paid now, 1 prior failed payment | billing → **Low (15)** | moderate decline → **Medium/High** |

### Test-clock mechanics for the hero's failed payment
1. `stripe.testHelpers.testClocks.create({ frozen_time: now })`
2. Create customer on the clock with a payment method that fails on renewal (`pm` from test card `4000000000000341` — succeeds on attach, fails on subsequent charge).
3. Create the subscription (monthly) with `current_period_end ≈ now + 18 days`.
4. `testClocks.advance({ frozen_time: now + 19 days })` → Stripe issues the renewal invoice → charge fails → subscription → `past_due`, invoice `open` with `attempt_count > 0`.
5. The mapper reads that as `invoice_status: 'failed'`, `failed_payments: '1'` → billing factor fires. ✅

### Console output (required)
As it runs, print a mapping table so the CSV↔Stripe join can be debugged by hand if it ever drifts:
```
TEST CLOCK: clock_xxx
CREATED:
  cus_OaLb...  Atlas Freight    role=hero/escalator   → billing failed, renewal +18d
  cus_Pm3c...  Beacon Health    role=healthy control
  cus_Qz9d...  Cirrus Retail    role=mixed
CSV written: ./seed-output/activity.csv  (12 rows, keyed to cus_ ids above)
CSV written: ./seed-output/support.csv   (3 rows)
```

### Companion CSV emission (the ID-matched part)

Write to `./seed-output/`, with `customer_id` columns set to the **actual created `cus_xxx` IDs** (not placeholders).

**`activity.csv`** — columns `customer_id,event_name,timestamp,count`. For Atlas Freight, emit a declining-then-silent pattern so all activity factors fire (timestamps relative to run time):

| days ago | event | count | purpose |
|----------|-------|-------|---------|
| 28 | login | 8 | week 1 (high) |
| 25 | feature_use | 2 | week 1 — only 2 feature_use total → low adoption |
| 21 | login | 5 | week 2 |
| 18 | login | 3 | week 2 |
| 16 | login | 2 | week 2 — last activity 16d ago → inactivity fires |
| _(nothing in the last 14 days)_ | | | weeks 3–4 empty → declining slope + 100% usage drop |

Verified result: slope ≈ −0.8 (declining ✓), usageDrop = 100% (≥20 → renewal ✓), last activity 16d (≥14 → inactivity ✓), feature_use = 2 (<3 → low adoption ✓).
Beacon Health gets a flat/growing recent pattern; Cirrus a mild decline.

**`support.csv`** — columns `customer_id,ticket_count,unresolved_tickets,sentiment_tag,last_ticket_date`. Atlas: `6,4,negative,<recent>` → support factor fires. Beacon: `1,0,positive`. Cirrus: `3,2,neutral`.

### How to run
```bash
STRIPE_SECRET_KEY=sk_test_... node scripts/seed-stripe.mjs          # seed
STRIPE_SECRET_KEY=sk_test_... node scripts/seed-stripe.mjs --cleanup # tear down
```

---

## Demo runbook (after all three pieces land)
1. `npm run dev`, open `/upload`.
2. **Connect Stripe** → **Sync** → dashboard shows Atlas Freight at **Low**, billing factor visible, **partial-data banner** flags missing activity/support. ← integrity moment
3. Back to `/upload`, drop `seed-output/activity.csv` + `support.csv`, Analyze.
4. Atlas Freight escalates to **Critical**; **Changes** tab shows the Low→Critical escalation; sidebar badge increments. ← wow moment

---

## Sequence note
Do the deauthorization webhook (`account.application.deauthorized`) AFTER this works — it's correctness polish; the seed data is what makes the product demonstrable.
