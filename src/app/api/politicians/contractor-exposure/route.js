/**
 * GET /api/politicians/contractor-exposure
 *
 * Which traded tickers are top federal contractors. Built from the hosted
 * USAspending recipient rollup for the last COMPLETE federal fiscal year,
 * mapped to tickers with tickerForRecipient (a hand-kept map of unambiguous
 * public contractors; anything else is skipped, never guessed).
 *
 * { ok, fiscalYear, byTicker: { LMT: { recipient, total, awards } } }
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getContractRollups } from '@/lib/usaspending-store';
import { tickerForRecipient, currentFederalFiscalYear } from '@/lib/usaspending';

export const dynamic = 'force-dynamic';

const TTL = 6 * 60 * 60 * 1000;
/* tickerForRecipient's "no ticker" placeholder. */
const NO_TICKER = '—';
let cache = null;

async function build() {
  const current = currentFederalFiscalYear().fyEndYear;
  for (const fy of [current - 1, current - 2]) {
    const r = await getContractRollups({ fiscalYear: fy });
    if (!r?.recipients?.length) continue;
    const byTicker = {};
    for (const rec of r.recipients) {
      const ticker = tickerForRecipient(rec.name);
      if (!ticker || ticker === NO_TICKER) continue;
      const cur = byTicker[ticker] || { recipient: rec.name, total: 0, awards: 0, _top: 0 };
      cur.total += rec.total;
      cur.awards += rec.count;
      if (rec.total > cur._top) {
        cur._top = rec.total;
        cur.recipient = rec.name;
      }
      byTicker[ticker] = cur;
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
