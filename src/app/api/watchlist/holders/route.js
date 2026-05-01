import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/watchlist/holders?ticker=AAPL&limit=10
 */
export async function GET(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const limit = Math.min(20, parseInt(searchParams.get('limit') || '10', 10));

    if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });

    const { data: demoPositions } = await supabaseAdmin
      .from('demo_investor_positions')
      .select('user_id, shares, avg_cost, portfolio_pct, days_held, note')
      .eq('ticker', ticker.toUpperCase());

    const demoUserIds = (demoPositions || []).map((p) => p.user_id);
    let demoProfiles = [];
    if (demoUserIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id, username, full_name, is_partner')
        .in('id', demoUserIds);
      demoProfiles = data || [];
    }

    const demoHolders = (demoPositions || [])
      .map((pos) => {
        const profile = demoProfiles.find((p) => p.id === pos.user_id);
        if (!profile) return null;
        const name = profile.full_name || profile.username || 'Unknown';
        const initials = name
          .split(' ')
          .map((p) => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        return {
          userId: pos.user_id,
          initials,
          name,
          partner: Boolean(profile.is_partner),
          shares: Number(pos.shares),
          avgCost: Number(pos.avg_cost),
          portfolioPct: Number(pos.portfolio_pct),
          daysHeld: Number(pos.days_held),
          note: pos.note || null,
          source: 'demo',
        };
      })
      .filter(Boolean);

    let realHolders = [];
    try {
      const { data: realPositions } = await supabaseAdmin
        .from('positions')
        .select('user_id, quantity, avg_cost')
        .eq('symbol', ticker.toUpperCase())
        .gt('quantity', 0)
        .limit(limit);

      const realUserIds = (realPositions || []).map((p) => p.user_id);
      if (realUserIds.length > 0) {
        const { data: profilesData } = await supabaseAdmin
          .from('profiles')
          .select('id, username, full_name, is_partner, is_demo')
          .in('id', realUserIds)
          .eq('is_demo', false);

        realHolders = (realPositions || [])
          .map((pos) => {
            const profile = profilesData?.find((p) => p.id === pos.user_id);
            if (!profile) return null;
            const name = profile.full_name || profile.username || 'User';
            const initials = name
              .split(' ')
              .map((p) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            return {
              userId: pos.user_id,
              initials,
              name,
              partner: Boolean(profile.is_partner),
              shares: Number(pos.quantity),
              avgCost: Number(pos.avg_cost),
              portfolioPct: 0,
              daysHeld: 0,
              note: null,
              source: 'real',
            };
          })
          .filter(Boolean);
      }
    } catch (e) {
      console.warn('[holders] real positions query failed:', e.message);
    }

    if (realHolders.length > 0) {
      try {
        const realUserIdsForNotes = realHolders.map((h) => h.userId);
        const { data: realNotes } = await supabaseAdmin
          .from('profile_trade_notes')
          .select('user_id, body')
          .eq('ticker', ticker.toUpperCase())
          .eq('is_public', true)
          .in('user_id', realUserIdsForNotes);

        if (realNotes) {
          const notesMap = new Map(realNotes.map((n) => [n.user_id, n.body]));
          realHolders.forEach((h) => {
            if (notesMap.has(h.userId)) h.note = notesMap.get(h.userId);
          });
        }
      } catch (e) {
        console.warn('[holders] trade notes query failed:', e.message);
      }
    }

    const all = [...realHolders, ...demoHolders];
    const seen = new Set();
    const merged = all.filter((h) => {
      if (seen.has(h.userId)) return false;
      seen.add(h.userId);
      return true;
    });

    merged.sort((a, b) => {
      if (a.partner !== b.partner) return b.partner ? 1 : -1;
      return b.shares - a.shares;
    });

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      holders: merged.slice(0, limit),
      counts: {
        total: merged.length,
        partners: merged.filter((h) => h.partner).length,
        demo: demoHolders.length,
        real: realHolders.length,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
