# For Later — Seed Demo Data into Stripe

## What this does

Populates your new Stripe TEST account with 3 realistic demo customers:
- **Atlas Freight** — hero/escalator: renewal payment fails → past_due + failed invoice
- **Beacon Health** — healthy control: pays fine, stays Low risk
- **Cirrus Retail** — mixed: pays fine but mild activity decline lands it Medium

Also writes companion `seed-output/activity.csv` and `seed-output/support.csv` files
keyed to the real Stripe customer IDs so you can demo the full Stripe → CSV escalation flow.

---

## How to run

```bash
cd /Users/jasonabhishek/Desktop/VS/Churnrader/productradar
node scripts/seed-stripe.mjs
```

Make sure your `.env` has a valid `STRIPE_SECRET_KEY=sk_test_...` before running.

---

## After seeding

1. Go to the live app and sync Stripe — the 3 customers appear at baseline risk
2. Upload `seed-output/activity.csv` and `seed-output/support.csv`
3. Atlas Freight escalates to Critical, others settle at their respective levels

---

## To tear down / clean up

```bash
node scripts/seed-stripe.mjs --cleanup
```

Deletes the test clock and all associated customers from Stripe.

---

## Why Stripe test clocks?

The seed script uses a Stripe Test Clock to simulate time advancement for renewal scenarios.
Test-clock customers are excluded from standard Stripe list endpoints (`stripe.customers.list()`
returns empty). The direct-sync route handles this with a two-pass fetch — see
`app/api/stripe/direct-sync/route.js`.
