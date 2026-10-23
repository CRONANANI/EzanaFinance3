/**
 * GET /api/politicians/contractor-exposure
 *
 * Which traded tickers are federal contractors. Built from the FULL hosted
 * USAspending recipient rollup for the last complete federal fiscal year
 * (getContractorExposure; the contracts page's display trim is not used here,
 * because it drops mid-sized public contractors), mapped to tickers with
 * tickerForRecipient (a hand-kept map of unambiguous public contractors and
 * their filing subsidiaries; anything else is skipped, never guessed). The
 * most recent award date per ticker comes from the capped recent-award feed,
 * so it can be missing; the client renders a dot then.
 *
 * { ok, fiscalYear,
 *   byTicker: { LMT: { recipient, total, awards, topAgency, lastAwardDate } } }
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getContractorExposure, getRecentAwardFeed } from '@/lib/usaspending-store';
import { tickerForRecipient, currentFederalFiscalYear } from '@/lib/usaspending';

export const dynamic = 'force-dynamic';

const TTL = 6 * 60 * 60 * 1000;
/* tickerForRecipient's "no ticker" placeholder. */
const NO_TICKER = '—';
let cache = null;

async function build() {
  const current = currentFederalFiscalYear().fyEndYear;
  for (const fy of [current - 1, current - 2]) {
    // eslint-disable-next-line no-await-in-loop
    const [recipients, recent] = await Promise.all([
      getContractorExposure({ fiscalYear: fy }),
      getRecentAwardFeed({ limit: 200 }).catch(() => []),
    ]);
    if (!recipients?.length) continue;

    const byTicker = {};
    for (const rec of recipients) {
      const ticker = tickerForRecipient(rec.name);
      if (!ticker || ticker === NO_TICKER) continue;
      const cur = byTicker[ticker] || {
        recipient: rec.name,
        total: 0,
        awards: 0,
        topAgency: rec.topAgency || null,
        lastAwardDate: null,
        _top: 0,
      };
      cur.total += rec.total;
      cur.awards += rec.count;
      if (rec.total > cur._top) {
        cur._top = rec.total;
        cur.recipient = rec.name;
        cur.topAgency = rec.topAgency || cur.topAgency;
      }
      byTicker[ticker] = cur;
    }
    /* Newest award date per ticker, from the capped feed (best effort). */
    for (const a of recent || []) {
      const ticker = tickerForRecipient(a.parent || a.recipient);
      const row = ticker && ticker !== NO_TICKER ? byTicker[ticker] : null;
      if (!row || !a.date) continue;
      if (!row.lastAwardDate || a.date > row.lastAwardDate) row.lastAwardDate = a.date;
    }
    for (const v of Object.values(byTicker)) delete v._top;
    return { ok: true, fiscalYear: fy, byTicker };
  }
  return { ok: false, fiscalYear: null, byTicker: {} };
}

export async function GET(request) {
  const rl = await checkRateLimit(`pol:contractors:${getClientIp(request)}`, {
    interval: 60000,
    limit: 60,
  });
  if (!rl.success) return rateLimitResponse(rl);

  if (cache && Date.now() - cache.at < TTL) return NextResponse.json(cache.body);
  try {
    const body = await build();
    if (body.ok) cache = { at: Date.now(), body };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ ok: false, fiscalYear: null, byTicker: {} });
  }
}
