import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { mapStripeCustomers, mapStripeBilling } from '@/src/lib/stripeMapper';

// Direct sync — uses your own Stripe account's secret key, no Connect OAuth needed.
// This is the right path when you own the Stripe account (demo, self-hosted).
// For multi-tenant (other businesses connecting their accounts), use the OAuth flow.

export async function GET() {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY is not configured in your .env file.' }, { status: 500 });
    }

    const stripe = new Stripe(key);

    const account = await stripe.account.retrieve();
    console.log('[direct-sync] account:', account.id);

    // Stripe excludes test-clock customers from the default list — fetch them separately.
    const regularPage = await stripe.customers.list({ limit: 100 });
    const customers   = [...regularPage.data];

    if (key.startsWith('sk_test_')) {
      const clocksPage = await stripe.testHelpers.testClocks.list({ limit: 20 });
      for (const clock of clocksPage.data) {
        const clockCustomers = await stripe.customers.list({ test_clock: clock.id, limit: 100 });
        customers.push(...clockCustomers.data);
      }
    }

    const subscriptions = [], invoices = [];
    for (const customer of customers) {
      const subsPage = await stripe.subscriptions.list({ customer: customer.id, limit: 100, status: 'all' });
      subscriptions.push(...subsPage.data);
      const invPage  = await stripe.invoices.list({ customer: customer.id, limit: 100 });
      invoices.push(...invPage.data);
    }

    console.log('[direct-sync] customers:', customers.length, customers.map(c => c.id));
    console.log('[direct-sync] subscriptions:', subscriptions.length, subscriptions.map(s => `${s.id}:${s.status}`));

    const mappedCustomers = mapStripeCustomers(customers, subscriptions);
    const mappedBilling   = mapStripeBilling(customers, subscriptions, invoices);

    console.log('[direct-sync] mapped:', mappedCustomers.length, mappedCustomers.map(c => `${c.account_name}:${c.mrr}`));

    return NextResponse.json({
      customers: mappedCustomers,
      billing:   mappedBilling,
      meta: {
        customerCount: mappedCustomers.length,
        syncedAt:      new Date().toISOString(),
        source:        'stripe-direct',
      },
    });
  } catch (err) {
    console.error('Direct Stripe sync error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
