/**
 * Help centre reading progress for the signed-in member.
 *
 *   GET  /api/help/reads          { ok, slugs: string[] }   the member's reads
 *   POST /api/help/reads          { slug } or { slugs }      mark articles read
 *
 * The user comes from the request's session on the server (bearer token or
 * cookie), never from the body, and the Supabase client is bound to that
 * session so the help_article_reads row-level policies apply. Slugs must be
 * real help article slugs. Inserts ignore duplicates, so marking an article
 * read twice is a no-op. Until the help_article_reads migration is applied
 * the table is missing: GET answers with no reads and POST reports the
 * failure, and the page keeps its local record.
 */
import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase';
import { USER_ARTICLES, PARTNER_ARTICLES } from '@/lib/help-center-content';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SLUG = /^[a-z0-9-]{1,120}$/;

function isKnown(slug) {
  return Object.hasOwn(USER_ARTICLES, slug) || Object.hasOwn(PARTNER_ARTICLES, slug);
}

export async function GET(request) {
  const { user, supabase } = await getAuthContext(request);
  if (!user || !supabase) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const { data, error } = await supabase
    .from('help_article_reads')
    .select('article_slug')
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ ok: true, slugs: [], stored: false });
  return NextResponse.json({
    ok: true,
    slugs: (data || []).map((r) => r.article_slug),
    stored: true,
  });
}

export async function POST(request) {
  const rl = await checkRateLimit(`help-reads:${getClientIp(request)}`, {
    interval: 60000,
    limit: 60,
  });
  if (!rl.success) return rateLimitResponse(rl);

  const { user, supabase } = await getAuthContext(request);
  if (!user || !supabase) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const raw = Array.isArray(body?.slugs) ? body.slugs : body?.slug ? [body.slug] : [];
  const clean = [
    ...new Set(raw.filter((s) => typeof s === 'string' && SLUG.test(s) && isKnown(s))),
  ].slice(0, 200);
  if (!clean.length) {
    return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 });
  }

  const { error } = await supabase.from('help_article_reads').upsert(
    clean.map((article_slug) => ({ user_id: user.id, article_slug })),
    { onConflict: 'user_id,article_slug', ignoreDuplicates: true },
  );
  if (error) return NextResponse.json({ ok: false, error: 'not stored' }, { status: 500 });
  return NextResponse.json({ ok: true, slugs: clean });
}
