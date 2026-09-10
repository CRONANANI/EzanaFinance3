import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadPermissionsMatrix } from '@/lib/org-permissions-server';
import { TeamPermissionsClient } from '@/components/org/permissions/TeamPermissionsClient';

export const dynamic = 'force-dynamic';

export default async function TeamPermissionsPage() {
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  let initialData = null;
  if (member) {
    try {
      initialData = await loadPermissionsMatrix(supabase, member);
    } catch {
      initialData = null;
    }
  }
  return (
    <div className="dashboard-page-inset">
      <TeamPermissionsClient initialData={initialData} />
    </div>
  );
}
