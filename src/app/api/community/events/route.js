import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getUserClient();
    const { data: events } = await supabase
      .from('community_events')
      .select('*')
      .gt('event_at', new Date().toISOString())
      .order('event_at', { ascending: true })
      .limit(8);

    let watchedIds = new Set();
    if (user) {
      const { data: watches } = await supabase
        .from('user_event_watches')
        .select('event_id')
        .eq('user_id', user.id);
      watchedIds = new Set((watches || []).map((w) => w.event_id));
    }

    return NextResponse.json({
      events: (events || []).map((e) => ({
        id: e.id,
        label: e.label,
        event_at: e.event_at,
        category: e.category,
        heat: e.heat,
        watching_count: e.watching_count,
        ticker: e.ticker,
        is_watched: watchedIds.has(e.id),
      })),
    });
  } catch {
    return NextResponse.json({ events: [] });
  }
}

export const POST = withApiGuard(
  async (request, user) => {
    try {
      const supabase = getUserClient();
      const body = await request.json().catch(() => null);
      const eventId = body?.eventId || body?.event_id;
      const action =
        body?.action || (body?.watch === true ? 'watch' : body?.watch === false ? 'unwatch' : null);

      if (!eventId || !['watch', 'unwatch'].includes(action)) {
        return NextResponse.json({ error: 'Invalid' }, { status: 400 });
      }

      if (action === 'watch') {
        await supabase.from('user_event_watches').upsert({ user_id: user.id, event_id: eventId });
      } else {
        await supabase
          .from('user_event_watches')
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', eventId);
      }

      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
