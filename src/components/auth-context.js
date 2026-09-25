'use client';

/**
 * The auth CONTEXT, deliberately separate from the provider that fills it.
 *
 * AuthProvider imports @/lib/supabase-browser, which pulls in the whole
 * supabase-js client. Any module that imports AuthProvider to call useAuth
 * therefore drags that client into its route's module graph — about 40 kB of
 * first-load JS — even though the provider is already mounted once in the root
 * layout and the consumer only wants to READ a boolean. That is exactly what
 * happened when the dataset CategoryBar started showing auth actions: sixteen
 * dataset routes went over their performance budgets at once.
 *
 * So the context and the hook live here, with no dependencies, and consumers
 * that only read auth state import from this module. AuthProvider imports the
 * context from here and re-exports useAuth, so existing call sites are
 * unaffected.
 */
import { createContext, useContext } from 'react';

export const AuthContext = createContext({ user: null, loading: true, isAuthenticated: false });

export function useAuth() {
  return useContext(AuthContext);
}
