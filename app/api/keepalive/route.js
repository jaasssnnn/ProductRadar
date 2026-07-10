import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Pinged daily by Vercel Cron (see vercel.json) so the Supabase free-tier
// project registers database activity and never hits the 7-day auto-pause.
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { error } = await supabase
      .from('account_states')
      .select('customer_id')
      .limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
