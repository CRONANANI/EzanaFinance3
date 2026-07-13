import { AssignmentBoard } from '@/components/org/academic2/AssignmentBoard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadAssignments } from '@/app/api/org/assignments/_loader';

export const dynamic = 'force-dynamic';

/* Server component: load the initial Assignments payload (same shape as
   GET /api/org/assignments) so first paint has data. All interactivity —
   tabs, view toggle, drawer, review modal — stays client-side in
   AssignmentBoard, which keeps its own mount fetch as the fallback when
   initialData is null (non-member / load failure). */
export default async function AssignmentsPage() {
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);
  let initialData = null;
  if (member) {
    const { payload } = await loadAssignments(supabase, member);
    initialData = payload ?? null;
  }

  return (
    <div className="dashboard-page-inset">
      <AssignmentBoard initialData={initialData} />
    </div>
  );
}
