import { supabase } from '@/lib/supabase-browser';

/** Increment denormalized analyses_run on profiles (idempotent per session call). */
export async function incrementAnalysesRun() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('analyses_run')
      .eq('id', user.id)
      .maybeSingle();

    const next = (profile?.analyses_run ?? 0) + 1;
    await supabase
      .from('profiles')
      .update({ analyses_run: next, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    window.dispatchEvent(new Event('beginner-level-updated'));
  } catch {
    /* non-fatal */
  }
}
