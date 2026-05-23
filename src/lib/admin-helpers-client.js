/**
 * Client-side admin check.
 *
 * Mirrors `isAdminUser()` from `admin-helpers.js` but reads from
 * NEXT_PUBLIC_ADMIN_EMAILS (which is bundled into the client). UI-only —
 * never trust this for actual permission gating. All write/mutation
 * operations must re-check on the server using `isAdminUser()`.
 */

/**
 * Returns true if the given user's email is in the public admin allowlist.
 * @param {{ email?: string | null } | null | undefined} user
 * @returns {boolean}
 */
export function isAdminUserClient(user) {
  if (!user?.email) return false;
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
  const allowlist = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) return false;
  return allowlist.includes(user.email.toLowerCase());
}
