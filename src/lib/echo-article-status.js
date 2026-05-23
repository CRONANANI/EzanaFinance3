/**
 * Server-side helpers for managing Echo article archive state.
 * All functions require service-role access (getAdminClient).
 */

import { getAdminClient } from '@/lib/supabase';

/**
 * Get archive status for a list of article IDs.
 * Returns a Map of articleId → { isArchived, archivedAt, archivedByEmail }
 */
export async function getArticleStatuses(articleIds) {
  if (!articleIds || articleIds.length === 0) return new Map();

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('echo_article_status')
    .select('article_id, is_archived, archived_at, archived_by_email')
    .in('article_id', articleIds);

  if (error) {
    console.error('[echo-status] Failed to fetch statuses:', error.message);
    return new Map();
  }

  const map = new Map();
  for (const row of data || []) {
    map.set(row.article_id, {
      isArchived: row.is_archived,
      archivedAt: row.archived_at,
      archivedByEmail: row.archived_by_email,
    });
  }
  return map;
}

/**
 * Returns true if a single article is currently archived.
 */
export async function isArticleArchived(articleId) {
  if (!articleId) return false;
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('echo_article_status')
    .select('is_archived')
    .eq('article_id', articleId)
    .maybeSingle();

  if (error || !data) return false;
  return data.is_archived === true;
}

/**
 * Archive an article. Idempotent — re-archiving is a no-op.
 */
export async function archiveArticle({ articleId, userId, userEmail, notes }) {
  if (!articleId) throw new Error('articleId required');
  const admin = getAdminClient();

  const { data, error } = await admin
    .from('echo_article_status')
    .upsert(
      {
        article_id: articleId,
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by_user_id: userId || null,
        archived_by_email: userEmail || null,
        notes: notes || null,
      },
      { onConflict: 'article_id' },
    )
    .select()
    .single();

  if (error) throw new Error(`Archive failed: ${error.message}`);
  return data;
}

/**
 * Republish (un-archive) an article. Idempotent — re-publishing a live article is a no-op.
 */
export async function republishArticle({ articleId, userId, userEmail }) {
  if (!articleId) throw new Error('articleId required');
  const admin = getAdminClient();

  const { data, error } = await admin
    .from('echo_article_status')
    .upsert(
      {
        article_id: articleId,
        is_archived: false,
        republished_at: new Date().toISOString(),
        republished_by_user_id: userId || null,
        republished_by_email: userEmail || null,
      },
      { onConflict: 'article_id' },
    )
    .select()
    .single();

  if (error) throw new Error(`Republish failed: ${error.message}`);
  return data;
}

/**
 * Returns the list of archived article IDs.
 */
export async function getArchivedArticleIds() {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('echo_article_status')
    .select('article_id, archived_at, archived_by_email, notes')
    .eq('is_archived', true)
    .order('archived_at', { ascending: false });

  if (error) {
    console.error('[echo-status] Failed to list archived:', error.message);
    return [];
  }
  return data || [];
}
