import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';
import { EXEMPLARY_BRIEFS, embeddingText, publicBrief } from '@/lib/sonar/exemplary';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * Index the Sonar exemplary briefs for retrieval. Reads the in-repo briefs
 * (src/lib/sonar/exemplary, the source of truth), embeds each brief's question
 * and variants with the Supabase gte-small edge function (384-dim, the one
 * vector space every corpus shares) and upserts on slug into
 * public.sonar_exemplary_briefs.
 *
 * findExemplaryBrief() reads that table, through match_sonar_exemplary_briefs,
 * to settle a ping that is close to a stored question but not a lexical match.
 * Bearer cron secret (cronRoute). Run once after applying the migration, and
 * again after adding or editing a brief.
 *   GET /api/cron/index-sonar-exemplary
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

async function run() {
  if (!supaEmbedConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
  }
  const stamp = new Date().toISOString();
  const rows = [];
  const errors = [];
  for (const brief of EXEMPLARY_BRIEFS) {
    // eslint-disable-next-line no-await-in-loop
    const embedding = await embedViaSupabase(embeddingText(brief));
    if (!Array.isArray(embedding) || embedding.length !== 384) {
      errors.push(`${brief.slug}: no embedding (edge function unreachable or gte-small disabled)`);
      continue;
    }
    rows.push({
      slug: brief.slug,
      version: brief.version,
      template: brief.template,
      question: brief.question,
      variants: brief.variants || [],
      brief: publicBrief(brief),
      verified_as_of: brief.verifiedAsOf,
      review_after: brief.reviewAfter || null,
      active: true,
      embedding: JSON.stringify(embedding), // pgvector text form
      indexed_at: stamp,
    });
  }
  let upserted = 0;
  if (rows.length) {
    const { error } = await getAdminClient()
      .from('sonar_exemplary_briefs')
      .upsert(rows, { onConflict: 'slug' });
    if (error) errors.push(`upsert: ${error.message}`);
    else upserted = rows.length;
  }
  return NextResponse.json({
    ok: errors.length === 0,
    briefs: EXEMPLARY_BRIEFS.length,
    embedded: rows.length,
    upserted,
    ...(errors.length ? { errors } : {}),
  });
}

export const GET = cronRoute('index-sonar-exemplary', run);
