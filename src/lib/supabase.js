'use client';

/**
 * Browser-only Supabase client — PKCE / OAuth code verifier is stored in cookies.
 *
 * This file MUST stay separate from server-only helpers. Importing `createBrowserClient`
 * from the same module as `createServerSupabaseClient` caused Node/API routes to evaluate
 * `createBrowserClient` without `window`, producing broken storage and
 * "PKCE code verifier not found in storage" on the real client.
 */
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)'
  );
}

export function createClient() {
  return createBrowserClient(supabaseUrl || '', supabaseAnonKey || '');
}

/** Shared singleton — same instance as OAuth start and /auth/callback exchange. */
export const supabase = createBrowserClient(supabaseUrl || '', supabaseAnonKey || '');
