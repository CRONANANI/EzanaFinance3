import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUS_ORDER = { monitoring: 0, developing: 1, realized: 2, resolved: 3 };

/**
 * GET /api/kairos/events?status=&region=
 */
export async function GET(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const region = searchParams.get('region');

    let q = supabase
      .from('kairos_geopolitical_events')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (status && ['monitoring', 'developing', 'realized', 'resolved'].includes(status)) {
      q = q.eq('status', status);
    }
    if (region) {
      q = q.contains('affected_regions', [region]);
    }

    const { data: events, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const list = events || [];
    list.sort((a, b) => {
      const sa = STATUS_ORDER[a.status] ?? 99;
      const sb = STATUS_ORDER[b.status] ?? 99;
      if (sa !== sb) return sa - sb;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return NextResponse.json({ events: list });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
