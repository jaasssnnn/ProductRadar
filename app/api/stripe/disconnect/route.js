import { NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: true });

  await supabase.from('stripe_tokens').delete().eq('user_id', user.id);
  return NextResponse.json({ success: true });
}
