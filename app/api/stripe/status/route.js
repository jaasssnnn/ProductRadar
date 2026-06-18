import { NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false });

  const { data: tokenData } = await supabase
    .from('stripe_tokens')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!tokenData) return NextResponse.json({ connected: false });

  try {
    const account = await stripe.accounts.retrieve(tokenData.stripe_account_id);
    return NextResponse.json({
      connected:   true,
      accountId:   tokenData.stripe_account_id,
      accountName: account.settings?.dashboard?.display_name
                   || account.business_profile?.name
                   || tokenData.stripe_account_id,
      connectedAt: tokenData.connected_at,
    });
  } catch {
    return NextResponse.json({ connected: false, expired: true });
  }
}
