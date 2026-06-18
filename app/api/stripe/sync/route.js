import { NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import Stripe from 'stripe';
import { mapStripeCustomers, mapStripeBilling } from '@/src/lib/stripeMapper';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { data: tokenData } = await supabase
    .from('stripe_tokens')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!tokenData) {
    return NextResponse.json({ error: 'Not connected to Stripe. Please reconnect.' }, { status: 401 });
  }

  try {
    const opts = { stripeAccount: tokenData.stripe_account_id };
    const [customersRes, subscriptionsRes, invoicesRes] = await Promise.all([
      stripe.customers.list({ limit: 100 }, opts),
      stripe.subscriptions.list({ limit: 100, status: 'all' }, opts),
      stripe.invoices.list({ limit: 100 }, opts),
    ]);

    const mappedCustomers = mapStripeCustomers(customersRes.data, subscriptionsRes.data);
    const mappedBilling   = mapStripeBilling(customersRes.data, subscriptionsRes.data, invoicesRes.data);

    return NextResponse.json({
      customers: mappedCustomers,
      billing:   mappedBilling,
      meta: { customerCount: mappedCustomers.length, syncedAt: new Date().toISOString(), source: 'stripe' },
    });
  } catch (err) {
    console.error('Stripe sync error:', err.message);
    return NextResponse.json({ error: 'Failed to sync: ' + err.message }, { status: 500 });
  }
}
