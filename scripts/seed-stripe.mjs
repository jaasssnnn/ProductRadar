// ─── ChurnRadar — Stripe test-data seeder ────────────────────────────────────
//
// Fills a Stripe TEST account with fake-but-realistic customers, subscriptions,
// and a failed-renewal scenario, then writes companion activity/support CSVs
// keyed to the real cus_xxx IDs so you can demo the full Stripe → CSV escalation.
//
// USAGE
//   STRIPE_SECRET_KEY=sk_test_... node scripts/seed-stripe.mjs            # seed
//   STRIPE_SECRET_KEY=sk_test_... node scripts/seed-stripe.mjs --cleanup  # tear down
//
// SAFETY
//   Refuses to run unless STRIPE_SECRET_KEY starts with `sk_test_`.
//   Everything it creates is tagged so --cleanup can remove it.
//
// WHAT IT BUILDS (on a single Stripe Test Clock)
//   Atlas Freight   hero/escalator  — renewal payment fails → past_due + failed invoice
//   Beacon Health   healthy control — pays fine, stays Low in both phases
//   Cirrus Retail   mixed           — pays fine; mild activity decline lands it Medium
//
// The activity/support CSV timestamps are relative to TODAY (real time), because
// ChurnRadar scores activity against `new Date()`. The Stripe Test Clock only
// drives the billing simulation; the two timelines are independent by design.
// ─────────────────────────────────────────────────────────────────────────────

import Stripe from 'stripe';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'seed-output');
const CLOCK_NAME = 'churnradar-seed';
const SEED_TAG = 'churnradar-seed';

// ── Load .env file (so you don't need to export the key in your shell) ───────
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const [k, ...rest] = line.trim().split('=');
    if (k && rest.length && !process.env[k]) {
      process.env[k] = rest.join('=').trim();
    }
  }
}

// ── Guard: test key only ─────────────────────────────────────────────────────
const KEY = process.env.STRIPE_SECRET_KEY;
if (!KEY) {
  console.error('✗ STRIPE_SECRET_KEY is not set. Run with: STRIPE_SECRET_KEY=sk_test_... node scripts/seed-stripe.mjs');
  process.exit(1);
}
if (!KEY.startsWith('sk_test_')) {
  console.error('✗ Refusing to run: STRIPE_SECRET_KEY is not a test key (must start with "sk_test_").');
  console.error('  This script creates and deletes data — never point it at a live account.');
  process.exit(1);
}

const stripe = new Stripe(KEY);
const CLEANUP = process.argv.includes('--cleanup');

// ── Account definitions ──────────────────────────────────────────────────────
const ACCOUNTS = [
  { key: 'atlas',  name: 'Atlas Freight', email: 'ops@atlasfreight.example',   amountCents: 49900, role: 'hero/escalator',  failing: true  },
  { key: 'beacon', name: 'Beacon Health', email: 'admin@beaconhealth.example', amountCents: 29900, role: 'healthy control', failing: false },
  { key: 'cirrus', name: 'Cirrus Retail', email: 'it@cirrusretail.example',    amountCents: 39900, role: 'mixed',           failing: false },
];

// Stripe test tokens — safer than raw card numbers, no special API access needed.
// tok_visa always succeeds; tok_chargeCustomerFail attaches OK but fails on charge.
const TOK_GOOD    = 'tok_visa';
const TOK_FAILING = 'tok_chargeCustomerFail';

async function createAndAttachPM(customerId, token) {
  // Create a PM from a test token (fresh copy per customer, scoped to that customer)
  const pm = await stripe.paymentMethods.create({ type: 'card', card: { token } });
  await stripe.paymentMethods.attach(pm.id, { customer: customerId });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: pm.id },
  });
  return pm.id;
}

const nowUnix = () => Math.floor(Date.now() / 1000);
const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString().split('T')[0];
const sleep   = ms => new Promise(r => setTimeout(r, ms));

// ── Cleanup: delete any test clock named churnradar-seed (cascades to customers) ─
async function cleanup() {
  console.log('Cleaning up previous seed data…');
  let deleted = 0;
  for await (const clock of stripe.testHelpers.testClocks.list({ limit: 100 })) {
    if (clock.name === CLOCK_NAME) {
      await stripe.testHelpers.testClocks.del(clock.id);
      console.log(`  deleted test clock ${clock.id} (and its customers)`);
      deleted++;
    }
  }
  console.log(deleted ? `✓ Removed ${deleted} seed clock(s).` : 'Nothing to clean up.');
}

// ── Wait for a clock advance to finish processing ────────────────────────────
async function waitForClock(clockId) {
  for (let i = 0; i < 40; i++) {
    const c = await stripe.testHelpers.testClocks.retrieve(clockId);
    if (c.status === 'ready') return;
    if (c.status === 'internal_failure') throw new Error('Test clock advance failed inside Stripe.');
    await sleep(1500);
  }
  throw new Error('Test clock advance timed out.');
}

