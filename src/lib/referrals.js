/**
 * Referral program: pure rules shared by the API routes, the sign-up form,
 * Settings, Referrals and the tests. No I/O here.
 *
 * Every account has a permanent 8-character code in an unambiguous alphabet
 * (no 0/O or 1/I). 5 distinct referees who sign up with it and verify their
 * email earn the referrer 12 months of Personal Advanced; each verified
 * referee gets 1 month of Personal. Plan keys and names are the real ones in
 * src/config/pricing.js.
 */
export const REFERRAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const REFERRAL_CODE_LENGTH = 8;
export const REFERRAL_THRESHOLD = 5;
export const REFERRER_REWARD = {
  kind: 'referrer_advanced_12mo',
  plan: 'personal_advanced_monthly',
  planName: 'Personal Advanced',
  months: 12,
};
export const REFEREE_REWARD = {
  kind: 'referee_personal_1mo',
  plan: 'personal_monthly',
  planName: 'Personal',
  months: 1,
};
/* A code can only be applied to an account this fresh: "entered at sign-up
   only", never retroactively. */
export const APPLY_WINDOW_MS = 60 * 60 * 1000;

const CODE_RE = new RegExp(`^[${REFERRAL_ALPHABET}]{${REFERRAL_CODE_LENGTH}}$`);

/** Upper-case and strip spaces/dashes; does not validate. */
export function normalizeCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[\s-]+/g, '');
}

export function isValidCodeFormat(raw) {
  return CODE_RE.test(normalizeCode(raw));
}

/** Why a code's format is wrong, in plain words, or null when it is fine. */
export function codeFormatProblem(raw) {
  const c = normalizeCode(raw);
  if (!c) return 'Enter a referral code.';
  if (c.length !== REFERRAL_CODE_LENGTH) return 'Referral codes are 8 characters.';
  if (/[01OI]/.test(c)) return 'Referral codes never use 0, O, 1 or I.';
  if (!CODE_RE.test(c)) return 'Use letters and digits only.';
  return null;
}

/**
 * A comparable identity for an email: lower-cased, "+tag" stripped, and for
 * Gmail the dots in the local part removed (googlemail.com folds to
 * gmail.com). Two emails with the same identity are treated as one person.
 */
export function emailIdentity(email) {
  const e = String(email || '')
    .trim()
    .toLowerCase();
  const at = e.lastIndexOf('@');
  if (at < 1) return e;
  let local = e.slice(0, at);
  let domain = e.slice(at + 1);
  if (domain === 'googlemail.com') domain = 'gmail.com';
  local = local.split('+')[0];
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

export function isSamePerson(emailA, emailB) {
  if (!emailA || !emailB) return false;
  return emailIdentity(emailA) === emailIdentity(emailB);
}

/**
 * Whether a referral may be applied. Returns null when it may, or a reason.
 * @param {{ referrerId, refereeId, referrerEmail, refereeEmail, refereeCreatedAt, now? }} p
 */
export function applyProblem({
  referrerId,
  refereeId,
  referrerEmail,
  refereeEmail,
  refereeCreatedAt,
  now = Date.now(),
}) {
  if (!referrerId) return 'invalid';
  if (referrerId === refereeId) return 'self';
  if (isSamePerson(referrerEmail, refereeEmail)) return 'same_person';
  const created = refereeCreatedAt ? new Date(refereeCreatedAt).getTime() : NaN;
  if (!Number.isFinite(created) || now - created > APPLY_WINDOW_MS) return 'too_late';
  return null;
}

/** j***@gmail.com */
export function maskEmail(email) {
  const e = String(email || '');
  const at = e.lastIndexOf('@');
  if (at < 1) return '***';
  return `${e[0]}***${e.slice(at)}`;
}

export function shareUrl(code, origin = 'https://ezana.world') {
  return `${origin}/auth/signup?ref=${encodeURIComponent(code)}`;
}
