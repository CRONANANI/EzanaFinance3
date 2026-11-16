/**
 * Council members do not post in the public retail community (Nov 2026,
 * council Community). /community shows them their council's private feed, and
 * the retail post route calls this before saving anything, so a student
 * cannot publish to all of Ezana by accident or by calling the route
 * directly.
 *
 * Reads the caller's own active membership with their own client (the
 * membership read rule lets a member see their own row). If the read fails
 * the post is allowed, as it was before this check, so a database hiccup
 * never blocks every retail member; the failure is logged.
 */

export const COUNCIL_POSTING_ERROR =
  'Council members post in their council community. Your council feed is on the Community page.';

/**
 * @param {object} db  the caller's Supabase client
 * @param {string} userId
 * @returns {Promise<{ status: number, error: string } | null>} a refusal, or null to allow
 */
export async function councilMemberPostingRefusal(db, userId) {
  if (!db || !userId) return null;
  try {
    const { data, error } = await db
      .from('org_members')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);
    if (error) {
      console.error('[community posts] council membership check', error.message);
      return null;
    }
    if (Array.isArray(data) && data.length > 0) {
      return { status: 403, error: COUNCIL_POSTING_ERROR };
    }
    return null;
  } catch (e) {
    console.error('[community posts] council membership check', e?.message || e);
    return null;
  }
}
