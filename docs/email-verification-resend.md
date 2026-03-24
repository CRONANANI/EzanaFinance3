# 6-digit email verification (Resend)

After sign-up (email/password or OAuth callback), users are sent to **`/auth/verify-email`**. A 6-digit code is emailed via **Resend** and stored in **`email_verification_codes`**. Successful verification sets **`profiles.email_verified = true`**.

## Environment

- **`RESEND_API_KEY`** — required for sending mail.
- **`RESEND_FROM_EMAIL`** (optional) — defaults to `Ezana Finance <noreply@ezana.world>`. Use a domain you have verified in Resend.
- **`SUPABASE_SERVICE_ROLE_KEY`** — used by API routes to write codes and update profiles (server-only).

## Supabase Auth

In **Authentication → Providers → Email**, turn **Confirm email** **off** so Supabase does not send its own confirmation email. This app sends the 6-digit code instead.

## Database

Apply migration: `supabase/migrations/20260325000000_email_verification.sql`.
