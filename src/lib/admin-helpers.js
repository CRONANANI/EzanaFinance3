/**
 * Admin authorization helper.
 *
 * An "admin" is defined as a user whose email appears in the comma-separated
 * ADMIN_EMAILS environment variable. Add to .env.local:
 *
 *   ADMIN_EMAILS=axmabeto@gmail.com,founder@ezana.world
 *
 * This is a deliberate stub for the changelog feature. If/when the platform
 * needs more granular admin permissions (e.g., role-based: changelog-editor,
 * billing-admin), migrate to a `roles` JSONB column on `profiles` table.
 */

/**
 * Returns the array of admin emails from env, lowercased + trimmed.
 * Empty array if ADMIN_EMAILS isn't set.
 *
 * @returns {string[]}
 */
export function getAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Returns true if the given user object is an admin.
 *
 * @param {{ email?: string | null } | null | undefined} user
 * @returns {boolean}
 */
export function isAdminUser(user) {
  if (!user?.email) return false;
  const allowlist = getAdminEmails();
  if (allowlist.length === 0) return false;
  return allowlist.includes(user.email.toLowerCase());
}
