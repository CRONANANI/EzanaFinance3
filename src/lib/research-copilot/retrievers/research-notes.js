import { librarySearch } from '@/app/api/org/research-notes/_shared';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';
import { snippet } from './shared';

/**
 * Org research-notes retriever — hybrid (keyword + semantic), org-private.
 *
 * Delegates to librarySearch(), which pulls notes through the user's RLS-scoped
 * cookie client AND filters `.eq('org_id', member.org_id)` — so a user only ever
 * retrieves their own org's notes (cross-org isolation is enforced there, not
 * here). Requires an org member in ctx; returns [] for non-members.
 */
export const corpus = 'research_notes';
export const kind = 'semantic';
export const scope = 'org';

export async function retrieve(query, ctx = {}, opts = {}) {
  const { limit = 6 } = opts;
  const supabase = ctx.supabaseUser;
  const member = ctx.member;
  // No user-scoped client or not an active org member → no org-private notes.
  if (!supabase || !member) return [];

  const sp = new URLSearchParams({ q: query, sort: 'relevance' });
  let result;
  try {
    result = await librarySearch(supabase, member, sp, {
      embedFn: embedViaSupabase,
      embedConfigured: supaEmbedConfigured(),
    });
  } catch {
    return [];
  }
  if (!result || result.error || !Array.isArray(result.notes)) return [];

  return result.notes.slice(0, limit).map((n, i) => ({
    corpus,
    id: String(n.id),
    title: n.title || 'Research note',
    snippet: snippet(n.abstract || n.body),
    url: '/org-team-hub/research-library',
    // Notes arrive pre-ranked by relevance (keyword + semantic); librarySearch
    // strips the per-row score, so approximate similarity by rank for the merge.
    similarity: Math.max(0.5, 0.85 - i * 0.05),
    date: n.published_at || n.created_at || null,
    meta: {
      ticker: n.ticker || null,
      sector: n.sector || null,
      author: n.author_name || null,
      org_id: n.org_id, // provenance — bounded to the user's org by RLS
      noteId: String(n.id),
    },
  }));
}
