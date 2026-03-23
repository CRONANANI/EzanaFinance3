# Google Sign-In with Supabase (Ezana Finance)

This app uses **[Supabase Auth](https://supabase.com/docs/guides/auth)** with the **Google** provider—not NextAuth.js. Email/password and Google OAuth share the same `auth.users` session, so you do **not** need Prisma or `NEXTAUTH_*` variables for Google login.

## 1. Google Cloud Console

1. Create an OAuth 2.0 Client ID (Web application).
2. **Authorized JavaScript origins**
   - `http://localhost:3000`
   - `https://ezana.world`
3. **Authorized redirect URIs** (required by Supabase)
   - `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`  
   Replace `<YOUR_PROJECT_REF>` with your Supabase project reference (from the Supabase dashboard URL).

> Do **not** use NextAuth’s callback URL here unless you add NextAuth separately. The redirect that completes OAuth is **Supabase’s** `/auth/v1/callback` endpoint.

## 2. Supabase Dashboard

1. **Authentication → Providers → Google** — enable and paste:
   - Client ID  
   - Client Secret  
2. **Authentication → URL configuration**
   - **Site URL:** `https://ezana.world` (production)  
   - **Redirect URLs:** include  
     - `http://localhost:3000/**`  
     - `https://ezana.world/**`  
     - `https://ezana.world/auth/callback`  

After OAuth, Supabase redirects to your app at `/auth/callback` with a `code` that is exchanged for a session (`src/app/auth/callback/route.js`).

## 3. Environment variables

- Keep **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** in `.env.local`.
- Set **`NEXT_PUBLIC_APP_URL=https://ezana.world`** in production (used for Stripe and other absolute URLs).
- **Do not** commit Google Client Secret to the repo; store it only in Supabase (and in Google Cloud).

## 4. Rotating leaked credentials

1. In Google Cloud Console, regenerate the OAuth client secret (or create a new OAuth client).
2. Update **Supabase → Authentication → Google** with the new ID/secret.
3. No code deploy is required unless you change Supabase URL/anon key.

## 5. User records

- First-time Google sign-in creates a row in Supabase **`auth.users`** automatically.
- Profile fields (name, picture) are available on the session as `user.user_metadata` (e.g. `full_name`, `avatar_url` / `picture` depending on provider).
