import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { classifyEvent } from '@/lib/notifications/event-classifier';
import { scoreEventForUser } from '@/lib/notifications/matching-engine';
import { buildUserProfile } from '@/lib/notifications/interest-profile';
import { PERSONA_NOTIFICATION_CAPS } from '@/lib/ml/persona-assignment';
import { insertNotificationAndPush } from '@/lib/push/fanout';
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import {
  claimDeliveries,
  releaseDelivery,
  mapLimit,
  pairKey,
} from '@/lib/notifications/delivery-claim';

export const dynamic = 'force-dynamic';
/* 500 profiles x 5 events plus one quote per distinct ticker (5 at a time):
   30 s was not enough (reliability audit P2-14). */
export const maxDuration = 300;
export const runtime = 'nodejs';

// Read the FMP key at request time — module-level captures freeze the
// build-container value and never see post-deploy env updates.
function getFmpKey() {
  return process.env.FMP_API_KEY || '';
}

const FMP_BASE = 'https://financialmodelingprep.com/stable';

async function run() {
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
    const newsRes = await fetchWithTimeout(
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
        'user_id, ticker_scores, sector_scores, industry_scores, entity_scores, geo_scores, theme_scores, asset_class_scores, feature_scores, topic_scores, risk_score, risk_category, notification_prefs, personalization_enabled',
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
          'user_id, ticker_scores, sector_scores, industry_scores, entity_scores, geo_scores, theme_scores, asset_class_scores, feature_scores, topic_scores, risk_score, risk_category, notification_prefs, personalization_enabled',
        )
        .limit(500);
      profiles = again.data;
    }

    if (!profiles?.length) {
      return NextResponse.json({ ok: true, sent: 0, reason: 'no_profiles' });
    }

    const userIds = profiles.map((p) => p.user_id);
    const segmentMap = {};
    const { data: segmentRows } = await admin
      .from('user_segments')
      .select('user_id, persona')
      .in('user_id', userIds);
    for (const s of segmentRows || []) {
      segmentMap[s.user_id] = s;
    }

    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayStartIso = dayStart.toISOString();
    const { data: todaysRows } = await admin
      .from('user_notifications')
      .select('user_id')
      .gte('created_at', dayStartIso)
      .in('user_id', userIds);
    const dayCounts = {};
    for (const r of todaysRows || []) {
      dayCounts[r.user_id] = (dayCounts[r.user_id] || 0) + 1;
    }

    let totalSent = 0;

    const capOf = (uid) =>
      PERSONA_NOTIFICATION_CAPS[segmentMap[uid]?.persona || 'casual_tracker'] ?? 8;

    for (const event of significant.slice(0, 5)) {
      const candidates = profiles.filter((profile) => {
        const { shouldNotify } = scoreEventForUser(
          event,
          profile,
          segmentMap[profile.user_id] || null,
        );
        return shouldNotify && (dayCounts[profile.user_id] || 0) < capOf(profile.user_id);
      });
      if (!candidates.length) continue;

      /* One batched claim per event instead of one lookup per user. */
      // eslint-disable-next-line no-await-in-loop
      const claimed = await claimDeliveries(
        admin,
        candidates.map((p) => ({ user_id: p.user_id, event_fingerprint: event.fingerprint })),
      );

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

      const recipients = candidates.filter((p) =>
        claimed.has(pairKey(p.user_id, event.fingerprint)),
      );
      // eslint-disable-next-line no-await-in-loop
      await mapLimit(recipients, 5, async (profile) => {
        const { error: insErr } = await insertNotificationAndPush(admin, {
          user_id: profile.user_id,
          type: notifType,
          title,
          content,
          read: false,
        });
        if (insErr) {
          console.error('[notification-generator] insert', insErr);
          await releaseDelivery(admin, profile.user_id, event.fingerprint);
          return;
        }
        dayCounts[profile.user_id] = (dayCounts[profile.user_id] || 0) + 1;
        totalSent += 1;
      });
    }

    // ── Portfolio movers: significant same-day moves on tracked holdings ──
    /* Quotes are fetched ONCE for the union of tracked tickers, 5 at a
       time, rather than 20 per user. */
    try {
      const tickersOf = (profile) =>
        Object.keys(profile.ticker_scores || {})
          .slice(0, 20)
          .map((x) => String(x).replace(/-/g, '').toUpperCase());
      const watchers = profiles.filter(
        (p) => (p.notification_prefs || {}).portfolio_alerts !== false,
      );
      const universe = [...new Set(watchers.flatMap(tickersOf))].slice(0, 300);
      const quoteList = await mapLimit(universe, 5, async (sym) => {
        try {
          const quoteRes = await fetchWithTimeout(
            `${FMP_BASE}/quote?symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(FMP_KEY)}`,
            { cache: 'no-store' },
          );
          if (!quoteRes.ok) return null;
          const data = await quoteRes.json();
          const q = Array.isArray(data) ? data[0] : data;
          return q && typeof q === 'object' ? q : null;
        } catch {
          return null;
        }
      });
      const movers = new Map();
      for (const q of quoteList) {
        if (!q) continue;
        const changePct = Number(q.changesPercentage);
        if (Number.isFinite(changePct) && Math.abs(changePct) >= 5) {
          movers.set(String(q.symbol || '').toUpperCase(), q);
        }
      }

      const today = new Date().toISOString().slice(0, 10);
      const pairs = [];
      for (const profile of watchers) {
        for (const sym of tickersOf(profile)) {
          if (movers.has(sym)) {
            pairs.push({
              user_id: profile.user_id,
              event_fingerprint: `portfolio-mover-${sym}-${today}`,
              sym,
            });
          }
        }
      }
      const claimed = pairs.length ? await claimDeliveries(admin, pairs) : new Set();

      for (const pr of pairs) {
        if (!claimed.has(pairKey(pr.user_id, pr.event_fingerprint))) continue;
        if ((dayCounts[pr.user_id] || 0) >= capOf(pr.user_id)) {
          // eslint-disable-next-line no-await-in-loop
          await releaseDelivery(admin, pr.user_id, pr.event_fingerprint);
          continue;
        }
        const q = movers.get(pr.sym);
        const changePct = Number(q.changesPercentage);
        const direction = changePct >= 0 ? '📈 up' : '📉 down';
        const priceNum = Number(q.price || 0);
        // eslint-disable-next-line no-await-in-loop
        const { error: insPortErr } = await insertNotificationAndPush(admin, {
          user_id: pr.user_id,
          type: 'portfolio_alerts',
          title: `${pr.sym} ${direction} ${Math.abs(changePct).toFixed(1)}%`,
          content: `Your holding ${pr.sym} moved significantly. Price: $${Number.isFinite(priceNum) ? priceNum.toFixed(2) : '—'}.`,
        });
        if (insPortErr) {
          // eslint-disable-next-line no-await-in-loop
          await releaseDelivery(admin, pr.user_id, pr.event_fingerprint);
          continue;
        }
        dayCounts[pr.user_id] = (dayCounts[pr.user_id] || 0) + 1;
        totalSent += 1;
      }
    } catch (portfolioErr) {
      console.error('[notification-generator] portfolio movers:', portfolioErr);
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

export const GET = cronRoute('notifications-generate', run, { ttlSeconds: 360 });
