/**
 * The one password rule set, shared by the sign-up form (client) and
 * /api/auth/accept-invite (server) so they can never disagree.
 * Returns the list of unmet requirements; empty means the password passes.
 */
export function validatePassword(pwd) {
  const p = typeof pwd === 'string' ? pwd : '';
  const errors = [];
  if (p.length < 8) errors.push('at least 8 characters');
  if (!/[A-Z]/.test(p)) errors.push('1 uppercase letter');
  if (!/[a-z]/.test(p)) errors.push('1 lowercase letter');
  if (!/[0-9]/.test(p)) errors.push('1 number');
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p)) errors.push('1 special character');
  return errors;
}

/** The same email check the old sign-up page used. */
export const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** Usernames: lowercase letters, numbers and underscores, 3 to 30 long. */
export const USERNAME_RE = /^[a-z0-9_]{3,30}$/;
