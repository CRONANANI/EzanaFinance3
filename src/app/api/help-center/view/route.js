/**
 * POST /api/help-center/view: count one Help Center article view.
 *
 * Fired once per page load by the article pages (sendBeacon, deduped per tab
 * with sessionStorage). Validates section/slug against the content module so
 * the table only ever holds real slugs, rate-limits by IP, and never fails the
 * reader: analytics errors are swallowed and never surface as a 500.
 * Feeds GET /api/help-center/trending.
 */
import { NextResponse } from 'next/server';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { USER_ARTICLES, PARTNER_ARTICLES } from '@/lib/help-center-content';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SECTIONS = { user: USER_ARTICLES, partner: PARTNER_ARTICLES };

export async function POST(request) {
  const rl = await checkRateLimit(`hc-view:${getClientIp(request)}`, {
    limit: 120,
    window: '600 s',
  });
  if (!rl.success) return rateLimitResponse(rl);

  let body;
  try {
    /* sendBeacon posts a Blob; text() then parse handles any content type. */
    body = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const section = String(body?.section || '');
  const slug = String(body?.slug || '').trim();
  if (!Object.hasOwn(SECTIONS, section) || !Object.hasOwn(SECTIONS[section], slug)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (isServerSupabaseConfigured()) {
    try {
      await getAdminClient().from('help_article_views').insert({ section, article_slug: slug });
    } catch {
      /* never fail the reader over analytics */
    }
  }
  return NextResponse.json({ ok: true });
}
