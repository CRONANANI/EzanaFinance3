'use server';

import { redirect } from 'next/navigation';
import { getUserClient } from '@/lib/supabase';
import { safeInternalPath } from '@/lib/sanitize';

/** Sign the current session out on the server, then go to sign-in or sign-up. */
async function signOutThen(formData, dest) {
  const next = safeInternalPath(String(formData.get('next') || ''), '/home');
  try {
    await getUserClient().auth.signOut();
  } catch {
    /* already signed out, or the cookie was unreadable: continue either way */
  }
  const params = new URLSearchParams({ redirect: next });
  const ref = String(formData.get('ref') || '').trim();
  if (dest === 'signup' && /^[A-Za-z0-9]{1,16}$/.test(ref)) params.set('ref', ref.toUpperCase());
  redirect(`/auth/${dest === 'signup' ? 'signup' : 'signin'}?${params.toString()}`);
}

export async function switchAccount(formData) {
  return signOutThen(formData, 'signin');
}

export async function startNewAccount(formData) {
  return signOutThen(formData, 'signup');
}
