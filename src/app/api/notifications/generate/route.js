import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { classifyEvent } from '@/lib/notifications/event-classifier';
import { scoreEventForUser } from '@/lib/notifications/matching-engine';
import { buildUserProfile } from '@/lib/notifications/interest-profile';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const runtime = 'nodejs';

// Read the FMP key at request time — module-level captures freeze the
// build-container value and never see post-deploy env updates.
function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

const FMP_BASE = 'https://financialmodelingprep.com/stable';

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const FMP_KEY = getFmpKey();
  if (!FMP_KEY) {
    return NextResponse.json({ ok: false, error: 'FMP_API_KEY not configured' }, { status: 500 });
  }

  /* Service-role client — cron-driven, no user-scoped RLS needed.
     Initialized inside the handler so the route still cold-starts when the
     SUPABASE_SERVICE_ROLE_KEY is misconfigured (it surfaces as a 500 here
     instead of crashing at module load). */
  const admin = getAdminClient();

  try {
    const newsRes = await fetch(
      `${FMP_BASE}/news/stock-latest?page=0&limit=20&apikey=${encodeURIComponent(FMP_KEY)}`,
      { cache: 'no-store' },
    );
    const news = newsRes.ok ? await newsRes.json() : [];
    const events = (Array.isArray(news) ? news : []).filter((n) => n?.title);

    if (events.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, reason: 'no_events' });
    }

    const classified = events.map((e) => ({
      ...classifyEvent({
        headline: e.title,
        summary: (e.text || e.description || '').slice(0, 300),
      }),
      originalEvent: e,
    }));

    const significant = classified.filter((c) => c.severity !== 'routine');
    if (significant.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, reason: 'no_significant_events' });
    }

    let { data: profiles } = await admin
      .from('user_interest_profiles')
      .select(
        'user_id, ticker_scores, sector_scores, feature_scores, topic_scores, risk_score, risk_category, notification_prefs',
      )
      .limit(500);

    if (!profiles?.length) {
      const { data: profileRows } = await admin.from('profiles').select('id').limit(100);
      for (const row of profileRows || []) {
        try {
          await buildUserProfile(row.id);
        } catch (e) {
          console.warn('[notification-generator] buildUserProfile', row.id, e);
        }
      }
      const again = await admin
        .from('user_interest_profiles')
        .select(
          'user_id, ticker_scores, sector_scores, feature_scores, topic_scores, risk_score, risk_category, notification_prefs',
        )
        .limit(500);
      profiles = again.data;
    }

    if (!profiles?.length) {
      return NextResponse.json({ ok: true, sent: 0, reason: 'no_profiles' });
    }

    let totalSent = 0;

    for (const event of significant.slice(0, 5)) {
      for (const profile of profiles) {
        const { score, shouldNotify } = scoreEventForUser(event, profile);

        if (!shouldNotify) continue;

        const { data: existing } = await admin
          .from('notification_delivery_log')
          .select('id')
          .eq('user_id', profile.user_id)
          .eq('event_fingerprint', event.fingerprint)
          .maybeSingle();

        if (existing) continue;

        const e = event.originalEvent;
        const symbol = (e.symbol && String(e.symbol).toUpperCase()) || event.tickers[0] || '';
        const severityEmoji = event.severity === 'critical' ? '🔴' : '🟡';
        const sentimentEmoji =
          event.sentiment === 'bullish' ? '📈' : event.sentiment === 'bearish' ? '📉' : '📊';

        const titleLabel =
          event.eventType === 'earnings'
            ? 'Earnings Alert'
            : event.eventType === 'macro'
              ? 'Macro Event'
              : event.eventType === 'geopolitical'
                ? 'Geopolitical Alert'
                : 'Market Signal';
        const title = `${severityEmoji} ${titleLabel}`;
        const linkPath = symbol
          ? `/company-research?q=${encodeURIComponent(symbol)}`
          : '/market-analysis';
        const content = `${sentimentEmoji} ${String(e.title).slice(0, 120)}${symbol ? ` ($${symbol})` : ''}\n↳ ${linkPath}`;

        const notifType =
          event.eventType === 'earnings'
            ? 'portfolio_alerts'
            : event.eventType === 'macro'
              ? 'market_news'
              : event.eventType === 'regulatory'
                ? 'inside-the-capitol'
                : 'market_news';

        const { error: insErr } = await admin.from('user_notifications').insert({
          user_id: profile.user_id,
          type: notifType,
          title,
          content,
          read: false,
        });

        if (insErr) {
          console.error('[notification-generator] insert', insErr);
          continue;
        }

        const { error: logErr } = await admin.from('notification_delivery_log').insert({
          user_id: profile.user_id,
          event_fingerprint: event.fingerprint,
        });
        if (logErr && !String(logErr.message || '').includes('duplicate')) {
          console.warn('[notification-generator] delivery log', logErr);
        }

        totalSent += 1;
      }
    }

    return NextResponse.json({ ok: true, sent: totalSent, events_processed: significant.length });
  } catch (err) {
    console.error('[notification-generator]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
