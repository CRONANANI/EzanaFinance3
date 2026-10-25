import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
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
export const maxDuration = 120;
export const runtime = 'nodejs';

function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

const FMP_BASE = 'https://financialmodelingprep.com/stable';

async function fetchChamberTrades(chamber, FMP_KEY) {
  const endpoint = chamber === 'senate' ? 'senate-trades' : 'house-trades';
  try {
    const url = `${FMP_BASE}/${endpoint}?page=0&apikey=${encodeURIComponent(FMP_KEY)}`;
    const res = await fetchWithTimeout(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error(`[capitol-notifs] ${endpoint}:`, e);
    return [];
  }
}

function tradeRepresentative(trade) {
  if (trade.firstName || trade.lastName) {
    return `${trade.firstName || ''} ${trade.lastName || ''}`.trim();
  }
  return trade.representative || trade.senator || 'A Congress member';
}

async function run() {
  const FMP_KEY = getFmpKey();
  const admin = getAdminClient();
  let totalSent = 0;

  try {
    const congressTrades = [];
    if (FMP_KEY) {
      const [senate, house] = await Promise.all([
        fetchChamberTrades('senate', FMP_KEY),
        fetchChamberTrades('house', FMP_KEY),
      ]);
      congressTrades.push(...senate.slice(0, 10), ...house.slice(0, 10));
    }

    congressTrades.sort((a, b) => {
      const tb = new Date(b.disclosureDate || b.transactionDate || 0).getTime();
      const ta = new Date(a.disclosureDate || a.transactionDate || 0).getTime();
      return tb - ta;
    });

    const { data: profiles } = await admin
      .from('user_interest_profiles')
      .select('user_id, notification_prefs, ticker_scores')
      .limit(500);

    if (!profiles?.length) {
      return NextResponse.json({ ok: true, sent: 0, reason: 'no_profiles' });
    }

    const subscribedUsers = profiles.filter((p) => {
      const prefs = p.notification_prefs || {};
      return prefs.congressional_trades !== false;
    });

    const tradesForNotifs = congressTrades.slice(0, 5);

    for (const trade of tradesForNotifs) {
      const symbol = (trade.symbol || trade.ticker || '').toUpperCase();
      const representative = tradeRepresentative(trade);
      const tradeTypeRaw = String(trade.type || trade.transactionType || 'Trade').toLowerCase();
      const emoji = tradeTypeRaw.includes('purchase') || tradeTypeRaw.includes('buy') ? '🟢' : '🔴';
      const fpBase = `${trade.transactionDate || trade.disclosureDate || ''}-${symbol}-${representative}`;
      const fingerprint = `capitol-${fpBase}`.slice(0, 450);

      const relevant = subscribedUsers.filter((profile) => {
        const userTickers = profile.ticker_scores || {};
        return !!(symbol && userTickers[symbol]) || congressTrades.length <= 3;
      });
      if (!relevant.length) continue;

      /* One batched claim per trade instead of one lookup per user. */
      // eslint-disable-next-line no-await-in-loop
      const claimed = await claimDeliveries(
        admin,
        relevant.map((p) => ({ user_id: p.user_id, event_fingerprint: fingerprint })),
      );
      const typeLabel = trade.type || trade.transactionType || 'Trade';
      const recipients = relevant.filter((p) => claimed.has(pairKey(p.user_id, fingerprint)));
      // eslint-disable-next-line no-await-in-loop
      await mapLimit(recipients, 5, async (profile) => {
        const { error: insErr } = await insertNotificationAndPush(admin, {
          user_id: profile.user_id,
          type: 'inside-the-capitol',
          title: `${emoji} ${representative} · ${typeLabel}${symbol ? ` ($${symbol})` : ''}`,
          content: `Congressional trade disclosure${symbol ? ` for $${symbol}` : ''}. Check Inside the Capitol for details.`,
        });
        if (insErr) {
          await releaseDelivery(admin, profile.user_id, fingerprint);
          return;
        }
        totalSent += 1;
      });
    }

    return NextResponse.json({
      ok: true,
      sent: totalSent,
      trades: congressTrades.length,
    });
  } catch (err) {
    console.error('[capitol-notifs]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = cronRoute('notifications-generate-capitol', run, { ttlSeconds: 180 });
