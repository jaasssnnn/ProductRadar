import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// TODO: Set STRIPE_CONNECT_CLIENT_ID in your Vercel environment variables.
// Get it from: Stripe Dashboard → Settings → Connect → Get started (or your existing Connect app)
// Format: ca_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
const CLIENT_ID = process.env.STRIPE_CONNECT_CLIENT_ID;

// TODO: Set NEXT_PUBLIC_BASE_URL in your Vercel environment variables.
// Example: https://productradar.vercel.app (no trailing slash)
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function GET() {
  if (!CLIENT_ID) {
    return NextResponse.json(
      { error: 'STRIPE_CONNECT_CLIENT_ID is not configured. See .env.example.' },
      { status: 500 }
    );
  }

  // Generate a cryptographically random state parameter for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');

  const cookieStore = await cookies();
  cookieStore.set('productradar_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 minutes — enough time to complete OAuth
    path: '/',
    sameSite: 'lax',
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: 'read_only',
    state,
    redirect_uri: `${BASE_URL}/api/stripe/callback`,
  });

  return NextResponse.json({ url: `https://connect.stripe.com/oauth/authorize?${params}` });
}
