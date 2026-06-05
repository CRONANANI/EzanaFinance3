import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const POST = withApiGuard(
  async (request) => {
    const body = await request.json();
    const { email, step, topics = [] } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const normalized = email.toLowerCase();

    if (step === 'email') {
      const { error } = await supabase.from('newsletter_subscribers').upsert(
        {
          email: normalized,
          created_at: new Date().toISOString(),
          topics: [],
          confirmed: false,
        },
        { onConflict: 'email' },
      );
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else if (step === 'topics') {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .update({ topics, confirmed: true, updated_at: new Date().toISOString() })
        .eq('email', normalized);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  },
  { requireAuth: false, strict: true },
);
