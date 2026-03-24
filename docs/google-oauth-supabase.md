# Google OAuth (disabled)

The app **does not** expose Google sign-in or sign-up in the UI. Authentication uses **email and password** (and email flows such as magic links / confirmations where configured).

`/auth/callback` may still be used for **Supabase email confirmation** and other non-UI auth redirects (`?code=` exchange with PKCE). See `src/app/auth/callback/` and `src/lib/supabase.js`.

If you re-enable Google OAuth in the future, configure **Supabase → Authentication → Providers → Google** and restore the Google OAuth client + redirect handling in the app.