async function seed() {
  console.log('Seeding ChurnRadar demo data into Stripe TEST mode…\n');

  // 1. Test clock — anchors every customer to a controllable timeline
  const clock = await stripe.testHelpers.testClocks.create({
    frozen_time: nowUnix(),
    name: CLOCK_NAME,
  });
  console.log('TEST CLOCK:', clock.id);

  // 2. One product, one price per account
  const product = await stripe.products.create({
    name: 'ChurnRadar Demo Plan',
    metadata: { seeded_by: SEED_TAG },
  });

  // 3. Create customers + active subscriptions (all start with a GOOD card)
  const created = [];
  let maxPeriodEnd = 0;
  for (const acct of ACCOUNTS) {
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: acct.amountCents,
      currency: 'usd',
      recurring: { interval: 'month' },
      nickname: `${acct.name} Monthly`,
      metadata: { seeded_by: SEED_TAG },
    });

    const customer = await stripe.customers.create({
      name: acct.name,
      email: acct.email,
      test_clock: clock.id,
      metadata: { seeded_by: SEED_TAG, role: acct.role },
    });

    // Attach a good card first — the initial subscription invoice must succeed.
    await createAndAttachPM(customer.id, TOK_GOOD);

    const sub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      metadata: { seeded_by: SEED_TAG },
    });

    // current_period_end moved to the item in newer API versions — check both.
    const periodEnd =
      sub.current_period_end ??
      sub.items?.data?.[0]?.current_period_end ??
      (nowUnix() + 31 * 86400);
    maxPeriodEnd = Math.max(maxPeriodEnd, periodEnd);

    created.push({ ...acct, customerId: customer.id, subId: sub.id });
  }

  // 4. Swap the hero to a failing card so its NEXT renewal declines.
  //    The initial subscription invoice already succeeded with the good card.
  for (const c of created) {
    if (c.failing) {
      await createAndAttachPM(c.customerId, TOK_FAILING);
    }
  }

  // 5. Advance the clock just past the renewal boundary → triggers billing.
  //    Good cards renew cleanly; the hero's renewal charge fails → past_due.
  console.log('\nAdvancing test clock past renewal to trigger billing…');
  await stripe.testHelpers.testClocks.advance(clock.id, {
    frozen_time: maxPeriodEnd + 2 * 86400,
  });
  await waitForClock(clock.id);

  // 6. Report final state per account
  console.log('\nCREATED:');
  for (const c of created) {
    const sub = await stripe.subscriptions.retrieve(c.subId);
    const invoices = await stripe.invoices.list({ customer: c.customerId, limit: 5 });
    const failed = invoices.data.filter(
      i => i.status === 'uncollectible' || (i.status === 'open' && i.attempt_count > 0)
    ).length;
    console.log(
      `  ${c.customerId}  ${c.name.padEnd(14)} role=${c.role.padEnd(15)} ` +
      `sub=${sub.status.padEnd(9)} failedInvoices=${failed}`
    );
  }

  // 7. Write companion CSVs keyed to the real customer IDs
  writeCompanionCSVs(created);

  console.log('\n✓ Seed complete.');
  console.log('  Demo flow:');
  console.log('   1. /upload → Connect Stripe → Sync  → Atlas Freight appears at LOW (billing only),');
  console.log('      partial-data banner flags missing activity/support.');
  console.log('   2. /upload → drop seed-output/activity.csv + support.csv → Analyze');
  console.log('      → Atlas escalates to CRITICAL, Changes tab lights up the Low→Critical move.');
  console.log('\n  Tear down later with:  node scripts/seed-stripe.mjs --cleanup');
}

function writeCompanionCSVs(created) {
  const id = key => created.find(c => c.key === key).customerId;
  const atlas = id('atlas'), beacon = id('beacon'), cirrus = id('cirrus');

  // activity.csv — timestamps relative to today
  const activity = [
    ['customer_id', 'event_name', 'timestamp', 'count'],
    // Atlas: declining then silent → inactivity + usage_decline + low_adoption (+ renewal via drop)
    [atlas,  'login',       daysAgo(28), 8],
    [atlas,  'feature_use', daysAgo(25), 2],
    [atlas,  'login',       daysAgo(21), 5],
    [atlas,  'login',       daysAgo(18), 3],
    [atlas,  'login',       daysAgo(16), 2],
    // Beacon: recent & growing, healthy adoption → no risk factors
    [beacon, 'login',       daysAgo(20), 6],
    [beacon, 'feature_use', daysAgo(10), 5],
    [beacon, 'login',       daysAgo(5),  9],
    [beacon, 'feature_use', daysAgo(2),  6],
    // Cirrus: mild but recent decline → usage_decline + renewal only
    [cirrus, 'login',       daysAgo(24), 7],
    [cirrus, 'feature_use', daysAgo(20), 4],
    [cirrus, 'login',       daysAgo(12), 5],
    [cirrus, 'login',       daysAgo(6),  3],
  ];

  // support.csv
  const support = [
    ['customer_id', 'ticket_count', 'unresolved_tickets', 'sentiment_tag', 'last_ticket_date'],
    [atlas,  6, 4, 'negative', daysAgo(5)],
    [beacon, 1, 0, 'positive', daysAgo(30)],
    [cirrus, 3, 2, 'neutral',  daysAgo(12)],
  ];

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'activity.csv'), toCSV(activity));
  writeFileSync(join(OUT_DIR, 'support.csv'),  toCSV(support));
  console.log(`\nCSV written: seed-output/activity.csv  (${activity.length - 1} rows)`);
  console.log(`CSV written: seed-output/support.csv   (${support.length - 1} rows)`);
}

function toCSV(rows) {
  return rows
    .map(r => r.map(v => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','))
    .join('\n') + '\n';
}

// ── Entry ────────────────────────────────────────────────────────────────────
(async () => {
  try {
    if (CLEANUP) await cleanup();
    else await seed();
  } catch (err) {
    console.error('\n✗ Error:', err.message);
    process.exit(1);
  }
})();
