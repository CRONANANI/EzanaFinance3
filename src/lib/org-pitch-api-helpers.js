import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { resolveViewerMember, hasPitchPermission } from '@/lib/org-pitches';

export async function getPitchApiContext() {
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);
  const viewer = resolveViewerMember(member?.email, member?.role);
  return { supabase, member, viewer, orgId: member?.org_id || null };
}

export function requirePermission(viewer, key) {
  if (!hasPitchPermission(viewer, key)) {
    return { error: `Missing permission: ${key}`, status: 403 };
  }
  return null;
}
