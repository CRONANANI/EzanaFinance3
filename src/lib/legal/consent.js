/**
 * Consent wording shown on sign-up forms. The exact text a person agreed to is
 * stored with their record, so every string here is the source of truth for
 * both the form label and the stored copy.
 */

/** Required on the waitlist and invite forms. The Terms say Ezana is 18+. */
export const AGE_CONFIRM_TEXT = 'I am 18 or older.';

/** Optional and unticked on the waitlist form (CASL express consent). */
export const WAITLIST_MARKETING_CONSENT_TEXT =
  'Also email me Ezana product news. Unsubscribe anytime.';

/** Strict boolean read of a JSON body flag: only `true` counts as consent. */
export const isTrue = (v) => v === true;
