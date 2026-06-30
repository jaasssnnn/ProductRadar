import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/src/lib/supabase/server';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) return NextResponse.redirect(`${BASE_URL}/upload?stripe=denied`);

  // Validate CSRF state
  const cookieStore = await cookies();
  const savedState  = cookieStore.get('productradar_oauth_state')?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${BASE_URL}/upload?stripe=error&reason=state_mismatch`);
  }

  try {
    const tokenRes = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, client_secret: STRIPE_SECRET_KEY }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    // Get the authenticated user from Supabase session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(`${BASE_URL}/login`);

    // Store token in Supabase keyed to the user's ID
    await supabase.from('stripe_tokens').upsert(
      {
        user_id:           user.id,
        access_token:      tokenData.access_token,
        stripe_account_id: tokenData.stripe_user_id,
        scope:             tokenData.scope,
        connected_at:      new Date().toISOString(),
        updated_at:        new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    cookieStore.delete('productradar_oauth_state');
    return NextResponse.redirect(`${BASE_URL}/upload?stripe=connected`);
  } catch (err) {
    console.error('Stripe OAuth callback error:', err.message);
    return NextResponse.redirect(`${BASE_URL}/upload?stripe=error`);
  }
}
