/**
 * Report and block rules, pure (tested by scripts/check-mobile.mjs).
 */

export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'sexual', label: 'Sexual content' },
  { value: 'violence', label: 'Violence or threats' },
  { value: 'misinformation', label: 'Misleading information' },
  { value: 'illegal', label: 'Illegal activity' },
  { value: 'other', label: 'Something else' },
];
export const REASON_VALUES = REPORT_REASONS.map((r) => r.value);

export const CONTENT_TYPES = ['community_post', 'echo_comment', 'message', 'profile'];

/** Content type -> the table that holds it and its author column. */
export const CONTENT_TABLES = {
  community_post: { table: 'community_posts', author: 'user_id', hideable: true },
  echo_comment: { table: 'echo_article_comments', author: 'user_id', hideable: true },
  message: { table: 'messages', author: 'sender_id', hideable: true },
  profile: { table: 'profiles', author: 'id', hideable: false },
};

/** Open reports from this many different users hide the content pending review. */
export const AUTO_HIDE_REPORTERS = 3;

export function shouldAutoHide(distinctOpenReporters) {
  return Number(distinctOpenReporters) >= AUTO_HIDE_REPORTERS;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === 'string' && UUID.test(v);

/** Validate a report body. Returns { value } or { error }. */
export function validateReport(body) {
  const contentType = body?.contentType;
  const contentId = body?.contentId;
  const reason = body?.reason;
  if (!CONTENT_TYPES.includes(contentType)) return { error: 'Unknown content type.' };
  if (!isUuid(contentId)) return { error: 'Unknown content.' };
  if (!REASON_VALUES.includes(reason)) return { error: 'Choose a reason.' };
  const details =
    typeof body.details === 'string' && body.details.trim()
      ? body.details.trim().slice(0, 1000)
      : null;
  return { value: { contentType, contentId, reason, details } };
}

/**
 * Remove items the viewer should not see: moderation-hidden ones, and ones
 * written by users the viewer blocked or who blocked the viewer.
 * `authorKey` names the author field on each item.
 */
export function filterVisible(
  items,
  { hidden = true, blocked = new Set(), authorKey = 'user_id' } = {},
) {
  return (items || []).filter((it) => {
    if (hidden && it?.moderation_hidden_at) return false;
    return !blocked.has(it?.[authorKey]);
  });
}
