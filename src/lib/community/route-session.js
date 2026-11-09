/**
 * Community page routes (Nov 2026): every read and write runs as the signed-in
 * user (their session-bound Supabase client), so the RPCs' RLS and auth.uid()
 * apply. Never the service role.
 */
import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase';
import { displayNameOf } from './redesign';

export const PRIVATE = { 'Cache-Control': 'private, no-store' };

export async function withSession(request, label, fn) {
  const { user, supabase } = await getAuthContext(request);
  if (!user || !supabase) {
    return NextResponse.json(
      { error: 'Sign in to see the community.' },
      { status: 401, headers: PRIVATE },
    );
  }
  try {
    return await fn({ user, supabase });
  } catch (e) {
    console.error(`[community ${label}]`, e?.message || e);
    return NextResponse.json(
      { error: "Couldn't load this section." },
      { status: 500, headers: PRIVATE },
    );
  }
}

/** { id -> author } from public_profiles for the given user ids. */
export async function authorsFor(supabase, ids) {
  const unique = [...new Set((ids || []).filter(Boolean))];
  if (!unique.length) return new Map();
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, username, display_name, full_name, avatar_url, is_partner')
    .in('id', unique);
  if (error) throw new Error(error.message);
  return new Map(
    (data || []).map((p) => [
      p.id,
      {
        id: p.id,
        name: displayNameOf(p),
        username: p.username || null,
        avatar_url: p.avatar_url || null,
        is_partner: Boolean(p.is_partner),
      },
    ]),
  );
}

/** A tiny per-instance TTL cache (stats, insights). */
export function ttlCache(ttlMs) {
  const store = new Map();
  return {
    get(key) {
      const hit = store.get(key);
      if (hit && Date.now() - hit.at < ttlMs) return hit.value;
      store.delete(key);
      return undefined;
    },
    set(key, value) {
      if (store.size > 500) store.clear();
      store.set(key, { at: Date.now(), value });
    },
  };
}
