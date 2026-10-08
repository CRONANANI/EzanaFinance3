/**
 * POST /api/datasets/capitol/rules/preview
 *   { datasets, conditions, window, name?, id?, full? }
 *   -> { ok, count, first: [{ id, ticker, line, return30d }], events? }
 * Runs a signal rule over the public Capitol records for its window. No
 * account needed; rate-limited per address. `full` also returns up to 30
 * matches as carousel events (My signals).
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { validationResponse } from '@/lib/api-errors';
import {
  buildRuleEvent,
  describeMatch,
  matchSignalRule,
  validateRule,
} from '@/lib/datasets/capitol-hub/signals';
import { getRulePool, todayIso } from '@/lib/datasets/capitol-hub/pool';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const rl = await checkRateLimit(`capitol-rule-preview:${getClientIp(request)}`, {
    limit: 60,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);
  const body = await request.json().catch(() => null);
  const v = validateRule(body, { requireName: false });
  if (!v.ok) return validationResponse(v.error);
  const rule = { ...v.rule, id: typeof body?.id === 'string' ? body.id.slice(0, 64) : null };
  try {
    const pool = await getRulePool(rule.window);
    const { count, matches } = matchSignalRule(rule, pool, { today: todayIso() });
    return NextResponse.json({
      ok: true,
      count,
      first: matches.slice(0, 3).map((m) => ({
        id: m.id,
        ticker: m.ticker,
        line: describeMatch(m),
        return30d: m.ret30 ?? null,
        bioguideId: m.member?.bioguideId || null,
      })),
      events: body?.full ? matches.slice(0, 30).map((m) => buildRuleEvent(m, rule)) : undefined,
    });
  } catch (e) {
    console.error('[capitol-hub] rule preview', e?.message || e);
    return NextResponse.json(
      { ok: false, error: 'The preview could not run just now. Try again in a minute.' },
      { status: 503 },
    );
  }
}
