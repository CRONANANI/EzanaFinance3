/**
 * Block lookups (server only, admin client).
 */
import { filterVisible } from './core';

/** Every user the viewer blocked, plus every user who blocked the viewer. */
export async function blockedBothWays(admin, userId) {
  const out = new Set();
  if (!userId) return out;
  const [{ data: mine }, { data: theirs }] = await Promise.all([
    admin.from('user_blocks').select('blocked_id').eq('blocker_id', userId),
    admin.from('user_blocks').select('blocker_id').eq('blocked_id', userId),
  ]);
  (mine || []).forEach((r) => out.add(r.blocked_id));
  (theirs || []).forEach((r) => out.add(r.blocker_id));
  return out;
}

/** True when either user has blocked the other. */
export async function isBlockedPair(admin, a, b) {
  if (!a || !b) return false;
  const { data } = await admin
    .from('user_blocks')
    .select('blocker_id')
    .or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`)
    .limit(1);
  return !!data?.length;
}

/** filterVisible with the viewer's blocks loaded. */
export async function visibleTo(admin, userId, items, authorKey = 'user_id') {
  const blocked = await blockedBothWays(admin, userId);
  return filterVisible(items, { blocked, authorKey });
}
