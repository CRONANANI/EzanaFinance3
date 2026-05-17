import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const runtime = 'nodejs';

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

async function fetchChamberTrades(chamber, FMP_KEY) {
  const endpoint = chamber === 'senate' ? 'senate-trades' : 'house-trades';
  try {
    const url = `${FMP_BASE}/${endpoint}?page=0&apikey=${encodeURIComponent(FMP_KEY)}`;
    const res = await fetch(url, { cache: 'no-store' });
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

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

      for (const profile of subscribedUsers) {
        const userTickers = profile.ticker_scores || {};
        const isRelevant = !!(symbol && userTickers[symbol]) || congressTrades.length <= 3;

        if (!isRelevant) continue;

        const { data: existing } = await admin
          .from('notification_delivery_log')
          .select('id')
          .eq('user_id', profile.user_id)
          .eq('event_fingerprint', fingerprint)
          .maybeSingle();
        if (existing) continue;

        const typeLabel = trade.type || trade.transactionType || 'Trade';
        await admin.from('user_notifications').insert({
          user_id: profile.user_id,
          type: 'inside-the-capitol',
          title: `${emoji} ${representative} · ${typeLabel}${symbol ? ` ($${symbol})` : ''}`,
          content: `Congressional trade disclosure${symbol ? ` for $${symbol}` : ''}. Check Inside the Capitol for details.`,
        });

        await admin
          .from('notification_delivery_log')
          .insert({
            user_id: profile.user_id,
            event_fingerprint: fingerprint,
          })
          .catch(() => {});

        totalSent += 1;
      }
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
