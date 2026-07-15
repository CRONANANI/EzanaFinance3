-- Marketing newsletter subscribers — a SEPARATE, consent-compliant list.
--
-- Deliberately NOT `newsletter_subscribers` (that table already exists, created
-- by 20260602000000_echo_public_cta_system.sql, and is used by the Echo CTA
-- signups without an express-consent record). Early-access / Echo interest is
-- not marketing consent, so the landing newsletter gets its own table with the
-- CASL/GDPR consent columns, double opt-in, and a one-click unsubscribe. Both
-- `waitlist` and `newsletter_subscribers` are left untouched.

CREATE TABLE IF NOT EXISTS public.marketing_subscribers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email              text NOT NULL,
  full_name          text,

  -- Lifecycle: double opt-in. 'pending' until the confirmation link is clicked.
  status             text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'confirmed', 'unsubscribed', 'bounced', 'complained')),

  -- CASL/GDPR consent record. These columns ARE the legal defence — captured at
  -- signup, never backfilled.
  marketing_consent  boolean NOT NULL DEFAULT false,
  consent_text       text, -- the EXACT wording shown next to the checkbox
  consent_at         timestamptz,
  consent_ip         text,
  consent_user_agent text,

  -- Confirmation (double opt-in)
  confirm_token      text UNIQUE,
  confirm_sent_at    timestamptz,
  confirmed_at       timestamptz,

  -- Unsubscribe — one-click, no login required
  unsubscribe_token  text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  unsubscribed_at    timestamptz,
  unsubscribe_reason text,

  source             text DEFAULT 'landing_footer',
  metadata           jsonb DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness — 'Noah@x.com' and 'noah@x.com' are one person.
CREATE UNIQUE INDEX IF NOT EXISTS marketing_subscribers_email_key
  ON public.marketing_subscribers (lower(email));

CREATE INDEX IF NOT EXISTS marketing_subscribers_status_idx
  ON public.marketing_subscribers (status);

-- marketing_subscribers holds PII (email, full_name, consent_ip,
-- consent_user_agent) plus the consent record. Same posture as `waitlist`: it is
-- only ever accessed by the /api/newsletter/* routes via the service-role
-- client, which BYPASSES RLS. Enabling RLS and REVOKE-ing anon/authenticated
-- locks every browser client out (default deny) without breaking the signup,
-- confirm, or unsubscribe flows. No client policies by design.
ALTER TABLE public.marketing_subscribers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_subscribers FROM anon, authenticated;
