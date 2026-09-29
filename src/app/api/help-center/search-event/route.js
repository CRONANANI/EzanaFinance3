/**
 * POST /api/help-center/search-event: log one Help Center search signal.
 *
 * Body: { kind: 'ask'|'click'|'feedback', section: 'user'|'partner',
 *         question?, topSlug?, clickedSlug?, answered?, helpful? }
 * Slugs are validated against the content module; the question is trimmed to
 * 300 chars. Rate-limited by IP. Analytics never fail the reader: storage
 * errors (including the table not existing yet) are swallowed and the
 * response is always { ok } with a 2xx/4xx, never a 500.
 */
import { NextResponse } from 'next/server';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { USER_ARTICLES, PARTNER_ARTICLES } from '@/lib/help-center-content';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SECTIONS = { user: USER_ARTICLES, partner: PARTNER_ARTICLES };
const KINDS = new Set(['ask', 'click', 'feedback']);

export async function POST(request) {
  const rl = await checkRateLimit(`hc-search-event:${getClientIp(request)}`, {
    limit: 60,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);

  let body;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const kind = String(body?.kind || '');
  const section = String(body?.section || '');
  if (!KINDS.has(kind) || !Object.hasOwn(SECTIONS, section)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const catalog = SECTIONS[section];
  const slug = (v) => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s && Object.hasOwn(catalog, s) ? s : null;
  };
  const row = {
    kind,
    section,
    question: typeof body.question === 'string' ? body.question.trim().slice(0, 300) || null : null,
    top_slug: slug(body.topSlug),
    clicked_slug: slug(body.clickedSlug),
    answered: typeof body.answered === 'boolean' ? body.answered : null,
    helpful: typeof body.helpful === 'boolean' ? body.helpful : null,
  };

  if (isServerSupabaseConfigured()) {
    try {
      await getAdminClient().from('help_search_events').insert(row);
    } catch {
      /* never fail the reader over analytics */
    }
  }
  return NextResponse.json({ ok: true });
}
